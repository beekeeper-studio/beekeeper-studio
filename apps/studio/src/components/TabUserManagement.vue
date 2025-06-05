<template>
  <div class="scrollable-tab-container">
    <div class="user-management-container">
      <div class="header">
        <h1><i class="material-icons">people</i> Users and Privileges</h1>
      </div>

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

export default {
  computed: {
    ...mapState(['connection', 'users', 'selectedUser']),
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
      this.$store.dispatch('updateUsersList');
    }
  },
  methods: {
    ...mapActions(['updateSelectedUser']),
    selectUser(user) {
      this.updateSelectedUser(user);
    },
    async addUser(newUser) {
      try {
        newUser.isNew = true;
        this.updateSelectedUser(newUser);
        await this.$store.dispatch('updateUsersList');
      } catch (error) {
        console.error('Failed to add user:', error);
        this.$noty.error(`Failed to add user: ${error.message}`);
      }
    },
    async deleteUser() {
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
        console.error('Failed to expire password:', error);
        this.$noty.error('Failed to expire password: ' + (error.message || error));
      }
    },
    async revokeAllPrivileges(user) {
      try {
        await this.connection.revokeAllPrivileges(user.user, user.host);
        this.$noty.success('All privileges revoked.');
        this.updateSelectedUser(null);

      } catch (error) {
        console.error('Failed to revoke privileges:', error);
        this.$noty.error('Failed to revoke privileges: ' + (error.message || error));
      }
    },
  }
}
</script>

<style scoped>
.scrollable-tab-container {
  height: 100%;
  overflow-y: auto;
  padding: 15px;
  background-color: #f5f7fa;
}

.user-management-container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  overflow: hidden;
}

.header {
  padding: 20px;
  background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
  color: white;
}

.header h1, .header h2 {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header h1 {
  font-size: 1.5em;
  margin-bottom: 5px;
}

.header h2 {
  font-size: 1.2em;
  margin-top: 0;
  font-weight: 400;
}
</style>
