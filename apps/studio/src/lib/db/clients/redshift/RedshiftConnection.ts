import { PoolConfig } from "pg";
import { ClusterCredentialConfiguration, RedshiftCredentialResolver } from "../../authentication/amazon-redshift";
import { IDbConnectionServer } from "../../backendTypes";
import { PsqlConnection } from "../postgresql/PsqlConnection";
import { resolveAWSCredentials } from "../utils";
import BksConfig from "@/common/bksConfig";

export class RedshiftConnection extends PsqlConnection {
  protected async configDatabase(server: IDbConnectionServer, database: { database: string }) {
    // If a temporary user is used to connect to the database, we populate it below.
    let tempUser: string;

    // If the password for the database can expire, we populate passwordResolver with a callback
    // that can be used to resolve the latest password.
    let passwordResolver: () => Promise<string>;

    const iamOptions = server.config.iamAuthOptions;
    const redshiftOptions = server.config.redshiftOptions;
    if (iamOptions?.iamAuthenticationEnabled) {

      const clusterConfig: ClusterCredentialConfiguration = {
        awsRegion: iamOptions.awsRegion,
        clusterIdentifier: redshiftOptions.clusterIdentifier,
        dbName: database.database,
        dbUser: server.config.user,
        dbGroup: redshiftOptions.databaseGroup,
        durationSeconds: server.config.options.tokenDurationSeconds,
        isServerLess: redshiftOptions.isServerless
      };

      const credentialResolver = RedshiftCredentialResolver.getInstance();

      const awsCreds = await resolveAWSCredentials(iamOptions);

      // We need resolve credentials once to get the temporary database user, which does not change
      // on each call to get credentials.
      // This is usually something like "IAMA:<user>" or "IAMA:<user>:<group>".
      tempUser = (await credentialResolver.getClusterCredentials(awsCreds, clusterConfig)).dbUser;

      // Set the password resolver to resolve the Redshift credentials and return the password.
      passwordResolver = async () => {
        return (await credentialResolver.getClusterCredentials(awsCreds, clusterConfig)).dbPassword;
      }
    }


    const config: PoolConfig = {
      host: server.config.host,
      port: server.config.port || undefined,
      password: passwordResolver || server.config.password || undefined,
      database: database.database,
      max: BksConfig.db.redshift.maxConnections, // max idle connections per time (30 secs)
      connectionTimeoutMillis: BksConfig.db.redshift.connectionTimeout,
      idleTimeoutMillis: BksConfig.db.redshift.connectionTimeout,
    };

    return this.configurePool(config, server, tempUser);
  }
}
