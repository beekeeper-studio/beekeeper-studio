import { GetClusterCredentialsCommand, RedshiftClient } from '@aws-sdk/client-redshift';

// The number of minutes to consider credentials expired *before* their actual expiration.
// This accounts for potential client clock drift.
const CREDENTIAL_EXPIRATION_THRESHOLD_MINUTES = 5;

export interface AWSCredentials {
    accessKeyId: string;
    secretAccessKey: string;
}

export interface ClusterCredentialConfiguration {
    awsRegion: string;
    clusterIdentifier: string;
    dbName: string;
    dbUser: string;
    dbGroup: string;
    durationSeconds: number;
}

export interface TemporaryClusterCredentials {
    dbUser: string;
    dbPassword: string;
    expiration: Date;
}

/**
 * RedshiftCredentialResolver provides the ability to use temporary cluster credentials to access
 * an Amazon Redshift cluster. 
 * 
 * See: https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html
 */
export class RedshiftCredentialResolver {
    // This class uses a singleton pattern to maintain internal state.
    private static instance: RedshiftCredentialResolver;
    private constructor() {
      // TODO: implement
    }
    public static getInstance(): RedshiftCredentialResolver {
        if (!RedshiftCredentialResolver.instance) {
            RedshiftCredentialResolver.instance = new RedshiftCredentialResolver();
        }
        return RedshiftCredentialResolver.instance;
    }

    private credentials: Map<string, TemporaryClusterCredentials> = new Map();

    private getCacheKey(awsCreds: AWSCredentials, config: ClusterCredentialConfiguration): string {
      return JSON.stringify({awsCreds, config});
    }

    /**
     * Determines whether credentials managed by the resolver should be refreshed.
     * 
     * @returns true if the credentials should be refreshed
     */
    private shouldRefreshCredentials(credentials: TemporaryClusterCredentials): boolean {
        // If no credentials have been set, refresh.
        if (!credentials) {
            return true;
        }

        // Return true if the credentials have passed the cache expiration threshold period.
        const expiration = credentials.expiration.getTime();
        const now = new Date().getTime();
        return now >= expiration - (CREDENTIAL_EXPIRATION_THRESHOLD_MINUTES * 60 * 1000);
    }

    /**
     * Exchanges a set of AWS credentials and configuration for a temporary set of credentials
     * to a Redshift cluster.
     * 
     * @param awsCredentials the AWS credentials
     * @param config the credential configuration
     * @returns the temporary credentials
     */
    async getClusterCredentials(awsCredentials: AWSCredentials, config: ClusterCredentialConfiguration): Promise<TemporaryClusterCredentials> {
      // Validate that all required fields have been provided
      if (!awsCredentials.accessKeyId) {
        throw new Error('Please provide an Access Key ID for IAM authentication.');
      }
      if (!awsCredentials.secretAccessKey) {
        throw new Error('Please provide a Secret Access Key for IAM authentication.');
      }
      if (!config.awsRegion) {
        throw new Error('Please provide an AWS Region for IAM authentication.');
      }
      if (!config.clusterIdentifier) {
        throw new Error('Please provide a Cluster Identifier for IAM authentication.');
      }

      // Get any existing credentials
      const cacheKey = this.getCacheKey(awsCredentials, config);
      const credentials = this.credentials.get(cacheKey);

      // If the credentials exist and were created <= credentialCacheSeconds ago, return them
      // instead of refreshing. This prevents excessive calling to Redshift's control plane
      // when we have credentials that we know with high confidence are still valid.
      if (!this.shouldRefreshCredentials(credentials)) {
        console.log(`Re-using existing Redshift cluster credentials.`);
        return credentials;
      }

      // Construct the client
      const redshiftClient = new RedshiftClient({ 
        credentials: awsCredentials,
        region: config.awsRegion
      });

      // Get the credentials
      console.log(`Calling Redshift to get temporary cluster credentials with config ${JSON.stringify(config)}`)
      const tempCredsResponse = await redshiftClient.send(new GetClusterCredentialsCommand({
        ClusterIdentifier: config.clusterIdentifier,
        DbName: config.dbName,
        DbUser: config.dbUser,
        DbGroups: [config.dbGroup],
        DurationSeconds: config.durationSeconds || undefined,
        AutoCreate: true
      }));
      console.log(`Redshift temporary cluster credentials will expire at ${tempCredsResponse.Expiration!}`)

      const newCredentials = {
        dbUser: tempCredsResponse.DbUser!,
        dbPassword: tempCredsResponse.DbPassword!,
        expiration: new Date(tempCredsResponse.Expiration!)
      }
      this.credentials.set(cacheKey, newCredentials);

      return newCredentials;
    }
}
