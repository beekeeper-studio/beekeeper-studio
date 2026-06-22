<template>
  <base-modal name="share-modal" @opened="handleOpened">
    <template #title>{{ subject?.name || subject?.title || "Share" }}</template>
    <template v-if="subject">
      <div class="search-members" v-if="subject.canManage">
        <div class="input-wrapper">
          <multi-select
            ref="search"
            placeholder="Search a member"
            v-model="search"
            filter-key="searchable"
            display-key="name"
            hint-key="email"
            :suggestions="memberships"
            :selected-options="selectedMembers"
            @item-add="handleMemberAdd"
            @item-remove="handleMemberRemove"
            @open="loadMembershipsOnce"
            @keyup.esc.stop
            @keydown.esc.stop
          >
            <template #empty-state v-if="loadingMemberships">
              Loading ...
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
          :disabled="selectedMembers.length === 0 || savingGrants"
          @click="addSelectedMembers"
        >
          <i class="material-icons">add</i>
          Add
        </button>
      </div>

      <div class="member-access">
        <h3>Who has access</h3>
        <ul>
          <li class="access-grant">
            <div class="icon">
              <i class="material-icons-outlined">people_alt</i>
            </div>
            <div class="label">
              <span>Your team</span>
              <div class="hint" v-if="teamPermission === 'restricted'">
                Access is restricted to members listed below.
              </div>
            </div>
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
                <option value="restricted">restricted</option>
              </select>
              <template v-else>
                <template v-if="teamPermission === 'view'">can view</template>
                <template v-else-if="teamPermission === 'edit'">
                  can edit
                </template>
                <template v-else>restricted</template>
              </template>
            </div>
          </li>
          <li class="access-grant">
            <div class="icon">{{ subject.membership.name[0] }}</div>
            <div class="label">
              <span>{{ subject.membership.name }}</span>
              <span v-if="isItYou(subject.membership.userId)"> (You)</span>
            </div>
            <div class="access">Owner</div>
          </li>
          <!-- We don't want to show admin if it's the same user as the owner -->
          <li
            class="access-grant"
            v-if="subject.membership.userId !== workspace.owner.id"
          >
            <div class="icon">{{ workspace.owner.name[0] }}</div>
            <div class="label">
              <span>{{ workspace.owner.name }}</span>
              <span v-if="isItYou(workspace.owner.id)"> (You)</span>
            </div>
            <div class="access">Admin</div>
          </li>
          <li v-if="initiallyLoadingGrants" class="access-grant skeleton">
            <div class="icon" />
            <div class="label" />
            <div class="access" />
          </li>
          <li
            class="access-grant"
            v-for="grant of accessGrants"
            :key="grant.id"
            :class="{
              highlight: highlightedMembers.includes(grant.membershipId),
            }"
          >
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
import { DataState } from "@/store/modules/data/DataModuleBase";
import { IAccessGrant } from "@/common/interfaces/IAccessGrant";
import { IMembership } from "@/common/interfaces/IMembership";
import MultiSelect from "@/components/common/form/MultiSelect.vue";
import _ from "lodash";
import LoadingSpinner from "@/components/common/loading/LoadingSpinner.vue";
import ISavedQuery from "@/common/interfaces/ISavedQuery";
import { ICloudSavedConnection } from "@/common/interfaces/IConnection";
import {
  IQueryFolder,
  IConnectionFolder,
} from "@/common/interfaces/IQueryFolder";

type Permission = "view" | "edit" | "restricted";
type AccessGrantLike = Pick<IAccessGrant, "canRead" | "canWrite">;
type Subject =
  | ISavedQuery
  | ICloudSavedConnection
  | IQueryFolder
  | IConnectionFolder;

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
      highlightedMembers: [] as number[], // the membership ids
      initiallyLoadingGrants: false,
      loadingGrants: [] as number[], // the access grant ids
      loadingTeamPermission: false,
      savingGrants: false,
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
            const subject: Subject = this.subject;
            const isOwner = member.id === subject.membership.id;
            const isGranted = accessGrants.some(
              (grant) => grant.membershipId === member.id
            );
            const isAdmin = member.userId === this.workspace.owner.id;
            return !isOwner && !isGranted && !isAdmin;
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
    subject(): Subject | undefined {
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
      return "restricted";
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
      this.highlightedMembers = [];
      this.initiallyLoadingGrants = false;
      this.loadingGrants = [];
      this.loadingTeamPermission = false;
      this.savingGrants = false;
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
      this.$refs.search.$el.querySelector("input").focus();

      this.initiallyLoadingGrants = true;
      await this.$nextTick();
      try {
        await this.loadAccessGrants({
          extraParams: {
            access_grant: {
              subject_type: this.subjectType,
              subject_id: this.subjectId,
            },
          },
        });
      } finally {
        this.initiallyLoadingGrants = false;
      }
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

      try {
        this.savingGrants = true;
        await this.saveAccessGrants({
          subjectId: this.subjectId,
          subjectType: this.subjectType,
          canRead,
          canWrite,
          memberships: selectedMembers,
        });
        this.highlightedMembers = selectedMembers.map((m) => m.id);
        this.selectedMembers = [];
      } finally {
        this.savingGrants = false;
      }
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
      return "restricted";
    },
    isItYou(userId: number) {
      return userId === this.workspace.currentMembership.userId;
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
  margin-bottom: 1rem;

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

    .member {
      display: flex;
      justify-content: space-between;
    }

    select {
      align-self: flex-end;
      border: none;
      position: absolute;
      right: 0;
    }
  }

  .add-btn {
    flex-shrink: 0;
    margin-left: 0.5rem;
    align-self: flex-end;
  }
}

h3 {
  font-size: 1rem;
  margin: 0;
}

.member-access {
  ul {
    list-style: none;
    margin: 0;
    margin-top: 0.25rem;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
}

.divider {
  border-bottom: 1px solid var(--border-color);
  margin-block: 1.25rem;
}

.access-grant {
  display: flex;
  align-items: center;
  padding-block: 0.5rem;

  &.highlight {
    animation: highlightFadeOut 2s ease-out forwards;
  }

  &.skeleton {
    .label {
      background-color: rgb(from var(--theme-base) r g b / 10%);
      width: 20ch;
      height: 1rem;
      border-radius: 4px;
    }

    .access {
      background-color: rgb(from var(--theme-base) r g b / 10%);
      width: 5ch;
      height: 1rem;
      border-radius: 4px;
    }
  }

  .icon {
    width: 2rem;
    height: 2rem;
    background-color: rgb(from var(--theme-base) r g b / 10%);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    text-transform: uppercase;

    .material-icons-outlined {
      font-size: 1rem;
    }
  }

  .label {
    flex-shrink: 0;
    margin-inline: 1rem;
  }

  .hint {
    margin-top: 0.1rem;
    color: var(--text-light);
  }

  select {
    margin: 0;
    margin-left: auto;
  }

  .access {
    display: flex;
    align-items: center;
    margin-left: auto;
    font-size: 0.875rem;

    /** Visually align the select and the plain text. */
    &:not(:has(select)) {
      margin-right: 0.1rem;
    }
  }
}

@keyframes highlightFadeOut {
  0% {
    background-color: rgb(from var(--theme-primary) r g b / 10%);
  }

  /* Holds the solid 10% highlight for the first 30% of the animation time */
  30% {
    background-color: rgb(from var(--theme-primary) r g b / 10%);
  }

  /* Smoothly fades out to 0% (transparent) over the remaining 70% of the time */
  100% {
    background-color: rgb(from var(--theme-primary) r g b / 0%);
  }
}
</style>
