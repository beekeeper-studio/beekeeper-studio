import {
  SSOOIDCClient,
  RegisterClientCommand,
  StartDeviceAuthorizationCommand,
  CreateTokenCommand,
  InvalidClientException,
  AuthorizationPendingException,
  SlowDownException,
  ExpiredTokenException,
} from '@aws-sdk/client-sso-oidc';
import {
  SSOClient,
  GetRoleCredentialsCommand,
  ListAccountsCommand,
  ListAccountRolesCommand,
  RoleInfo,
  AccountInfo,
} from '@aws-sdk/client-sso';
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader';
import rawLog from '@bksLogger';
import { wait } from '@shared/lib/wait';
import { AWSCredentials } from './amazon-redshift';

const log = rawLog.scope('auth/aws-sso');

// Token expiration threshold - refresh 5 minutes before expiry
const TOKEN_EXPIRATION_THRESHOLD_MS = 5 * 60 * 1000;

// OIDC client registration cache duration (90 days in ms)
const CLIENT_REGISTRATION_CACHE_DURATION_MS = 90 * 24 * 60 * 60 * 1000;

export interface SsoProfile {
  name: string;
  ssoStartUrl: string;
  ssoRegion: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  ssoSession?: string;
}

export interface SsoSession {
  ssoStartUrl: string;
  ssoRegion: string;
}

export interface AwsSsoToken {
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
  region: string;
  startUrl: string;
}

export interface AwsSsoClientRegistration {
  clientId: string;
  clientSecret: string;
  expiresAt: Date;
}

export interface AwsSsoOptions {
  ssoStartUrl?: string;
  ssoRegion?: string;
  ssoAccountId?: string;
  ssoRoleName?: string;
  ssoProfile?: string;
}

/**
 * Discovers SSO profiles from ~/.aws/config
 */
export async function listSsoProfiles(): Promise<SsoProfile[]> {
  try {
    const { configFile } = await loadSharedConfigFiles();
    const profiles: SsoProfile[] = [];

    // Also check for sso-session sections
    const ssoSessions: Record<string, SsoSession> = {};

    for (const [key, config] of Object.entries(configFile)) {
      // Extract sso-session configurations
      if (key.startsWith('sso-session ')) {
        const sessionName = key.replace('sso-session ', '');
        if (config.sso_start_url && config.sso_region) {
          ssoSessions[sessionName] = {
            ssoStartUrl: config.sso_start_url,
            ssoRegion: config.sso_region,
          };
        }
      }
    }

    for (const [key, config] of Object.entries(configFile)) {
      // Skip sso-session sections
      if (key.startsWith('sso-session ')) {
        continue;
      }

      const profileName = key.replace('profile ', '');

      // Check for legacy SSO profile format (direct sso_start_url in profile)
      if (config.sso_start_url && config.sso_region) {
        profiles.push({
          name: profileName,
          ssoStartUrl: config.sso_start_url,
          ssoRegion: config.sso_region,
          ssoAccountId: config.sso_account_id,
          ssoRoleName: config.sso_role_name,
        });
      }
      // Check for new SSO session format (sso_session reference)
      else if (config.sso_session && ssoSessions[config.sso_session]) {
        const session = ssoSessions[config.sso_session];
        profiles.push({
          name: profileName,
          ssoStartUrl: session.ssoStartUrl,
          ssoRegion: session.ssoRegion,
          ssoAccountId: config.sso_account_id,
          ssoRoleName: config.sso_role_name,
          ssoSession: config.sso_session,
        });
      }
    }

    return profiles;
  } catch (error) {
    log.error('Failed to list SSO profiles:', error);
    return [];
  }
}

/**
 * AWS SSO Authentication Service
 *
 * Implements the OIDC Device Authorization Flow for AWS SSO/Identity Center.
 * Similar pattern to AzureAuthService.
 */
export class AwsSsoAuthService {
  private oidcClient: SSOOIDCClient;
  private ssoClient: SSOClient;
  private signal?: AbortSignal;

  // Cached client registration (valid for 90 days)
  private clientRegistration: AwsSsoClientRegistration | null = null;
  private clientRegistrationKey: string | null = null;

  // Cached SSO token
  private ssoToken: AwsSsoToken | null = null;
  private ssoTokenKey: string | null = null;

  // Callback to open browser
  private openBrowserCallback: ((url: string) => void) | null = null;

  /**
   * Set the callback for opening URLs in the browser.
   * In Electron, this should call shell.openExternal or post a message to the main process.
   */
  setOpenBrowserCallback(callback: (url: string) => void): void {
    this.openBrowserCallback = callback;
  }

