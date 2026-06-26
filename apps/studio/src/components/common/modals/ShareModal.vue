<template>
  <base-modal name="share-modal" @opened="handleOpened">
    <template #title>
      <div>
        <div class="modal-title">
          <template v-if="subject">
            <i
              :data-subject-type="subject.type"
              class="material-icons subject-icon"
            >
              <template v-if="subject.type === 'Connection'">link</template>
              <template v-else-if="subject.type === 'Query'">code</template>
              <template v-else>folder</template>
            </i>
            <h2>
              {{ subject.type === "Query" ? subject.title : subject.name }}
            </h2>
          </template>
          <h2 v-else>Share</h2>
        </div>
        <div class="modal-subtitle">Share & Permissions</div>
      </div>
    </template>
    <template v-if="subject">
      <div class="member-access">
        <h3>Who has access</h3>

        <ul>
          <li class="access-grant">
            <div class="icon">
              <i class="material-icons-outlined">people_alt</i>
            </div>
            <div class="label">
              <span>Your team</span>
              <div class="hint" v-if="teamPermission === 'edit'">
                Your team has full editing access
              </div>
              <div class="hint" v-else-if="teamPermission === 'view'">
                Your team can view but not edit
              </div>
              <div class="hint" v-else-if="teamPermission === 'no-access'">
                Only team members that are listed below have access
              </div>
              <div
                class="hint error"
                v-if="teamPermissionError"
                v-text="teamPermissionError.userMessage"
              />
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
                <option value="no-access">No access</option>
              </select>
              <template v-else>
                <template v-if="teamPermission === 'view'">can view</template>
                <template v-else-if="teamPermission === 'edit'">
                  can edit
                </template>
                <template v-else>No access</template>
              </template>
            </div>
          </li>
          <li class="access-grant">
            <div class="icon">{{ getInitials(subject.membership.name) }}</div>
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
            <div class="icon">{{ getInitials(workspace.owner.name) }}</div>
            <div class="label">
              <span>{{ workspace.owner.name }}</span>
              <span v-if="isItYou(workspace.owner.id)"> (You)</span>
            </div>
            <div class="access">Admin</div>
          </li>
          <li
            class="access-grant"
            v-for="grant of accessGrants"
            :key="grant.id"
            :class="{
              highlight: highlightedMembers.includes(grant.membershipId),
            }"
          >
            <div class="icon">{{ getInitials(grant.membership.name) }}</div>
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
          <li v-if="initiallyLoadingGrants" class="access-grant skeleton">
            <div class="icon" />
            <div class="label" />
            <div class="access" />
          </li>
          <li v-if="initiallyLoadingGrants" class="access-grant skeleton">
            <div class="icon" />
            <div class="label" />
            <div class="access" />
          </li>
        </ul>
      </div>

      <div class="add-member-access" v-if="subject.canManage">
        <div class="search-members">
          <div class="form-group">
            <label for="share-modal-search-member">Add member access</label>
            <div class="input-wrapper">
              <multi-select
                input-id="share-modal-search-member"
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
import { IFolder } from "@/common/interfaces/IQueryFolder";
import rawLog from "@bksLogger";
import { CloudError } from "@/lib/cloud/ClientHelpers";

type Permission = "view" | "edit" | "no-access";
type AccessGrantLike = Pick<IAccessGrant, "canRead" | "canWrite">;
type Subject =
  | ({ type: "Connection" } & ICloudSavedConnection)
  | ({ type: "Query" } & ISavedQuery)
  | ({ type: "QueryFolder" | "ConnectionFolder" } & IFolder);

const log = rawLog.scope("ShareModal.vue");

export default Vue.extend({
  components: { BaseModal, MultiSelect, LoadingSpinner },
  data() {
    return {
      subjectId: null,
      subjectType: null,
      membershipsLoaded: false,
      search: "",
      permission: "view" as Permission,
      selectedMembers: [] as IMembership[],
      highlightedMembers: [] as number[], // the membership ids
      initiallyLoadingGrants: false,
      loadingGrants: [] as number[], // the access grant ids
      loadingTeamPermission: false,
      savingGrants: false,
      teamPermissionError: null as CloudError | null,
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
    subject(): Subject | null {
      const subject = this.items.find((i) => i.id === this.subjectId);
      if (!subject) {
        return null;
      }
      return { ...subject, type: this.subjectType };
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
      return "no-access";
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
      } catch (e) {
        log.error(e);
        this.$noty.error(e.userMessage);
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
      } catch (e) {
        log.error(e);
        this.$noty.error(e);
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
        log.error(e);
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
      } catch (e) {
        log.error(e);
        this.$noty.error(e);
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
      return "no-access";
    },
    isItYou(userId: number) {
      return userId === this.workspace.currentMembership.userId;
    },
    getInitials(name: string) {
      const [first, last] = name.split(" ");
      if (!last) {
        return first[0];
      }
      return first[0] + last[0];
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
.modal-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .subject-icon {
    font-size: 1rem;

    &[data-subject-type="Query"] {
      color: var(--brand-pink);
    }

    &[data-subject-type*="Folder"] {
      color: var(--text-lighter);
    }
  }
}

.modal-subtitle {
  font-size: 1rem;
  font-weight: normal;
  color: var(--text-light);
  font-size: 0.831rem;
  line-height: normal;
  margin-bottom: 0.25rem;
}

h3 {
  font-size: 0.831rem;
  text-transform: uppercase;
  font-weight: bold;
  margin: 0;
  margin-bottom: 0.25rem;
}

.member-access ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
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
    align-self: flex-start;
    font-size: 0.95rem;
    font-weight: 500;

    .material-icons-outlined {
      font-size: 1rem;
    }
  }

  .label {
    flex: 1;
    margin-inline: 1rem;
    color: rgb(from var(--theme-base) r g b / 77%);
  }

  .hint {
    font-size: 0.831rem;
    margin-top: 0.1rem;
    color: var(--text-light);

    &.error {
      color: var(--brand-danger);
    }
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
    flex-shrink: 0;

    /** Visually align the plain text. */
    &:not(:has(select)) {
      margin-right: 0.1rem;
    }
  }
}

.add-member-access {
  margin-bottom: 0.5rem;

  .search-members {
    display: flex;
    align-items: center;

    .form-group {
      flex-grow: 1;
      margin-bottom: 0;
    }

    .input-wrapper {
      position: relative;
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
