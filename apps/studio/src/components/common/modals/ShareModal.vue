<template>
  <base-modal name="share-modal" @opened="handleOpened">
    <template #title>{{ subject?.name || "Share" }}</template>
    <template v-if="subject">
      <div class="search-members">
        <div class="input-wrapper">
          <input type="text" name="search-members" placeholder="Search a member" />
          <select class="width-auto" value="canView">
            <option value="canView">can view</option>
            <option value="canRead">can read</option>
          </select>
        </div>
        <button class="btn btn-primary btn-icon" disabled>
          <i class="material-icons">add</i>
          Add
        </button>
      </div>

      <div class="member-access">
        <ul>
          <!-- OWNER -->
          <li class="access-grant">
            <div class="icon">{{ subject.user.name[0] }}</div>
            <div class="label">{{ subject.user.name }}</div>
            <div class="access">Owner</div>
          </li>
          <li class="access-grant" v-for="grant of accessGrants">
            <div class="icon">{{ grant.userName[0] }}</div>
            <div class="label">{{ grant.userName }}</div>
            <div class="access">
              <select class="width-auto" value="canView" v-if="subject.canManage">
                <option value="canView">can view</option>
                <option value="canRead">can read</option>
              </select>
              <template v-else>can view</template>
            </div>
          </li>
        </ul>
      </div>

      <div class="divider"></div>

      <div class="access-grant">
        <div class="icon">
          <i class="material-icons-outlined">people_alt</i>
        </div>
        <span class="label">Team access</span>
        <div class="access">
          <select class="width-auto" value="canView" v-if="subject.canManage">
            <option value="canView">can view</option>
            <option value="canRead">can read</option>
          </select>
          <template v-else>can view</template>
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
import { IShareable } from "@/common/interfaces/IShareable";
import { DataState } from "@/store/modules/data/DataModuleBase";
import { IAccessGrant } from "@/common/interfaces/IAccessGrant";

export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      options: null as OpenShareModalOptions | null,
    };
  },
  computed: {
    ...mapGetters(["isCloud"]),
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
          (i) =>
            i.subjectId === this.options.id &&
            i.subjectType === this.options.type
        );
      },
    }),
    rootBindings() {
      return [{ event: AppEvent.openShareModal, handler: this.open }];
    },
    items() {
      if (this.options?.type === "Connection") {
        return this.connections;
      }
      if (this.options?.type === "Query") {
        return this.queries;
      }
      if (this.options?.type === "ConnectionFolder") {
        return this.connectionFolders;
      }
      if (this.options?.type === "QueryFolder") {
        return this.queryFolders;
      }
      return [];
    },
    subject(): IShareable | undefined {
      return this.items.find((i) => i.id === this.options.id);
    },
  },
  methods: {
    ...mapActions("data/accessGrants", {
      loadAccessGrants: "load",
    }),
    async open(options: OpenShareModalOptions) {
      if (!this.isCloud) {
        return;
      }
      this.options = options;
      this.$modal.show("share-modal");
    },
    async handleOpened() {
      await this.$nextTick();
      await this.loadAccessGrants({
        extraParams: {
          access_grant: {
            subject_type: this.options.type,
            subject_id: this.options.id,
          },
        },
      });
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

    input {
      border: none;
      padding-right: 0;
      border-radius: 0;
    }

    select {
      border: none;
    }
  }

  >button {
    flex-shrink: 0;
    margin-left: 0.5rem;
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
    margin-left: auto;
  }
}
</style>
