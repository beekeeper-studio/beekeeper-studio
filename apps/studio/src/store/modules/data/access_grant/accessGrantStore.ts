import Vue from "vue";
import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { IMembership } from "@/common/interfaces/IMembership";
import { havingCli, upsert } from "@/store/modules/data/StoreHelpers";
import { ActionTree, MutationTree } from "vuex";
import { State as RootState } from "@/store";
import { IShareable } from "@/common/interfaces/IShareable";

type State = {
  items: IShareable[];
};

export function accessGrantMutations(): MutationTree<State> {
  return {
    setAccessGrants(state, { subjectId, accessGrants }) {
      const item = state.items.find((i) => i.id === subjectId);
      if (item) {
        Vue.set(item, "accessGrants", accessGrants ?? []);
      }
    },
    upsertAccessGrants(state, { subjectId, accessGrants }) {
      const item = state.items.find((i) => i.id === subjectId);
      if (!item) {
        return;
      }
      const current = item.accessGrants ? [...item.accessGrants] : [];
      accessGrants.forEach((g: IAccessGrant) => upsert(current, g));
      Vue.set(item, "accessGrants", current);
    },
    deleteAccessGrant(state, { subjectId, accessGrant }) {
      const item = state.items.find((i) => i.id === subjectId);
      const accessGrants = item.accessGrants ?? [];
      if (item) {
        Vue.set(
          item,
          "accessGrants",
          accessGrants.filter((g) => g.id !== accessGrant.id)
        );
      }
    },
  };
}

export function cloudAccessGrantActions(
  key: "connections" | "queries" | "queryFolders" | "connectionFolders"
): ActionTree<State, RootState> {
  return {
    async loadAccessGrants(context, subjectId: number) {
      return await havingCli(context, async (cli) => {
        const items = await cli[key].accessGrantsOf(subjectId).list();
        context.commit("setAccessGrants", { subjectId, accessGrants: items });
        return items;
      });
    },
    async saveAccessGrants(
      context,
      { subjectId, canRead, canWrite, memberships }
    ) {
      return await havingCli(context, async (cli) => {
        const items = await cli[key].accessGrantsOf(subjectId).import(
          // Manual snake_case is required: the request transformer only maps
          // top-level keys, so nested array items must already be snake_cased.
          memberships.map((m: IMembership) => ({
            membership_id: m.id,
            can_read: canRead,
            can_write: canWrite,
          }))
        );
        context.commit("upsertAccessGrants", {
          subjectId,
          accessGrants: items,
        });
        return items;
      });
    },
    async saveAccessGrant(context, { accessGrant, subjectId }) {
      return await havingCli(context, async (cli) => {
        const updated = await cli[key]
          .accessGrantsOf(subjectId)
          .upsert(accessGrant);
        context.commit("upsertAccessGrants", {
          subjectId,
          accessGrants: [updated],
        });
        return updated;
      });
    },
    async removeAccessGrant(context, { accessGrant, subjectId }) {
      await havingCli(context, async (cli) => {
        await cli[key].accessGrantsOf(subjectId).delete(accessGrant);
        context.commit("deleteAccessGrant", { subjectId, accessGrant });
      });
    },
  };
}

export function localAccessGrantActions() {
  return {
    async loadAccessGrants() {
      throw new Error("Access grants are only available in cloud workspaces");
    },
    async saveAccessGrants() {
      throw new Error("Access grants are only available in cloud workspaces");
    },
    async saveAccessGrant() {
      throw new Error("Access grants are only available in cloud workspaces");
    },
    async removeAccessGrant() {
      throw new Error("Access grants are only available in cloud workspaces");
    },
  };
}
