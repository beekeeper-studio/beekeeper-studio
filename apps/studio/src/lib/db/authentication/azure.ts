import * as msal from '@azure/msal-node';
import axios, { AxiosResponse } from 'axios';
// not sure about this
import { shell } from '@electron/remote';
import { wait } from '@shared/lib/wait';
import rawLog from 'electron-log';
import { TokenCache } from '@/common/appdb/models/token_cache';

const log = rawLog.scope('auth/azure');

type CloudTokenResponse = {
  cloud_token: CloudToken,
  errors: [],
  status: number,
  success: boolean
}

type Response = AxiosResponse<CloudTokenResponse, any>;

export interface CloudToken {
  id: string,
  created_at: string,
  updated_at: string,
  params: string,
  status: string,
  url: string,
  fulfillment_url: string
}

let localCache: TokenCache;

const cachePlugin = {
  beforeCacheAccess: async (cacheContext: msal.TokenCacheContext): Promise<void> => {
    // const cache = JSON.stringify(localCache.cache) // might need to stringify?
    cacheContext.tokenCache.deserialize(localCache.cache)
  },
  afterCacheAccess: async (cacheContext: msal.TokenCacheContext): Promise<void> => {
    if (cacheContext.cacheHasChanged) {
      localCache.cache = cacheContext.tokenCache.serialize();
      localCache.save();
    }
  }
}

// TODO (@day): refactor this shit lol
export class AzureAuthService {
  pca: msal.PublicClientApplication;

  private cancelFulfillment = false;
  private homeId: string;
  // private cache: TokenCache;

  public async init(authId: number) {
    if (!authId) {
      throw new Error("No TokenCache entry found in database"); // ?? do we need this ??
    }

    localCache = await TokenCache.findOne(authId);

    const clientConfig = {
     auth: {
       clientId: 'da931511-74dc-4f3d-ae50-5436c6407572'
     },
     cache: {
       cachePlugin
     }
    };
    log.debug('Creating PCA');
    this.pca = new msal.PublicClientApplication(clientConfig);
  }

  async acquireToken(): Promise<string> {
    const refreshToken = await this.tryRefresh();
    console.log('refresh token', refreshToken);
    if (refreshToken) {
      return refreshToken;
    }
    log.debug('Getting beekeeper cloud token');
    const res = await axios.post('https://app.beekeeperstudio.io/api/cloud_tokens') as Response;

    const beekeeperCloudToken = res.data?.cloud_token;
    const authCodeUrlParams = {
      scopes: ['https://database.windows.net/.default', 'offline_access'],
      redirectUri: beekeeperCloudToken.fulfillment_url,
      state: beekeeperCloudToken.id,
      prompt: 'consent'
    };
    const authUrl = await this.pca.getAuthCodeUrl(authCodeUrlParams);

    log.debug('Getting auth code')
    shell.openExternal(authUrl);

    const result = await this.checkStatus(beekeeperCloudToken.url);
    if (!result || result?.data?.cloud_token?.status !== 'fulfilled') {
      // TODO (@day): handle this case somehow. (not currently possible, checkStatus will go on forever till they get redirected)
      throw new Error(`Something went terribly wrong and I don't want to think about this case right now`);
    }
    await axios.put(beekeeperCloudToken.url, { status: 'claimed' });

    const params = result.data.cloud_token.params;
    const code = params['code'];

    if (code) {
      try {
        const tokenRequest = {
          code: code,
          scopes: ['https://database.windows.net/.default', 'offline_access'],
          redirectUri: beekeeperCloudToken.fulfillment_url,
          state: beekeeperCloudToken.id
        };

        const tokenResponse = await this.pca.acquireTokenByCode(tokenRequest)

        localCache.homeId = tokenResponse.account.homeAccountId;
        localCache.save();
        return tokenResponse.accessToken;

      } catch (e) {
        console.error('ERROR: ', e.message);
        throw e
      }
    }
  }

  public cancel(): void {
    this.cancelFulfillment = true;
  }

  private async tryRefresh(): Promise<string | null> {
    const tokenCache = this.pca.getTokenCache();
    const account = await tokenCache.getAccountByHomeId(this.homeId);

    if (!account) {
      return null;
    }

    const refreshTokenResponse = await this.pca.acquireTokenSilent({
      account: account,
      scopes: ['https://database.windows.net/.default', 'offline_access'],
      forceRefresh: true
    });

    return refreshTokenResponse ? refreshTokenResponse.accessToken : null;
  }
  
  // need a way to cancel this 
  private async checkStatus(url: string): Promise<Response> {
    if (this.cancelFulfillment) {
      return null;
    }
    const result = await axios.get(url) as Response;
    if (result?.data?.cloud_token?.status !== 'fulfilled') {
      await wait(2000);
      return await this.checkStatus(url);
    } else {
      console.log('FULFILLED or failed')
      return result;
    }
  }
}
