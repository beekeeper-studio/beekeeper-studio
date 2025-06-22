<template>
  <div class="bk-page-content">
    <div class="bk-header-row">
      <button class="btn btn-flat" @click="$emit('back-to-list')">
        <i class="material-icons">arrow_back</i> Back to Users
      </button>
      <h3 class="bk-title">
        <i class="material-icons">account_circle</i>
        Details for {{ displayUserName }}@{{ user.host }}
      </h3>
    </div>

    <div class="bk-tabs">
      <button 
        class="bk-tab" 
        :class="{ 'bk-tab-active': activeTab === 'login' }"
        @click="activeTab = 'login'"
      >
        <i class="material-icons">vpn_key</i> Login
      </button>
      <button 
        class="bk-tab" 
        :class="{ 'bk-tab-active': activeTab === 'limits' }"
        @click="activeTab = 'limits'"
      >
        <i class="material-icons">speed</i> Account Limits
      </button>
      <button 
        class="bk-tab" 
        :class="{ 'bk-tab-active': activeTab === 'privileges' }"
        @click="activeTab = 'privileges'"
      >
        <i class="material-icons">storage</i> Schema Privileges
      </button>
    </div>

    <div class="bk-card">
      <TabUserManagementUserLogin
        v-if="activeTab === 'login'"
        :localUser="localUser"
        :showPassword="showPassword"
        :showConfirmPassword="showConfirmPassword"
        :passwordsMatch="passwordsMatch"
        @toggle-password="togglePassword"
      />
      <TabUserManagementUserLimits
        v-if="activeTab === 'limits'"
        :localUser="localUser"
      />
      <TabUserManagementUserPrivileges
        v-if="activeTab === 'privileges'"
        :localUser="localUser"
        :allPrivileges="allPrivileges"
        :newSchema="newSchema"
        @edit-schema="editSchema"
        @select-all-privileges="selectAllPrivileges"
        @unselect-all-privileges="unselectAllPrivileges"
        @update-privilege="updatePrivilege"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <modal
        class="vue-dialog beekeeper-modal"
        name="delete-user-modal"
        height="auto"
        :scrollable="true"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">Confirm Deletion</div>
            <p>Are you sure you want to delete user <strong>{{ localUser?.user }}</strong>?</p>
          <div class="bk-dialog-actions">
            <button class="bk-btn bk-btn-flat" @click="$modal.hide('delete-user-modal')">Cancel</button>
            <button class="bk-btn bk-btn-danger" @click="confirmDelete">Delete</button>
          </div>
        </div>
      </modal>

    <!-- Apply Changes Confirmation Modal -->
    <modal
      class="vue-dialog beekeeper-modal"
      name="apply-changes-user-modal"
      height="auto"
      :scrollable="true"
    >
      <div class="dialog-content">
        <div class="dialog-c-title" style="font-weight: bold;">Apply Changes</div>
        <p style="margin: 24px 0 32px 0; font-size: 1.15em;">
          Are you sure you want to apply the changes to <strong>{{ localUser?.user }}</strong>?
        </p>
        <div class="bk-dialog-actions">
          <button class="btn btn-flat" @click="$modal.hide('apply-changes-user-modal')">Cancel</button>
          <button class="btn success" @click="confirmApply">Apply</button>
        </div>
      </div>
    </modal>

    <StatusBar :active="true">
      <div class="statusbar-actions flex-right">
        <button class="btn danger" @click="showDeleteModal()">
          <i class="material-icons">delete</i> Delete Account
        </button>
        <button
          class="btn"
          @click="expirePassword"
          v-if="!localUser.isNew"
        >
          <i class="material-icons">timer_off</i> Expire Password
        </button>
        <button
          class="btn"
          @click="revokeAllPrivileges"
          v-if="!localUser.isNew"
        >
          <i class="material-icons">block</i> Revoke All Privileges
        </button>
        <button class="btn" @click="revertChanges">
          <i class="material-icons">undo</i> Revert Changes
        </button>
        <button class="btn success" @click="showApplyModal()">
          <i class="material-icons">check</i> Apply Changes
        </button>
      </div>
    </StatusBar>
  </div>
