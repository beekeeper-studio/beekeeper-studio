import { GetClusterCredentialsCommand, RedshiftClient } from '@aws-sdk/client-redshift';
import { RedshiftServerlessClient, GetCredentialsCommand } from "@aws-sdk/client-redshift-serverless";
import rawLog from '@bksLogger';
import { IamAuthOptions, IDbConnectionServerConfig } from '../types';

// The number of minutes to consider credentials expired *before* their actual expiration.
// This accounts for potential client clock drift.
const CREDENTIAL_EXPIRATION_THRESHOLD_MINUTES = 5;

const log = rawLog.scope("amazon-redshift");
const logger = () => log;

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
    isServerLess?: boolean;
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
        logger().info(`Re-using existing Redshift cluster credentials.`);
        return credentials;
      }

      let newCredentials = null

      // Get the credentials
      logger().info(`Calling Redshift to get temporary cluster credentials with config ${JSON.stringify(config)}`)
      if(config.isServerLess){
        const redshiftClientServerless = new RedshiftServerlessClient({
          credentials: awsCredentials,
          region: config.awsRegion
        })

        const tempCredsResponse = await redshiftClientServerless.send(new GetCredentialsCommand({
          workgroupName: config.clusterIdentifier,
          dbName: config.dbName,
          durationSeconds: config.durationSeconds || undefined
        }))

        newCredentials = {
          dbUser: tempCredsResponse.dbUser!,
          dbPassword: tempCredsResponse.dbPassword!,
          expiration: new Date(tempCredsResponse.expiration!)
        }

        logger().info(`Redshift temporary cluster credentials will expire at ${tempCredsResponse.expiration!}`)
      }else{
        const redshiftClient = new RedshiftClient({
          credentials: awsCredentials,
          region: config.awsRegion
        });

        const tempCredsResponse = await redshiftClient.send(new GetClusterCredentialsCommand({
          ClusterIdentifier: config.clusterIdentifier,
          DbName: config.dbName,
          DbUser: config.dbUser,
          DbGroups: [config.dbGroup],
          DurationSeconds: config.durationSeconds || undefined,
          AutoCreate: true
        }));
        logger().info(`Redshift temporary cluster credentials will expire at ${tempCredsResponse.Expiration!}`)

        newCredentials = {
          dbUser: tempCredsResponse.DbUser!,
          dbPassword: tempCredsResponse.DbPassword!,
          expiration: new Date(tempCredsResponse.Expiration!)
        }
      }

      this.credentials.set(cacheKey, newCredentials);

      return newCredentials;
    }
}
