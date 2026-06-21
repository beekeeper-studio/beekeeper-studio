<template>
  <base-modal name="share-modal" @opened="handleOpened">
    <template #title>{{ subject?.name || "Share" }}</template>
    <template v-if="subject">
      <div class="search-members">
        <div class="input-wrapper">
          <multi-select
            placeholder="Search a member"
            v-model="search"
            option-label="searchable"
            :suggestions="memberships"
            :selected-options="selectedMembers"
            @item-add="handleMemberAdd"
            @item-remove="handleMemberRemove"
            @open="loadMembershipsOnce"
          >
            <template #empty-state v-if="loadingMemberships">
              Loading ...
            </template>
            <template #option="{ option }">
              {{ option.name }} - {{ option.email }}
            </template>
            <template #selected-option="{ option }">
              {{ option.name }}
            </template>
          </multi-select>
          <select
            v-show="search.length > 0 || selectedMembers.length > 0"
            v-model="permission"
            class="auto-width"
          >
            <option value="view">can view</option>
            <option value="edit">can edit</option>
          </select>
        </div>
        <button
          class="btn btn-primary btn-icon add-btn"
          type="button"
          :disabled="selectedMembers.length === 0"
          @click="addSelectedMembers"
        >
          <i class="material-icons">add</i>
          Add
        </button>
      </div>

      <div class="member-access">
        Who has access
        <ul>
          <li class="access-grant">
            <div class="icon">
              <i class="material-icons-outlined">people_alt</i>
            </div>
            <div class="label">Your team</div>
            <div class="access">
              <loading-spinner v-if="loadingTeamPermission" />
              <select
                class="auto-width"
                v-if="subject.canManage"
                :value="teamPermission"
                :disabled="loadingTeamPermission"
                @change="changeTeamPermission($event.target.value)"
              >
                <option value="view">can view</option>
                <option value="edit">can edit</option>
                <option value="hidden">hidden</option>
              </select>
              <template v-else>
                <template v-if="teamPermission === 'view'">can view</template>
                <template v-else-if="teamPermission === 'edit'">
                  can edit
                </template>
              </template>
            </div>
          </li>
          <li class="access-grant">
            <div class="icon">{{ subject.membership.name[0] }}</div>
            <div class="label">
              <span>{{ subject.membership.name }}</span>
              <span v-if="isItYou(subject.membership)"> (You)</span>
            </div>
            <div class="access">Owner</div>
          </li>
          <li class="access-grant" v-for="grant of accessGrants">
            <div class="icon">{{ grant.membership.name[0] }}</div>
            <div class="label">
              {{ grant.membership.name }}
              <span v-if="isItYou(grant.membership)"> (You)</span>
            </div>
            <div class="access">
              <loading-spinner v-if="loadingGrants.includes(grant.id)" />
              <select
                class="auto-width"
                :value="grantToPermission(grant)"
                @change="
                  $event.target.value === 'remove'
                    ? removeAccess(grant)
                    : changeAccess(grant, $event.target.value)
                "
                v-if="subject.canManage"
                :disabled="loadingGrants.includes(grant.id)"
              >
                <option value="view">can view</option>
                <option value="edit">can edit</option>
                <hr />
                <option value="remove">Remove</option>
              </select>
              <template v-else>
                <template v-if="grantToPermission(grant) === 'view'">
                  can view
                </template>
                <template v-else-if="grantToPermission(grant) === 'edit'">
                  can edit
                </template>
              </template>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import { AppEvent, OpenShareModalOptions } from "@/common/AppEvent";
import { mapActions, mapGetters, mapState } from "vuex";
import { IShareable } from "@/common/interfaces/IShareable";
import { DataState } from "@/store/modules/data/DataModuleBase";
import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { IMembership } from "@/common/interfaces/IMembership";
import MultiSelect from "@/components/common/form/MultiSelect.vue";
import _ from "lodash";
import LoadingSpinner from "@/components/common/loading/LoadingSpinner.vue";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import { IQueryFolder, IConnectionFolder } from "@/common/interfaces/IQueryFolder";

type Permission = "view" | "edit" | "hidden";
type AccessGrantLike = Pick<IAccessGrant, "canRead" | "canWrite">;

