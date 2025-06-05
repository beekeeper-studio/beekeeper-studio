<template>
  <div class="sidebar-user-management flex-col expand">
    <div class="sidebar-list">
      <div class="list-group">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div class="expand">
              User Management
            </div>
            <div class="actions">
              <x-button
                title="Settings and More Informations"
                @click="openSettingsTab"
              >
                <i class="material-icons">settings</i>
              </x-button>
            </div>
          </div>
        </div>
        <!-- Filter -->
        <div class="fixed user-filter">
          <div class="filter">
            <div class="filter-wrap">
              <input
                class="filter-input"
                type="text"
                placeholder="Filter"
                v-model="filterQuery"
              >
              <x-buttons class="filter-actions">
                <x-button
                  @click="clearFilter"
                  v-if="filterQuery"
                >
                  <i class="clear material-icons">cancel</i>
                </x-button>
              </x-buttons>
            </div>
          </div>
        </div>

        <nav class="list-body" ref="wrapper">
          <template v-if="filteredUsers.length">
            <user-management-list-item
              v-for="user in filteredUsers"
              :key="`${user.user}@${user.host}`"
              :item="user"
              :selected="selectedUser && selectedUser.user === user.user && selectedUser.host === user.host"
              @select="selectUser"
              @open="openUserTab"
              @all_settings="openAllSettingsTab"
              @rename="showRenameModal"
              @delete="showDeleteModal"
              @contextmenu.prevent="openContextMenu(user, $event)"
            />
          </template>
          <template v-else>
            <div style="padding: 24px; color: #888; text-align: center; font-size: 1em;">
              <i class="material-icons" style="font-size: 2em;">info</i>
              <div>No users found</div>
            </div>
          </template>
        </nav>
      </div>
    </div>

    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        name="user-options-modal"
        height="auto"
        :scrollable="true"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">Options</div>
          <ul>
            <li @click="openUserTab(selectedUser)">Open</li>
            <li @click="showRenameModal(selectedUser)">Rename</li>
            <li @click="showDeleteModal(selectedUser)">Delete</li>
            <li @click="exportUser(selectedUser)">Export</li>
          </ul>
        </div>
      </modal>

      <!-- Rename User Modal -->
      <modal
        class="vue-dialog beekeeper-modal"
        name="rename-user-modal"
        height="auto"
        :scrollable="true"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">Rename User</div>
          <div class="form-group">
            <label>New Username:</label>
            <input
              type="text"
              class="form-control"
              v-model="newUsername"
              placeholder="Enter new username"
              @keyup.enter="confirmRename"
            >
          </div>
          <div class="dialog-buttons">
            <button class="btn btn-flat" @click="$modal.hide('rename-user-modal')">Cancel</button>
            <button class="btn btn-primary" @click="confirmRename">Rename</button>
          </div>
        </div>
      </modal>

      <!-- Delete Confirmation Modal -->
      <modal
        class="vue-dialog beekeeper-modal"
        name="delete-user-modal"
        height="auto"
        :scrollable="true"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">Confirm Deletion</div>
          <p>Are you sure you want to delete user <strong>{{ selectedUser?.user }}</strong>?</p>
          <div class="dialog-buttons">
            <button class="btn btn-flat" @click="$modal.hide('delete-user-modal')">Cancel</button>
            <button class="btn btn-danger" @click="confirmDelete">Delete</button>
          </div>
        </div>
      </modal>
    </portal>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex'
import UserManagementListItem from './user_management_list/UserManagementListItem.vue';

export default {  
  components: {
    UserManagementListItem 
  },
  data() {
    return {
      filterQuery: '',
      newUsername: '',
      userToDelete: null
    };
  },
  computed: {
    ...mapState(['connection', 'users', 'selectedUser']),
    filteredUsers() {
      if (!this.filterQuery) return this.users;
      return this.users.filter(user =>
        user.user.includes(this.filterQuery) ||
        user.host.includes(this.filterQuery)
      );
    }
  },
  mounted() {
    this.$store.dispatch('updateUsersList');
  },
  methods: {
    ...mapActions(['updateSelectedUser']),
    openSettingsTab() {
      this.updateSelectedUser(null);
      this.$root.$emit('userManagementOpen');
    },
    selectUser(user) {
      this.updateSelectedUser(user);
    },
    openContextMenu(user, event) {
      this.updateSelectedUser(user);
      this.$modal.show('user-options-modal');
    },
    openUserTab(user) {
      this.updateSelectedUser(user);
      this.$root.$emit('userManagementOpen');
    },
    showRenameModal(user) {
      this.updateSelectedUser(user);
      this.newUsername = user.user;
      this.$modal.hide('user-options-modal');
      this.$modal.show('rename-user-modal');
    },
    showDeleteModal(user) {
      this.updateSelectedUser(user);
      this.$modal.hide('user-options-modal');
      this.$modal.show('delete-user-modal');
    },
    async confirmRename() {
      if (!this.selectedUser || !this.newUsername.trim()) return;
      try {
        await this.connection.renameUser(this.selectedUser.user, this.selectedUser.host, this.newUsername);
        this.$noty.success(`User ${this.selectedUser.user} renamed to ${this.newUsername}`);
        this.$store.dispatch('updateUsersList');
        this.$modal.hide('rename-user-modal');
        this.updateSelectedUser(null);
      } catch (error) {
        console.error('Failed to rename user:', error);
        this.$noty.error(`Failed to rename user: ${error.message}`);
      }
    },
    async confirmDelete() {
      if (!this.selectedUser) return;
      try {
        await this.connection.deleteUser(this.selectedUser.user, this.selectedUser.host);
        this.$noty.success(`User ${this.selectedUser.user} deleted successfully`);
        this.$store.dispatch('updateUsersList');
        this.$modal.hide('delete-user-modal');
        this.updateSelectedUser(null);
      } catch (error) {
        console.error('Failed to delete user:', error);
        this.$noty.error(`Failed to delete user: ${error.message}`);
      }
    },
    renameUser(user) {
      this.showRenameModal(user);
    },
    deleteUser(user) {
      this.showDeleteModal(user);
    },
    clearFilter() {
      this.filterQuery = '';
    },
    openAllSettingsTab() {
      this.updateSelectedUser(null);
      this.$root.$emit('userManagementOpen');    }
  }
};
</script>

<style scoped>
.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-flat {
  background: none;
  border: 1px solid #ddd;
}

.btn-primary {
  background-color: #4285f4;
  color: white;
  border: none;
}

.btn-danger {
  background-color: #ea4335;
  color: white;
  border: none;
}

.form-group {
  margin-bottom: 16px;
}

.form-control {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.dialog-content ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.dialog-content li {
  padding: 8px 16px;
  cursor: pointer;
}

.dialog-content li:hover {
  background-color: #f5f5f5;
}
</style>
