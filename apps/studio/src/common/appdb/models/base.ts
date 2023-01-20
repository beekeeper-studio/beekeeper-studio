export interface QueryLike {
  title?: string
  text: string
  database?: string | null
  status?: string
}

export interface IamAuthOptions {
  iamAuthenticationEnabled?: boolean
  accessKeyId?: string;
  secretAccessKey?: string;
  awsRegion?: string;
  clusterIdentifier?: string;
  databaseGroup?: string;
  tokenDurationSeconds?: number;
}
