import { LocalConnectionFolderModule } from "@/store/modules/data/connection_folder/LocalConnectionFolderModule";
import { LocalQueryFolderModule } from "@/store/modules/data/query_folder/LocalQueryFolderModule";
import { CloudConnectionModule } from "./modules/data/connection/CloudConnectionModule";
import { UtilConnectionModule } from "./modules/data/connection/UtilityConnectionModule";
import { CloudConnectionFolderModule } from "./modules/data/connection_folder/CloudConnectionFolderModule";
import { CloudQueryModule } from "./modules/data/query/CloudQueryModule";
import { UtilQueryModule } from "./modules/data/query/UtilityQueryModule";
import { CloudQueryAuditModule } from "./modules/data/query_audit/CloudQueryAuditModule";
import { UtilQueryAuditModule } from "./modules/data/query_audit/UtilityQueryAuditModule";
import { CloudQueryFolderModule } from "./modules/data/query_folder/CloudQueryFolderModule";
import { UtilUsedConnectionModule } from "./modules/data/used_connection/UtilityUsedConnectionModule";
import { CloudUsedQueryModule } from "./modules/data/used_query/CloudUsedQueryModule";
import { UtilUsedQueryModule } from "./modules/data/used_query/UtilityUsedQueryModule";
import { CloudAccessGrantModule } from "./modules/data/access_grant/CloudAccessGrantModule";
import { UtilAccessGrantModule } from "./modules/data/access_grant/UtilAccessGrantModule";
import { CloudMembershipModule } from "./modules/data/membership/CloudMembershipModule";
import { UtilMembershipModule } from "./modules/data/membership/UtilMembershipModule";


export const DataModules = [
  {
    path: 'data/queries',
    local: UtilQueryModule,
    cloud: CloudQueryModule,
  },
  {
    path: 'data/queryAudits',
    local: UtilQueryAuditModule,
    cloud: CloudQueryAuditModule,
  },
  {
    path: 'data/connections',
    cloud: CloudConnectionModule,
    local: UtilConnectionModule
  },
  {
    path: 'data/queryFolders',
    cloud: CloudQueryFolderModule,
    local: LocalQueryFolderModule
  },
  {
    path: 'data/connectionFolders',
    cloud: CloudConnectionFolderModule,
    local: LocalConnectionFolderModule
  },
  {
    path: 'data/usedQueries',
    cloud: CloudUsedQueryModule,
    local: UtilUsedQueryModule,
  },
  {
    path: 'data/usedconnections',
    cloud: UtilUsedConnectionModule,
    local: UtilUsedConnectionModule
  },
  {
    path: 'data/accessGrants',
    cloud: CloudAccessGrantModule,
    local: UtilAccessGrantModule,
  },
  {
    path: 'data/memberships',
    cloud: CloudMembershipModule,
    local: UtilMembershipModule,
  },
]