</template>

<script lang="ts">
import { mapState, mapMutations } from 'vuex'
import rawLog from "@bksLogger"
import TabUserManagementUserLogin from './TabUserManagementUserLogin.vue'
import TabUserManagementUserLimits from './TabUserManagementUserLimits.vue'
import TabUserManagementUserPrivileges from './TabUserManagementUserPrivileges.vue'
import StatusBar from '@/components/common/StatusBar.vue'

const log = rawLog.scope("TabUserManagementUser")

export enum UserChangeType {
  CREATE = 'CREATE',
  UPDATE_USER_HOST = 'UPDATE_USER_HOST',
  UPDATE_AUTH = 'UPDATE_AUTH',
  UPDATE_LIMITS = 'UPDATE_LIMITS',
  UPDATE_PRIVILEGES = 'UPDATE_PRIVILEGES'
}

export interface UserChange {
  type: UserChangeType;
  user: string;
  host: string;
  password?: string;
  authType?: string;
  oldUser?: string;
  oldHost?: string;
  maxQueries?: number;
  maxUpdates?: number;
  maxConnections?: number;
  maxUserConnections?: number;
  schemaName?: string;
  schemaHost?: string;
  schemas?: UserSchema[];
}

export interface UserSchemaPrivileges {
  [privilege: string]: boolean;
}

export interface UserSchema {
  name: string;
  host?: string;
  privileges: UserSchemaPrivileges;
}

