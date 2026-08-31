import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { AxiosInstance } from "axios";
import { GenericController } from "./GenericController";

export class AccessGrantsController extends GenericController<IAccessGrant> {
  constructor(
    protected axios: AxiosInstance,
    protected subjectPath: string,
    protected subjectId: number
  ) {
    super(axios);
  }

  name = "accessGrant";
  plural = "accessGrants";
  path = `${this.subjectPath}/${this.subjectId}/access_grants`;
}
