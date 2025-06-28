<template>
  <div class="table-properties">
    <div class="table-properties-header">
      <h1>
        <i class="material-icons">people</i>
        Users and Privileges
      </h1>
    </div>
    <div class="table-properties-divider"></div>

    <div class="table-properties-wrap">
      <user-list
        v-if="!selectedUser"
        :users="users"
        @user-selected="selectUser"
        @user-added="addUser"
      />
      <user-detail
        v-else
        :user="selectedUser"
        @back-to-list="updateSelectedUser(null)"
        @user-deleted="deleteUser"
        @user-updated="updateUser"
        @expire-password="expirePassword"
        @revoke-privileges="revokeAllPrivileges"
      />
    </div>
  </div>
</template>

<script>
import TabUserManagementUserList from './TabUserManagement_UserList.vue'
import TabUserManagementUser from './TabUserManagementUser.vue'
import { mapState, mapActions } from 'vuex'
import rawLog from "@bksLogger"

const log = rawLog.scope("TabUserManagement")

export default {
  computed: {
    ...mapState(['connection']),
    ...mapState('userManagement', ['users', 'selectedUser']),
  },
  components: {
    UserList: TabUserManagementUserList,
    UserDetail: TabUserManagementUser
  },
  props: {
    tab: Object,
    userId: String,
    active: Boolean
  },
  mounted() {
    if (!this.selectedUser) {
      this.$store.dispatch('userManagement/updateUsersList');
    }
  },
  methods: {
    ...mapActions('userManagement', ['updateSelectedUser']),
    selectUser(user) {
      this.updateSelectedUser(user);
    },
    async addUser(newUser) {
      try {
        newUser.isNew = true;
        this.updateSelectedUser(newUser);
        await this.$store.dispatch('userManagement/updateUsersList');
      } catch (error) {
        log.error('Failed to add user:', error);
        this.$noty.error(`Failed to add user: ${error.message}`);
      }
    },
    async deleteUser() {
      if (!this.selectedUser) return;
      try {
        await this.connection.deleteUser(this.selectedUser.user, this.selectedUser.host);
        this.$noty.success(`User ${this.selectedUser.user} deleted successfully`);
        this.$store.dispatch('userManagement/updateUsersList');
        this.$modal.hide('delete-user-modal');
        this.updateSelectedUser(null);
      } catch (error) {
        log.error('Failed to delete user:', error);
        this.$noty.error(`Failed to delete user: ${error.message}`);
      }
    },
    updateUser(updatedUser) {
      const index = this.users.findIndex(u => 
        u.user === updatedUser.user && 
        u.host === updatedUser.host
      );
      if (index !== -1) {
        this.users.splice(index, 1, updatedUser);
      }
    },
    async expirePassword(user) {
      try {
        await this.connection.expireUserPassword(user.user, user.host);
        this.$noty.success('Password expired. User will be forced to reset password at next login.');
        this.updateSelectedUser(null);
        
      } catch (error) {
        log.error('Failed to expire password:', error);
        this.$noty.error('Failed to expire password: ' + (error.message || error));
      }
    },
    async revokeAllPrivileges(user) {
      try {
        await this.connection.revokeAllPrivileges(user.user, user.host);
        this.$noty.success('All privileges revoked.');
        this.updateSelectedUser(null);

      } catch (error) {
        log.error('Failed to revoke privileges:', error);
        this.$noty.error('Failed to revoke privileges: ' + (error.message || error));
      }
    },
  }
}
</script>

<style scoped>

.table-properties-header {
  padding: 20px;
  flex-shrink: 0;
}

.table-properties-divider {
  height: 1px;
  background: var(--bk-border-color, #e0e0e0);
  margin: 0 20px;
  flex-shrink: 0;
}

</style>