  /**
   * Authenticate using AWS SSO/Identity Center.
   *
   * @param ssoStartUrl - The SSO start URL (e.g., https://mycompany.awsapps.com/start)
   * @param ssoRegion - The AWS region for the SSO endpoint
   * @param signal - Optional AbortSignal for cancellation
   * @returns The SSO access token
   */
  async authenticate(
    ssoStartUrl: string,
    ssoRegion: string,
    signal?: AbortSignal
  ): Promise<AwsSsoToken> {
    this.signal = signal;

    // Check if we have a valid cached token
    const tokenKey = `${ssoStartUrl}:${ssoRegion}`;
    if (this.ssoToken && this.ssoTokenKey === tokenKey && !this.isTokenExpired(this.ssoToken)) {
      log.info('Reusing cached SSO token');
      return this.ssoToken;
    }

    log.info(`Starting SSO authentication for ${ssoStartUrl}`);

    // Initialize OIDC client
    this.oidcClient = new SSOOIDCClient({ region: ssoRegion });

    // Step 1: Register client (or use cached registration)
    const registration = await this.getOrCreateClientRegistration(ssoStartUrl, ssoRegion);

    // Step 2: Start device authorization
    this.checkAbortSignal();
    log.info('Starting device authorization');

    const deviceAuth = await this.oidcClient.send(
      new StartDeviceAuthorizationCommand({
        clientId: registration.clientId,
        clientSecret: registration.clientSecret,
        startUrl: ssoStartUrl,
      })
    );

    // Step 3: Open browser for user authentication
    const authUrl = deviceAuth.verificationUriComplete;
    log.info(`Opening browser for SSO authentication: ${authUrl}`);

    if (this.openBrowserCallback) {
      this.openBrowserCallback(authUrl);
    } else {
      // Fallback for utility process - post message to parent
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = process as any;
      if (typeof proc !== 'undefined' && proc.parentPort) {
        proc.parentPort.postMessage({ type: 'openExternal', url: authUrl });
      } else {
        throw new Error('No browser callback configured and not running in utility process');
      }
    }

    // Step 4: Poll for token
    const token = await this.pollForToken(
      registration,
      deviceAuth.deviceCode,
      deviceAuth.interval || 5,
      deviceAuth.expiresIn || 600
    );

    // Cache the token
    this.ssoToken = {
      accessToken: token.accessToken,
      expiresAt: new Date(Date.now() + (token.expiresIn || 3600) * 1000),
      refreshToken: token.refreshToken,
      region: ssoRegion,
      startUrl: ssoStartUrl,
    };
    this.ssoTokenKey = tokenKey;

    log.info(`SSO authentication successful, token expires at ${this.ssoToken.expiresAt}`);
    return this.ssoToken;
  }

  /**
   * Get AWS credentials for a specific account and role using the SSO token.
   */
  async getCredentials(
    token: AwsSsoToken,
    accountId: string,
    roleName: string
  ): Promise<AWSCredentials> {
    this.ssoClient = new SSOClient({ region: token.region });

    log.info(`Getting credentials for account ${accountId}, role ${roleName}`);

    const response = await this.ssoClient.send(
      new GetRoleCredentialsCommand({
        accessToken: token.accessToken,
        accountId,
        roleName,
      })
    );

    if (!response.roleCredentials) {
      throw new Error('No role credentials returned from SSO');
    }

    return {
      accessKeyId: response.roleCredentials.accessKeyId,
      secretAccessKey: response.roleCredentials.secretAccessKey,
      sessionToken: response.roleCredentials.sessionToken,
    };
  }

  /**
   * List available AWS accounts for the authenticated user.
   */
  async listAccounts(token: AwsSsoToken): Promise<AccountInfo[]> {
    this.ssoClient = new SSOClient({ region: token.region });

    const accounts: AccountInfo[] = [];
    let nextToken: string | undefined;

    do {
      const response = await this.ssoClient.send(
        new ListAccountsCommand({
          accessToken: token.accessToken,
          nextToken,
        })
      );

      if (response.accountList) {
        accounts.push(...response.accountList);
      }
      nextToken = response.nextToken;
    } while (nextToken);

    return accounts;
  }

  /**
   * List available roles for a specific account.
   */
  async listAccountRoles(token: AwsSsoToken, accountId: string): Promise<RoleInfo[]> {
    this.ssoClient = new SSOClient({ region: token.region });

    const roles: RoleInfo[] = [];
    let nextToken: string | undefined;

    do {
      const response = await this.ssoClient.send(
        new ListAccountRolesCommand({
          accessToken: token.accessToken,
          accountId,
          nextToken,
        })
      );

      if (response.roleList) {
        roles.push(...response.roleList);
      }
      nextToken = response.nextToken;
    } while (nextToken);

    return roles;
  }

