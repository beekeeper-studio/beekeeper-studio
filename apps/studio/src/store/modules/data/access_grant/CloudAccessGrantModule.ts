import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { IMembership } from "@/common/interfaces/IMembership";
import {
  actionsFor,
  DataState,
  DataStore,
  mutationsFor,
} from "@/store/modules/data/DataModuleBase";
import { safelyDo } from "@/store/modules/data/StoreHelpers";

type State = DataState<IAccessGrant>;

type SaveManyOptions = {
  subjectId: number;
  subjectType: "Query" | "Connection" | "QueryFolder" | "ConnectionFolder";
  canRead: boolean;
  canWrite: boolean;
  memberships: IMembership[];
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
    async saveMany(context, options: SaveManyOptions) {
      await safelyDo(context, async (cli) => {
        const items: any[] = await cli.accessGrants.createBulk(
          options.memberships.map((member) => ({
            membership_id: member.id,
            subject_id: options.subjectId,
            subject_type: options.subjectType,
            can_read: options.canRead,
            can_write: options.canWrite,
          }))
        );
        // this is to account for when the store module changes
        const rightItems = items.filter(
          (i) => i.workspaceId === context.rootState.workspaceId
        );
        if (rightItems.length === items.length) {
          context.commit("replace", rightItems);
        }
      });
    },
  }),
};
