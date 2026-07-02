import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { IMembership } from "@/common/interfaces/IMembership";
import { SubjectType } from "@/lib/cloud/controllers/AccessGrantsController";
import {
  actionsFor,
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";
import { havingCli, safelyDo } from "@/store/modules/data/StoreHelpers";

type State = DataState<IAccessGrant>;

type SaveManyOptions = {
  subjectId: number;
  subjectType: SubjectType;
  canRead: boolean;
  canWrite: boolean;
  memberships: IMembership[];
};

type SaveOptions = {
  accessGrant: IAccessGrant;
  subject: {
    subjectId: number;
    subjectType: SubjectType;
  };
};

type RemoveOptions = {
  accessGrant: IAccessGrant;
  subject: {
    subjectId: number;
    subjectType: SubjectType;
  };
};

export const CloudAccessGrantModule: DataStore<IAccessGrant, State> = {
  namespaced: true,
  state: {
    items: [],
    loading: false,
    error: null,
    pollError: null,
  },
  mutations: mutationsFor<IAccessGrant>(),
  actions: actionsFor<IAccessGrant>("accessGrants", {
    async initialize() {
      // noop
    },
    async poll() {
      // empty on purpose
    },
    async list(
      context,
      subjectType: SubjectType,
      subjectId: number
    ): Promise<IAccessGrant[]> {
      return await havingCli(context, (cli) =>
        cli.accessGrants.list(undefined, { subjectId, subjectType })
      );
    },
    async saveMany(context, options: SaveManyOptions) {
      await safelyDo(context, async (cli) => {
        const items: IAccessGrant[] = await cli.accessGrants.createBulk(
          options.memberships.map((member) => ({
            membership_id: member.id,
            can_read: options.canRead,
            can_write: options.canWrite,
          })),
          { subjectId: options.subjectId, subjectType: options.subjectType }
        );
        context.commit("upsert", items);
      });
    },
    async save(context, options: SaveOptions): Promise<IAccessGrant> {
      return await havingCli(context, async (cli) => {
        const updated = await cli.accessGrants.upsert(
          options.accessGrant,
          options.subject
        );
        context.commit("upsert", updated);
        return updated.id;
      });
    },
    async remove(context, options: RemoveOptions) {
      await havingCli(context, async (cli) => {
        await cli.accessGrants.delete(options.accessGrant, options.subject);
        context.commit("remove", options.accessGrant);
      });
    },
  }),
};