export default {
  props: {
    user: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      localUser: { 
        ...this.user,
        schemas: this.user.schemas || []
      },
      backupDetails: {
        authType: '',
        maxQueries: 0,
        maxUpdates: 0,
        maxConnections: 0,
        maxUserConnections: 0,
      },
      allPrivileges: [],
      newSchema: {
        name: '',
        host: '%',
        privileges: {}
      },
      showPassword: false,
      showConfirmPassword: false,
      activeTab: 'login'
    }
  },
  created() {
    this.resetNewSchemaPrivileges();
  },
  computed: {
    ...mapState(['connection', 'selectedUser']),
    displayUserName() {
      return this.localUser?.user || 'anonymous'
    },
    passwordsMatch() {
      return (
        this.localUser.password &&
        this.localUser.confirmPassword &&
        this.localUser.password === this.localUser.confirmPassword
      );
    },
  },
  methods: {
      ...mapMutations(['setSelectedUser']),
      
      editSchema(index) {
        const schema = this.localUser.schemas[index];
        this.newSchema = {
          name: schema.name,
          host: schema.host,
          privileges: { ...schema.privileges }
        };
      },
  
      showDeleteModal() {
        this.$modal.show('delete-user-modal');
      },

    async getAccountDetails() {
      try {
        const authDetails = await this.connection.getUserAuthenticationDetails(this.localUser.user, this.localUser.host);
        this.localUser.authType = authDetails.authenticationType || 'caching_sha2_password';
        this.localUser.encryptedPassword = authDetails.authenticationString || '';
        this.backupDetails.authType = this.localUser.authType;
        this.$forceUpdate();
      } catch (error) {
        log.error('Error obtaining User Details:', error);
      }
    },

    async getUserResourceLimits() {
      try {
        const limits = await this.connection.getUserResourceLimits(this.localUser.user, this.localUser.host);
        
        this.localUser.maxQueries = limits.maxQuestions || 0;
        this.localUser.maxUpdates = limits.maxUpdates || 0;
        this.localUser.maxConnections = limits.maxConnections || 0;
        this.localUser.maxUserConnections = limits.maxUserConnections || 0;
        this.backupDetails.maxQueries = this.localUser.maxQueries || 0;
        this.backupDetails.maxUpdates = this.localUser.maxUpdates || 0;
        this.backupDetails.maxConnections = this.localUser.maxConnections || 0;
        this.backupDetails.maxUserConnections = this.localUser.maxUserConnections || 0;

      } catch (error) {
        log.error('Error obtaning User Limits:', error);
      }
    },

    async getUserGrants() {
      try {
        if (this.localUser.isNew) {
          return [];
        }

        const grants = await this.connection.showGrantsForUser(this.user.user, this.user.host);

        const privilegeNames = new Set();
        
        grants.forEach(grant => {
          Object.keys(grant).forEach(key => {
            if (!key.match(/schema|host|grantOptionPrivilege/i)) {
              const privName = key.replace(/Privilege$/i, '')
                                .replace(/([A-Z])/g, ' $1')  
                                .replace(/_/g, ' ')
                                .trim()
                                .toUpperCase();
              privilegeNames.add(privName);
            }
          });
        });
        
        if (grants.some(g => g.grantOptionPrivilege)) {
          privilegeNames.add('GRANT OPTION');
        }
        
        this.allPrivileges = Array.from(privilegeNames).sort();
        
        const schemaGrantsMap = {};
        
        grants.forEach(grant => {
          const schemaName = grant.schema;
          const host = grant.host || this.localUser.host || '%';
          
          if (!schemaGrantsMap[schemaName]) {
            schemaGrantsMap[schemaName] = {
              name: schemaName,
              host: host,
              privileges: this.createEmptyPrivileges()
            };
          }
          
          Object.keys(grant).forEach(key => {
            if (!key.match(/schema|host|grantOptionPrivilege/i)) {
              const privName = key.replace(/Privilege$/i, '')
                                .replace(/([A-Z])/g, ' $1')
                                .replace(/_/g, ' ')
                                .trim()
                                .toUpperCase();
              if (this.allPrivileges.includes(privName)) {
                schemaGrantsMap[schemaName].privileges[privName] = grant[key] || false;
              }
            }
          });
          
          if (grant.grantOptionPrivilege) {
            schemaGrantsMap[schemaName].privileges['GRANT OPTION'] = grant.grantOptionPrivilege;
          }
        });
        
        return Object.values(schemaGrantsMap);

      } catch (error) {
        log.error('Error obtaining User Grants:', error);
      }
    },

    createEmptyPrivileges() {
     const emptyPrivs = {};
      this.allPrivileges.forEach(priv => {
        emptyPrivs[priv] = false;
      });
      return emptyPrivs;
    },

    resetNewSchemaPrivileges() {
      this.newSchema.privileges = this.createEmptyPrivileges();
    },

    togglePassword(field) {
      if (field === 'password') {
        this.showPassword = !this.showPassword;
      } else {
        this.showConfirmPassword = !this.showConfirmPassword;
      }
    },

    deleteAccount() {
      this.$emit('user-deleted', this.localUser);
    },

    expirePassword() {
      this.$emit('expire-password', this.localUser);
    },

    revokeAllPrivileges() {
      this.$emit('revoke-privileges', this.localUser);
    },

    async revertChanges() {
      if (this.localUser.isNew) {
        this.localUser = { 
          ...this.user,
          schemas: this.user.schemas || []
        };
        return;
      }

      const [details, limits] = await Promise.all([
        this.connection.getUserAuthenticationDetails(this.user.user, this.user.host),
        this.connection.getUserResourceLimits(this.user.user, this.user.host)
      ]);

      this.localUser = {
        ...this.user,
        authType: details.authenticationType || 'caching_sha2_password',
        encryptedPassword: details.authenticationString || '',
        maxQueries: limits.maxQuestions || 0,
        maxUpdates: limits.maxUpdates || 0,
        maxConnections: limits.maxConnections || 0,
        maxUserConnections: limits.maxUserConnections || 0,
        schemas: await this.getUserGrants()
      };
    },

    async loadUserGrants() {
      try {
        const grants = await this.getUserGrants();
        this.localUser.schemas = grants;
      } catch (error) {
        log.error('Failed to load user grants:', error);
      }
    },
    async applyChanges() {
      if (this.localUser.password && !this.passwordsMatch) {
        this.$noty.error('Password and confirmation do not match.');
        return;
      }
      const changes: UserChange[] = [];

      if (this.localUser.isNew) {
        // New User Creation - [0, user, host, password, authType]
        changes.push({
          type: UserChangeType.CREATE,
          user: this.localUser.user,
          host: this.localUser.host,
          password: this.localUser.password,
          authType: this.localUser.authType,
        });
      } else {

        // UserName or Host Changes - [1, oldUserName, newUser, oldHost, newHost]
        if (this.localUser.user !== this.user.user || this.localUser.host !== this.user.host) {
          changes.push({
            type: UserChangeType.UPDATE_USER_HOST,
            oldUser: this.user.user,
            user: this.localUser.user,
            oldHost: this.user.host,
            host: this.localUser.host,
          });
        }
        
        // Authentication Type and Password Changes - [2, user, host, newPassword, newAuthType]
        if ((this.localUser.password && this.localUser.password !== undefined) || 
        this.localUser.authType !== this.backupDetails.authType) { 
          changes.push({
            type: UserChangeType.UPDATE_AUTH,
            user: this.localUser.user,
            host: this.localUser.host,
            password: this.localUser.password,
            authType: this.localUser.authType,
          }); 
        }
    }
      // Account Limits Changes - [3, user, host, maxQueries, maxUpdates, maxConnections, maxUserConnections]
      if (
        this.localUser.maxQueries !== this.backupDetails.maxQueries ||
        this.localUser.maxUpdates !== this.backupDetails.maxUpdates ||
        this.localUser.maxConnections !== this.backupDetails.maxConnections ||
        this.localUser.maxUserConnections !== this.backupDetails.maxUserConnections
      ) {
        changes.push({
          type: UserChangeType.UPDATE_LIMITS,
          user: this.localUser.user,
          host: this.localUser.host,
          maxQueries: this.localUser.maxQueries ?? 0,
          maxUpdates: this.localUser.maxUpdates ?? 0,
          maxConnections: this.localUser.maxConnections ?? 0,
          maxUserConnections: this.localUser.maxUserConnections ?? 0,
        }); 
      }

      // Schema Privileges Changes - [4, user, UserSchema[]]
      const schemaChanges: UserSchema[] = [];

      const currentSchemasMap = new Map<string, UserSchema>(
        this.localUser.schemas.map(schema => [`${schema.name}@${schema.host || '%'}`, schema])
      );
      const originalSchemasArray = await this.getUserGrants();
      const originalSchemasMap = new Map(
        originalSchemasArray.map(schema => [`${schema.name}@${schema.host || '%'}`, schema])
      );

      for (const [key, currentSchema] of currentSchemasMap.entries()) {
        const originalSchema = originalSchemasMap.get(key);

        if (!originalSchema) {
          schemaChanges.push({
            name: currentSchema.name,
            host: currentSchema.host || '%',
            privileges: Object.fromEntries(
              Object.entries(currentSchema.privileges).map(([priv]) => [priv, false])
            ),
          });
        } else {
          const privilegesChanged = Object.keys(currentSchema.privileges).some(priv => {
            return currentSchema.privileges[priv] !== (originalSchema as UserSchema).privileges[priv];
          });

          if (privilegesChanged) {
            schemaChanges.push({
              name: currentSchema.name,
              host: currentSchema.host || '%',
              privileges: Object.fromEntries(
                Object.entries(currentSchema.privileges).map(([priv]) => [priv, currentSchema.privileges[priv]])
              ),
            });
          }
        }
      }

      if (schemaChanges.length > 0) {
        changes.push({
          type: UserChangeType.UPDATE_PRIVILEGES,
          user: this.localUser.user,
          host: this.localUser.host,
          schemas: schemaChanges,
        });
      }

      if (changes.length === 0) {
        this.$noty.info('No changes to apply.');
        return;
      }

      const result = await this.connection.applyUserChanges(changes);

      if (result.success) {
        this.$emit('user-updated', this.localUser);
        if (this.localUser.isNew) {
          this.$noty.success(`User ${this.localUser.user} created successfully.`);
          this.localUser.isNew = false;

          await this.getAccountDetails();
          await this.getUserResourceLimits();
          await this.loadUserGrants();
        } else {
          this.$noty.success(`User changes applied successfully.`);
        }

        this.$store.dispatch('updateSelectedUser', this.localUser);
        this.$store.dispatch('updateUsersList');
      
      } else {
        if (this.localUser.isNew) {
          this.$noty.error(`Failed to create user`);
        } else {
          this.$noty.error(`Failed to update user`);
        }
      }
    },
    selectAllPrivileges() {
      this.allPrivileges.forEach(priv => {
        this.updatePrivilege(priv, true);
      });
    },
    
    unselectAllPrivileges() {
      this.allPrivileges.forEach(priv => {
        this.updatePrivilege(priv, false);
      });
    },
    
    updatePrivilege(privilege, value) {
      this.$set(this.newSchema.privileges, privilege, value); 
      const schemaIndex = this.localUser.schemas.findIndex(
        schema => schema.name === this.newSchema.name && schema.host === this.newSchema.host
      );
      if (schemaIndex !== -1) {
        this.$set(this.localUser.schemas[schemaIndex].privileges, privilege, value);
      }
    },

    async confirmDelete() {
      if (!this.localUser) return;
      try {
        await this.connection.deleteUser(this.localUser.user, this.localUser.host);
        this.$noty.success(`User ${this.localUser.user} deleted successfully`);
        this.$store.dispatch('updateUsersList');
        this.$modal.hide('delete-user-modal');
        this.setSelectedUser(null);
      } catch (error) {
        log.error('Failed to delete user:', error);
        this.$noty.error(`Failed to delete user: ${error.message}`);
      }
    },
    showApplyModal() {
      this.$modal.show('apply-changes-user-modal');
    },
    async confirmApply() {
      if (!this.localUser) return;
      try {
        await this.applyChanges();
        this.$modal.hide('apply-changes-user-modal');
        this.setSelectedUser(null);
      } catch (error) {
        log.error('Failed to apply changes:', error);
        this.$noty.error(`Failed to apply changes: ${error.message}`);
      }
    },
  },
  watch: {
    selectedUser: {
      immediate: true,
      handler(newVal) {
        if (!newVal) return;

        this.localUser = { 
          ...newVal
        };

        this.loadUserGrants();

        if (!this.localUser.isNew) {
          this.getAccountDetails();
          this.getUserResourceLimits();
        }
      }
    }
  },
  mounted() {
    this.loadUserGrants();  
  
    if (!this.localUser.isNew) { 
      this.getAccountDetails();
      this.getUserResourceLimits();
    }
  },
  components: {
    TabUserManagementUserLogin,
    TabUserManagementUserLimits,
    TabUserManagementUserPrivileges,
    StatusBar,
  },
}
</script>

