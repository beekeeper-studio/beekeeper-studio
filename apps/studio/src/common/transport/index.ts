import { IConnection } from "../interfaces/IConnection";

// anything that is transferred to the utility process should implement this interface
// may need to add more in the future, this is just to make type stuff
export interface Transport {
  id: number | null
  createdAt: Date,
  updatedAt: Date,
  version: number
}

export interface TransportTempFile {
  id: string,
  name: string
}

export interface TransportCloudCredential extends Transport {
  appId: string | null,
  email: string | null,
  token: string | null
}

export interface TransportLicenseKey extends Transport {
  email: string,
  key: string,
  validUntil: Date,
  supportUntil: Date,
  licenseType: 'TrialLicense' | 'PersonalLicense' | 'BusinessLicense',
  active: boolean
  maxAllowedAppRelease: { tagName: string } | null
}

export interface TransportPinnedConn extends Transport {
  position: number;
  connectionId: number;
  workspaceId: number;
  connection: IConnection;
}

export interface TransportFavoriteQuery extends Transport {
  title: string;
  text: string;
  excerpt: string;
  database: string | null;
  connectionHash: string;
}

export function blankFavoriteQuery(): TransportFavoriteQuery {
  return {
    title: undefined,
    text: undefined,
    excerpt: undefined,
    database: null,
    connectionHash: undefined,
    id: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: undefined
  }
}

export interface TransportUsedQuery extends Transport {
  text: string;
  excerpt: string;
  database: string;
  connectionHash: string;
  status: string;
  numberOfRecords?: BigInt;
  workspaceId: number;
}

export interface TransportHiddenEntity extends Transport {
  databaseName: string,
  schemaName?: string,
  entityName: string,
  entityType: 'table' | 'view' | 'routine' | 'materialized-view',
  connectionId: number,
  workspaceId: number
}

/**
 * Types below from apps/studio/src/common/appdb/models/FormatterPreset.ts because
 * "importing from appdb models in anything that is imported in the frontend (this can cause issues with production builds unfortunately)"
 */
type CaseOption = "preserve" | "upper" | "lower";
type LogicalOperatorNewlineOption = "before" | "after";
type FormatterPresetConfig = {
  tabWidth: number;
  useTabs: boolean;
  keywordCase: CaseOption;
  dataTypeCase: CaseOption;
  functionCase: CaseOption;
  logicalOperatorNewline: LogicalOperatorNewlineOption;
  expressionWidth: number;
  linesBetweenQueries: number;
  denseOperators: boolean;
  newlineBeforeSemicolon: boolean;
}
export interface TransportFormatterPreset extends Transport {
  name: string,
  config: FormatterPresetConfig,
  systemDefault: boolean
}
