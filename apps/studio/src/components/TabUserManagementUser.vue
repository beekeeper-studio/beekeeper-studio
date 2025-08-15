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

    <div class="bk-card">
      <div class="table-properties">
        <div class="table-properties-header">
          <div class="nav-pills">
            <a
              v-for="pill in pills"
              :key="pill.id"
              class="nav-pill"
              :class="{active: pill.id === activePill}"
              @click.prevent="activePill = pill.id"
            >
              <i class="material-icons" style="margin-right: 6px;">{{ pill.icon }}</i>
              {{ pill.name }}
            </a>
          </div>
        </div>
        <div class="table-properties-wrap">
          <component
            :is="activePillComponent"
            :local-user="localUser"
            :all-privileges="allPrivileges"
            :new-schema="newSchema"
            :show-password="showPassword"
            :show-confirm-password="showConfirmPassword"
            :passwords-match="passwordsMatch"
            @update="onUpdate"
            @toggle-password="togglePassword('password')"
            @toggle-confirm-password="togglePassword('confirmPassword')"
            @edit-schema="editSchema"
            @select-all-privileges="selectAllPrivileges"
            @unselect-all-privileges="unselectAllPrivileges"
            @update-privilege="updatePrivilege"
          />
        </div>
      </div>
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
      <div class="flex flex-middle statusbar-actions">
        <x-buttons>
          <x-button class="btn btn-flat danger" @click="showDeleteModal()">
            <i class="material-icons">delete</i> Delete Account
          </x-button>
          <x-button class="btn btn-flat" @click="expirePassword" v-if="!localUser.isNew">
            <i class="material-icons">timer_off</i> Expire Password
          </x-button>
          <x-button class="btn btn-flat" @click="revokeAllPrivileges" v-if="!localUser.isNew">
            <i class="material-icons">block</i> Revoke All Privileges
          </x-button>
          <x-button class="btn btn-flat" @click="revertChanges">
            <i class="material-icons">undo</i> Revert Changes
          </x-button>
          <x-button class="btn btn-flat success" @click="showApplyModal()">
            <i class="material-icons">check</i> Apply Changes
          </x-button>
        </x-buttons>
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
import { UserChangeType, UserChange, UserSchema, UserSchemaPrivileges } from '@/lib/db/models'

const log = rawLog.scope("TabUserManagementUser")

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
      activeTab: 'login',
      pills: [
        { id: 'login', name: 'Login', icon: 'vpn_key', component: TabUserManagementUserLogin },
        { id: 'limits', name: 'Account Limits', icon: 'speed', component: TabUserManagementUserLimits },
        { id: 'privileges', name: 'Schema Privileges', icon: 'list_alt', component: TabUserManagementUserPrivileges },
      ],
      activePill: 'login',
    }
  },
  created() {
    this.resetNewSchemaPrivileges();
  },
  computed: {
    ...mapState(['connection']),
    ...mapState('userManagement', ['selectedUser']),
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
    activePillComponent() {
      const pill = this.pills.find(p => p.id === this.activePill)
      return pill ? pill.component : null
    }
  },
  methods: {
      ...mapMutations('userManagement', ['setSelectedUser']),
      
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
              const privName = this.formatPrivilegeName(key);
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
              const privName = this.formatPrivilegeName(key);
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

      try {
        await this.connection.applyUserChanges(changes);
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
        this.$store.dispatch('userManagement/updateSelectedUser', this.localUser);
        this.$store.dispatch('userManagement/updateUsersList');
      } catch (error) {
        if (this.localUser.isNew) {
          this.$noty.error(`Failed to create user`);
        } else {
          this.$noty.error(`Failed to update user`);
        }
      }
    },
    selectAllPrivileges() {
      this.allPrivileges.forEach(priv => {
        this.updatePrivilege({ privilege: priv, value: true });
      });
    },
    
    unselectAllPrivileges() {
      this.allPrivileges.forEach(priv => {
        this.updatePrivilege({ privilege: priv, value: false });
      });
    },
    
    updatePrivilege({ privilege, value }) {
      this.$set(this.newSchema.privileges, privilege, value);

      const schemaIndex = this.localUser.schemas.findIndex(
        schema => schema.name === this.newSchema.name && schema.host === this.newSchema.host
      );

      if (schemaIndex !== -1) {
        const updatedPrivileges = { ...this.localUser.schemas[schemaIndex].privileges, [privilege]: value };
        this.$set(this.localUser.schemas[schemaIndex], 'privileges', updatedPrivileges);
      }
    },

    async confirmDelete() {
      if (!this.localUser) return;
      try {
        await this.connection.deleteUser(this.localUser.user, this.localUser.host);
        this.$noty.success(`User ${this.localUser.user} deleted successfully`);
        this.$store.dispatch('userManagement/updateUsersList');
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
    onUpdate(payload) {
      this.$emit('update', payload)
    },
    formatPrivilegeName(key) {
      return key
        .replace(/Privilege$/i, '')
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .trim()
        .toUpperCase();
    }
  },
  watch: {
    selectedUser: {
      immediate: true,
      handler(newVal) {
        if (!newVal) return;

        this.localUser = { 
          ...newVal
        };
        
        this.activePill = 'login';
        
        // Necessary for when we are editing privileges and then change user
        this.newSchema = {
          name: '',
          host: '%',
          privileges: {}
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

.btn.success:hover {
  background: var(--bk-btn-success-hover, #2e7031);
}

.bk-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}

/* Temporary fix for the same height as the connection button on the left (RodrigoPerestrelo) */
.statusbar-actions x-button{
  min-height: 40px;
  box-sizing: border-box;
}

</style>