<style>

.bk-page-content {
  padding: 24px;
}

.bk-header-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.bk-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.bk-tabs {
  display: flex;
  border-bottom: 1px solid var(--bk-border-color, #e0e0e0);
  margin-bottom: 24px;
}

.bk-tab {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--bk-text-secondary, #555);
  font-weight: 500;
  transition: color 0.2s, border-bottom-color 0.2s;
}

.bk-tab:hover {
  color: var(--bk-primary, #333);
  background-color: var(--bk-bg-hover, #f8f9fa);
}

.bk-tab-active {
  color: var(--bk-primary, #333);
  border-bottom-color: var(--bk-primary, #333);
}

.bk-card {
  background: var(--bk-bg-card, #fff);
  border-radius: 8px;
  border: 1px solid var(--bk-border-color, #e0e0e0);
  padding: 24px;
  margin-bottom: 24px;
}

.statusbar-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  padding: 0 16px;
}
.flex-right {
  justify-content: flex-end;
}

.btn {
  padding: 8px 18px;
  border: none;
  border-radius: 4px;
  background: #eee;
  color: #333;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s, color 0.2s;
}

.btn.danger {
  background: #e53935;
  color: #fff;
}

.btn.success {
  background: #43a047;
  color: #fff;
}

.btn.btn-flat {
  background: transparent;
  color: #4285f4;
}

.btn:hover {
  background: #e0e0e0;
}

.btn.danger:hover {
  background: #b71c1c;
}

.btn.success:hover {
  background: #2e7031;
}

.bk-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

</style>