export default Vue.extend({
  components: { BaseModal, MultiSelect, LoadingSpinner },
  data() {
    return {
      subjectId: null,
      subjectType: null,
      membershipsLoaded: false,
      search: "",
      permission: "view" as "none" | "view" | "edit",
      selectedMembers: [] as IMembership[],
      loadingGrants: [] as number[], // the access grant ids
      loadingTeamPermission: false,
      teamPermissionError: null as Error | null,
    };
  },
  computed: {
    ...mapGetters(["isCloud", "workspace"]),
    ...mapState("data/connections", {
      connections: "items",
      loadingConnections: "loading",
    }),
    ...mapState("data/queries", { queries: "items" }),
    ...mapState("data/connectionFolders", { connectionFolders: "items" }),
    ...mapState("data/queryFolders", { queryFolders: "items" }),
    ...mapState("data/accessGrants", {
      accessGrants(state: DataState<IAccessGrant>) {
        return state.items.filter(
          (grant) =>
            grant.subjectId === this.subjectId &&
            grant.subjectType === this.subjectType
        );
      },
    }),
    ...mapState("data/memberships", {
      memberships(state: DataState<IMembership>) {
        return state.items
          .filter((member) => {
            const accessGrants: IAccessGrant[] = this.accessGrants;
            const subject: IShareable = this.subject;
            const isOwner = member.id === subject.membership.id;
            const isGranted = accessGrants.some(
              (grant) => grant.membership.id === member.id
            );
            return !isOwner && !isGranted;
          })
          .map((member) => ({
            ...member,
            searchable: member.name.toLowerCase() + member.email.toLowerCase(),
          }));
      },
    }),
    ...mapState("data/accessGrants", {
      accessGrantsError: "error",
    }),
    ...mapState("data/memberships", {
      loadingMemberships: "loading",
    }),
    rootBindings() {
      return [{ event: AppEvent.openShareModal, handler: this.open }];
    },
    items() {
      if (this.subjectType === "Connection") {
        return this.connections;
      }
      if (this.subjectType === "Query") {
        return this.queries;
      }
      if (this.subjectType === "ConnectionFolder") {
        return this.connectionFolders;
      }
      if (this.subjectType === "QueryFolder") {
        return this.queryFolders;
      }
      return [];
    },
    subject():
      | ISavedQuery
      | ICloudSavedConnection
      | IQueryFolder
      | IConnectionFolder
      | undefined {
      return this.items.find((i) => i.id === this.subjectId);
    },
    subjectModulePath(): string {
      switch (this.subjectType) {
        case "Connection":
          return "data/connections";
        case "Query":
          return "data/queries";
        case "ConnectionFolder":
          return "data/connectionFolders";
        case "QueryFolder":
          return "data/queryFolders";
        default:
          throw new Error(`Invalid subject type. Got "${this.subjectType}"`);
      }
    },
    teamPermission(): Permission {
      if (this.subject?.teamWrite) {
        return "edit";
      }
      if (this.subject?.teamRead) {
        return "view";
      }
      return "hidden";
    },
  },
  watch: {
    search() {
      this.loadMembershipsOnce();
    },
  },
  methods: {
    ...mapActions("data/accessGrants", {
      loadAccessGrants: "load",
      saveAccessGrants: "saveMany",
      saveAccessGrant: "save",
      removeAccessGrant: "remove",
    }),
    ...mapActions("data/memberships", {
      loadMemberships: "load",
    }),
    resetState() {
      this.subjectId = null;
      this.subjectType = null;
      this.membershipsLoaded = false;
      this.search = "";
      this.permission = "view";
      this.selectedMembers = [];
      this.loadingGrants = [];
      this.loadingTeamPermission = false;
      this.teamPermissionError = null;
    },
    async open(options: OpenShareModalOptions) {
      if (!this.isCloud) {
        return;
      }
      this.resetState();
      this.subjectId = options.subjectId;
      this.subjectType = options.subjectType;
      this.$modal.show("share-modal");
    },
    async handleOpened() {
      await this.loadAccessGrants({
        extraParams: {
          access_grant: {
            subject_type: this.subjectType,
            subject_id: this.subjectId,
          },
        },
      });
    },
    async loadMembershipsOnce() {
      if (!this.membershipsLoaded) {
        await this.loadMemberships();
        this.membershipsLoaded = true;
      }
    },
    handleMemberAdd(member: IMembership) {
      this.selectedMembers.push(member);
      this.search = "";
    },
    handleMemberRemove(member: IMembership) {
      const idx = this.selectedMembers.findIndex((m) => m.id === member.id);
      if (idx !== -1) {
        this.selectedMembers.splice(idx, 1);
      }
    },
    changeAccess(grant: IAccessGrant, permission: Permission) {
      if (this.grantToPermission(grant) === permission) {
        return; // nothing changed
      }

      this.tryAccess(grant.id, async () => {
        await this.saveAccessGrant({
          ...grant,
          ...this.permissionToGrant(permission),
        });
      });
    },
    removeAccess(grant: IAccessGrant) {
      this.tryAccess(grant.id, async () => {
        await this.removeAccessGrant(grant);
      });
    },
    async tryAccess(grantId: number, fn: Function) {
      this.loadingGrants.push(grantId);
      await this.$nextTick();
      try {
        await fn();
      } finally {
        this.loadingGrants = this.loadingGrants.filter((id) => id !== grantId);
      }
    },
    async changeTeamPermission(permission: Permission) {
      this.loadingTeamPermission = true;
      await this.$nextTick();
      try {
        this.teamPermissionError = null;
        const { canRead, canWrite } = this.permissionToGrant(permission);
        await this.$store.dispatch(`${this.subjectModulePath}/save`, {
          id: this.subject.id,
          teamRead: canRead,
          teamWrite: canWrite,
        });
      } catch (e) {
        this.teamPermissionError = e;
      } finally {
        this.loadingTeamPermission = false;
      }
    },
    async addSelectedMembers() {
      if (this.selectedMembers.length === 0) {
        return;
      }

      const selectedMembers: IMembership[] = this.selectedMembers;

      let canRead: boolean;
      let canWrite: boolean;

      if (this.permission === "none") {
        canRead = false;
        canWrite = false;
      } else if (this.permission === "view") {
        canRead = true;
        canWrite = false;
      } else if (this.permission === "edit") {
        canRead = true;
        canWrite = true;
      } else {
        throw new Error(`Invalid permission. Got "${this.permission}"`);
      }

      await this.saveAccessGrants({
        subjectId: this.subjectId,
        subjectType: this.subjectType,
        canRead,
        canWrite,
        memberships: selectedMembers,
      });

      this.selectedMembers = [];
    },
    permissionToGrant(permission: Permission): AccessGrantLike {
      if (permission === "edit") {
        return { canRead: true, canWrite: true };
      }
      if (permission === "view") {
        return { canRead: true, canWrite: false };
      }
      return { canRead: false, canWrite: false };
    },
    grantToPermission(grant: AccessGrantLike): Permission {
      if (grant.canWrite) {
        return "edit";
      }
      if (grant.canRead) {
        return "view";
      }
      return "hidden";
    },
    isItYou(membership: IMembership) {
      return membership.id === this.workspace.currentMembership.id;
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

<style scoped>
.search-members {
  display: flex;
  align-items: center;

  .input-wrapper {
    position: relative;
    flex-grow: 1;
    display: flex;
    border: 1px solid var(--border-color);
    border-radius: 4px;

    &::v-deep .multi-select {
      flex-grow: 1;
    }

    ::v-deep input {
      border: none;
      padding-right: 0;
      border-radius: 0;
    }

    select {
      align-self: flex-end;
      border: none;
    }
  }

  .add-btn {
    flex-shrink: 0;
    margin-left: 0.5rem;
    align-self: flex-end;
  }
}

.member-access {
  margin-top: 1rem;

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
}

.divider {
  border-bottom: 1px solid var(--border-color);
  margin-block: 1.25rem;
}

.access-grant {
  display: flex;
  align-items: center;

  .icon {
    width: 2rem;
    height: 2rem;
    background-color: rgb(from var(--theme-base) r g b / 10%);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    text-transform: uppercase;
  }

  .label {
    flex-shrink: 0;
    margin-inline: 1rem;
  }

  select {
    margin: 0;
    margin-left: auto;
  }

  .access {
    display: flex;
    align-items: center;
    margin-left: auto;
  }
}
</style>
