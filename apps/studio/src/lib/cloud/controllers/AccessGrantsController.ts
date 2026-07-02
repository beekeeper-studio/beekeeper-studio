import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { CloudError, res, url } from "@/lib/cloud/ClientHelpers";
import { AxiosInstance } from "axios";

export type SubjectType =
  | "connection"
  | "query"
  | "queryFolder"
  | "connectionFolder";

const map = {
  connection: "connections",
  query: "queries",
  connectionFolder: "connection_folders",
  queryFolder: "query_folders",
} as const;

export class AccessGrantsController {
  constructor(protected axios: AxiosInstance) { }

  name = "accessGrant";
  plural = "accessGrants";
  path = "/access_grants";

  async list(
    _updatedSince: number = undefined,
    options: {
      subjectType: SubjectType;
      subjectId: number;
      extraParams?: Record<string, any>;
    }
  ): Promise<IAccessGrant[]> {
    const subjectTypeUrl = map[options.subjectType];
    if (!subjectTypeUrl) {
      throw new Error(`Invalid subjectType: ${options.subjectType}`);
    }

    const response = await this.axios.get(
      url(subjectTypeUrl, options.subjectId, "access_grants")
    );
    return res(response, this.plural);
  }

  async create(
    q: IAccessGrant,
    options: {
      subjectType: SubjectType;
      subjectId: number;
    }
  ): Promise<IAccessGrant> {
    if (q.id)
      throw new CloudError(
        400,
        `Cannot create ${this.name} - it already has an ID`
      );

    const subjectTypeUrl = map[options.subjectType];
    if (!subjectTypeUrl) {
      throw new Error(`Invalid subjectType: ${options.subjectType}`);
    }

    const response = await this.axios.post(
      url(subjectTypeUrl, options.subjectId, "access_grants"),
      q
    );
    return res(response, this.name);
  }

  async createBulk(
    qs: Omit<IAccessGrant, "id">[],
    options: { subjectType: SubjectType; subjectId: number }
  ): Promise<IAccessGrant[]> {
    if (qs.some((q) => q.id))
      throw new CloudError(
        400,
        `Cannot create ${this.name} - it already has an ID`
      );

    const subjectTypeUrl = map[options.subjectType];
    if (!subjectTypeUrl) {
      throw new Error(`Invalid subjectType: ${options.subjectType}`);
    }

    const response = await this.axios.post(
      url(subjectTypeUrl, options.subjectId, "access_grants", "bulk"),
      { [this.plural]: qs }
    );
    return res(response, this.plural);
  }

  async upsert(
    q: IAccessGrant,
    options: { subjectId: number; subjectType: SubjectType }
  ): Promise<IAccessGrant> {
    const method = q.id ? this.update.bind(this) : this.create.bind(this);
    return await method(q, options);
  }

  async update(
    q: IAccessGrant,
    options: {
      subjectId: number;
      subjectType: SubjectType;
    }
  ): Promise<IAccessGrant> {
    if (!q.id) {
      throw new CloudError(400, `Must provide ID to update ${this.name}.`);
    }

    const subjectTypeUrl = map[options.subjectType];
    if (!subjectTypeUrl) {
      throw new Error(`Invalid subjectType: ${options.subjectType}`);
    }

    const response = await this.axios.patch(
      url(subjectTypeUrl, options.subjectId, "access_grants", q.id),
      q
    );
    return res(response, this.name);
  }

  async delete(
    q: IAccessGrant,
    options: {
      subjectId: number;
      subjectType: SubjectType;
    }
  ): Promise<boolean> {
    if (!q.id) {
      throw new CloudError(400, `Cannot delete ${this.name} without an ID`);
    }

    const subjectTypeUrl = map[options.subjectType];
    if (!subjectTypeUrl) {
      throw new Error(`Invalid subjectType: ${options.subjectType}`);
    }

    const response = await this.axios.delete(
      url(subjectTypeUrl, options.subjectId, "access_grants", q.id)
    );
    return res(response, "success");
  }
}