  /**
   * Authenticate using a pre-configured SSO profile from ~/.aws/config.
   */
  async authenticateWithProfile(
    profile: SsoProfile,
    signal?: AbortSignal
  ): Promise<AWSCredentials> {
    const token = await this.authenticate(profile.ssoStartUrl, profile.ssoRegion, signal);

    if (!profile.ssoAccountId || !profile.ssoRoleName) {
      throw new Error(
        'SSO profile must have sso_account_id and sso_role_name configured to get credentials directly'
      );
    }

    return this.getCredentials(token, profile.ssoAccountId, profile.ssoRoleName);
  }

  /**
   * Clear cached tokens and registrations.
   */
  clearCache(): void {
    this.ssoToken = null;
    this.ssoTokenKey = null;
    this.clientRegistration = null;
    this.clientRegistrationKey = null;
  }

  /**
   * Check if the current token is still valid.
   */
  hasValidToken(): boolean {
    return this.ssoToken !== null && !this.isTokenExpired(this.ssoToken);
  }

  /**
   * Get the current cached token if valid.
   */
  getCachedToken(): AwsSsoToken | null {
    if (this.hasValidToken()) {
      return this.ssoToken;
    }
    return null;
  }

  private isTokenExpired(token: AwsSsoToken): boolean {
    return Date.now() >= token.expiresAt.getTime() - TOKEN_EXPIRATION_THRESHOLD_MS;
  }

  private async getOrCreateClientRegistration(
    ssoStartUrl: string,
    ssoRegion: string
  ): Promise<AwsSsoClientRegistration> {
    const key = `${ssoStartUrl}:${ssoRegion}`;

    // Check if we have a valid cached registration
    if (
      this.clientRegistration &&
      this.clientRegistrationKey === key &&
      this.clientRegistration.expiresAt.getTime() > Date.now()
    ) {
      log.info('Reusing cached OIDC client registration');
      return this.clientRegistration;
    }

    this.checkAbortSignal();
    log.info('Registering OIDC client with AWS SSO');

    const response = await this.oidcClient.send(
      new RegisterClientCommand({
        clientName: 'Beekeeper Studio',
        clientType: 'public',
      })
    );

    this.clientRegistration = {
      clientId: response.clientId,
      clientSecret: response.clientSecret,
      expiresAt: new Date(
        (response.clientSecretExpiresAt || Date.now() / 1000 + CLIENT_REGISTRATION_CACHE_DURATION_MS / 1000) * 1000
      ),
    };
    this.clientRegistrationKey = key;

    return this.clientRegistration;
  }

  private async pollForToken(
    registration: AwsSsoClientRegistration,
    deviceCode: string,
    intervalSeconds: number,
    expiresInSeconds: number
  ): Promise<{ accessToken: string; expiresIn?: number; refreshToken?: string }> {
    const startTime = Date.now();
    const expirationTime = startTime + expiresInSeconds * 1000;
    let currentInterval = intervalSeconds;

    while (Date.now() < expirationTime) {
      this.checkAbortSignal();
      await wait(currentInterval * 1000);

      try {
        const response = await this.oidcClient.send(
          new CreateTokenCommand({
            clientId: registration.clientId,
            clientSecret: registration.clientSecret,
            grantType: 'urn:ietf:params:oauth:grant-type:device_code',
            deviceCode,
          })
        );

        return {
          accessToken: response.accessToken,
          expiresIn: response.expiresIn,
          refreshToken: response.refreshToken,
        };
      } catch (error) {
        if (error instanceof AuthorizationPendingException) {
          // User hasn't completed authentication yet, continue polling
          log.debug('Authorization pending, continuing to poll...');
          continue;
        } else if (error instanceof SlowDownException) {
          // Increase polling interval
          currentInterval += 5;
          log.debug(`Slowing down polling interval to ${currentInterval}s`);
          continue;
        } else if (error instanceof ExpiredTokenException) {
          throw new Error('SSO authentication timed out. Please try again.');
        } else if (error instanceof InvalidClientException) {
          // Client registration expired, clear cache and re-throw
          this.clientRegistration = null;
          this.clientRegistrationKey = null;
          throw new Error('SSO client registration expired. Please try again.');
        } else {
          throw error;
        }
      }
    }

    throw new Error('SSO authentication timed out. Please try again.');
  }

  private checkAbortSignal(): void {
    if (this.signal?.aborted) {
      throw new Error('SSO authentication was cancelled');
    }
  }
}

// Singleton instance for convenience
let ssoAuthServiceInstance: AwsSsoAuthService | null = null;

export function getAwsSsoAuthService(): AwsSsoAuthService {
  if (!ssoAuthServiceInstance) {
    ssoAuthServiceInstance = new AwsSsoAuthService();
  }
  return ssoAuthServiceInstance;
}
