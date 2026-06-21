import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { GenericController } from "@/lib/cloud/controllers/GenericController";

export class AccessGrantsController extends GenericController<IAccessGrant> {
  name = "accessGrant"
  plural = "accessGrants"
  path = '/access_grants'
}
