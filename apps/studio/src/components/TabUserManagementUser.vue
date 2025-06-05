<template>
  <div class="user-detail-view">
    <div class="detail-header">
      <button class="btn back-button" @click="$emit('back-to-list')">
        <i class="material-icons">arrow_back</i> Back to Users
      </button>
      <h3>
        <i class="material-icons">account_circle</i>
        Details for {{ displayUserName }}@{{ user.host }}
      </h3>
    </div>

    <div class="subsection-tabs">
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'login' }"
        @click="activeTab = 'login'"
      >
        <i class="material-icons">vpn_key</i> Login
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'limits' }"
        @click="activeTab = 'limits'"
      >
        <i class="material-icons">speed</i> Account Limits
      </button>
      <button 
        class="tab-button" 
        :class="{ active: activeTab === 'privileges' }"
        @click="activeTab = 'privileges'"
      >
        <i class="material-icons">storage</i> Schema Privileges
      </button>
    </div>

    <div class="detail-card">
      <!-- Login Information Tab -->
      <div v-if="activeTab === 'login'" class="detail-section">
        <h4><i class="material-icons">vpn_key</i> Login Information</h4>
        <div class="form-group">
          <label>Login Name:</label>
          <input
            type="text"
            v-model="localUser.user"
            class="form-control"
            placeholder="Enter username"
          />
          <div class="form-note">
            <i class="material-icons">info</i>
            You may create multiple accounts with I to connect from different hosts.
          </div>
        </div>
        <div class="form-group">
          <label>Authentication Type:</label>
          <select v-model="localUser.authType" class="form-control">
            <option>caching_sha2_password</option> 
            <option>sha256_password</option>
          </select>
          <div class="form-note">
            <i class="material-icons">info</i>
            For the standard password select 'caching_sha2_password'.
          </div>
        </div>
        <div class="form-group">
          <label>Limit to Hosts Matching:</label>
          <input
            type="text"
            v-model="localUser.host"
            class="form-control"
            placeholder="e.g. 127.0.0.1"
          >
          <div class="form-note">
            <i class="material-icons">info</i>
            % and _ wildcards may be used
          </div>
        </div>

        <h4 style="margin-top: 25px;"><i class="material-icons">lock</i> Password Management</h4>
        <div class="form-group">
          <label>Password:</label>
          <div class="password-input">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="localUser.password"
              class="form-control"
              placeholder="••••••••"
            >
            <button class="btn-icon" @click="togglePassword('password')" title="Toggle visibility">
              <i class="material-icons">{{ showPassword ? 'visibility_off' : 'visibility' }}</i>
            </button>
          </div>
          <div class="form-note">
            <i class="material-icons">info</i>
            Type a password to reset it.
          </div>
        </div>
        <div class="form-group">
          <label>Confirm Password:</label>
          <div class="password-input">
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="localUser.confirmPassword"
              class="form-control"
              placeholder="••••••••"
            >
            <button class="btn-icon" @click="togglePassword('confirmPassword')" title="Toggle visibility">
              <i class="material-icons">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</i>
            </button>
          </div>
          <div class="form-note">
            <i class="material-icons">info</i>
            Confirm your previously typed password.
          </div>
        </div>
        <div v-if="!localUser.password && localUser?.isNew" class="password-warning">
          <i class="material-icons">warning</i>
          No password is set for this account.
        </div>
        <div v-if="localUser.password && localUser.confirmPassword && !passwordsMatch" class="password-warning">
          <i class="material-icons">warning</i>
          Password and confirmation do not match.
        </div>
      </div>

      <!-- Account Limits Tab -->
      <div v-if="activeTab === 'limits'" class="detail-section">
        <h4><i class="material-icons">speed</i> Account Limits</h4>
        <div class="form-group">
          <label>Max Queries per Hour:</label>
          <input
            type="number"
            v-model.number="localUser.maxQueries"
            class="form-control"
            placeholder="0 for no limit"
            min="0"
          >
        </div>
        <div class="form-group">
          <label>Max Updates per Hour:</label>
          <input
            type="number"
            v-model.number="localUser.maxUpdates"
            class="form-control"
            placeholder="0 for no limit"
            min="0"
          >
        </div>
        <div class="form-group">
          <label>Max Connections per Hour:</label>
          <input
            type="number"
            v-model.number="localUser.maxConnections"
            class="form-control"
            placeholder="0 for no limit"
            min="0"
          >
        </div>
        <div class="form-group">
          <label>Max User Connections:</label>
          <input
            type="number"
            v-model.number="localUser.maxUserConnections"
            class="form-control"
            placeholder="0 for no limit"
            min="0"
          >
        </div>
      </div>

      <!-- Schema Privileges Tab - Improved Version -->
      <div v-if="activeTab === 'privileges'" class="detail-section">
        <h4><i class="material-icons">storage</i> Schema Privileges</h4>

        <div class="privilege-categories" v-if="newSchema.name">
          <div class="privilege-category">
            <h5>Object Rights</h5>
            <div class="privilege-options">
              <label v-for="priv in objectPrivileges" :key="priv">
                <input 
                  type="checkbox" 
                  :checked="newSchema.privileges[priv]" 
                  @change="updatePrivilege(priv, $event.target.checked)"
                >
                {{ priv }}
              </label>
            </div>
          </div>

          <div class="privilege-category">
            <h5>DDL Rights</h5>
            <div class="privilege-options">
              <label v-for="priv in ddlPrivileges" :key="priv">
                <input 
                  type="checkbox" 
                  :checked="newSchema.privileges[priv]" 
                  @change="updatePrivilege(priv, $event.target.checked)"
                >
                {{ priv }}
              </label>
            </div>
          </div>

          <div class="privilege-category">
            <h5>Other Rights</h5>
            <div class="privilege-options">
              <label v-for="priv in otherPrivileges" :key="priv">
                <input 
                  type="checkbox" 
                  :checked="newSchema.privileges[priv]" 
                  @change="updatePrivilege(priv, $event.target.checked)"
                >
                {{ priv }}
              </label>
            </div>
          </div>
        </div>

        <div class="privilege-actions" v-if="newSchema.name">
          <button class="btn" @click="selectAllPrivileges">
            <i class="material-icons">check_box</i> Select ALL
          </button>
          <button class="btn" @click="unselectAllPrivileges">
            <i class="material-icons">check_box_outline_blank</i> Unselect All
          </button>
        </div>

        <div class="current-privileges">
          <h5>Current Privileges</h5>
          <div class="privilege-table-container">
            <table class="privilege-table">
              <thead>
                <tr>
                  <th>Schema</th>
                  <th>Host</th>
                  <th>Privileges</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(schema, index) in localUser.schemas" 
                  :key="index" 
                  :class="{ 'editing-row': schema.name === newSchema.name && schema.host === newSchema.host }"
                >
                  <td>{{ schema.name }}</td>
                  <td>{{ schema.host || '%' }}</td>
                  <td>
                    <div class="privilege-tags">
                      <span 
                        class="privilege-tag" 
                        v-for="(value, priv) in schema.privileges" 
                        v-if="value"
                        :key="priv"
                      >
                        {{ priv }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button class="btn-icon" @click="editSchema(index)" title="Edit">
                      <i class="material-icons">edit</i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
          <div class="dialog-buttons">
            <button class="btn btn-flat" @click="$modal.hide('delete-user-modal')">Cancel</button>
            <button class="btn btn-danger" @click="confirmDelete">Delete</button>
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
          <div class="dialog-c-title">Apply Changes</div>
          <p>Are you sure you want to apply the changes to <strong>{{ localUser?.user }}</strong>?</p>
          <div class="dialog-buttons">
            <button class="btn btn-flat" @click="$modal.hide('apply-changes-user-modal')">Cancel</button>
            <button class="btn btn-primary" @click="confirmApply">Apply</button>
          </div>
        </div>
      </modal>

    <div class="action-buttons">
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
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
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
      objectPrivileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'EXECUTE', 'SHOW VIEW'],
      ddlPrivileges: ['CREATE', 'ALTER', 'REFERENCES', 'INDEX', 'CREATE VIEW', 'CREATE ROUTINE', 'ALTER ROUTINE', 'EVENT', 'DROP', 'TRIGGER'],
      otherPrivileges: ['GRANT OPTION', 'CREATE TEMPORARY TABLES', 'LOCK TABLES'],
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
    }
  },
  methods: {
    ...mapMutations(['setSelectedUser']),
    async getAccountDetails() {

      try {
        const authDetailsArray = await this.connection.getUserAuthenticationDetails(this.localUser.user, this.localUser.host);
        
        if (authDetailsArray && authDetailsArray.length > 0) {
          const authDetails = authDetailsArray[0];

          this.localUser.authType = authDetails.Authentication_Type || 'caching_sha2_password';
          this.localUser.encryptedPassword = authDetails.Encrypted_Password || '';
          this.backupDetails.authType = this.localUser.authType;
          this.$forceUpdate();
        }
      } catch (error) {
        console.error('Error obtaining User Details:', error);
      }
    },

    async getUserResourceLimits() {

      try {
        const limitsArray = await this.connection.getUserResourceLimits(this.localUser.user, this.localUser.host);
        
        if (limitsArray && limitsArray.length > 0) {
          const limits = limitsArray[0];

          this.localUser.maxQueries = limits.max_questions || 0;
          this.localUser.maxUpdates = limits.max_updates || 0;
          this.localUser.maxConnections = limits.max_connections || 0;
          this.localUser.maxUserConnections = limits.max_user_connections || 0;
          this.backupDetails.maxQueries = this.localUser.maxQueries || 0;
          this.backupDetails.maxUpdates = this.localUser.maxUpdates || 0;
          this.backupDetails.maxConnections = this.localUser.maxConnections || 0;
          this.backupDetails.maxUserConnections = this.localUser.maxUserConnections || 0;
        }
      } catch (error) {
        console.error('Error obtaning User Limits:', error);
      }
    },

    async getUserGrants() {
      try {
        const schemaGrantsMap = {};
        const schemas = await this.connection.getSchemas();
        schemas.forEach(schema => {
          if (!schemaGrantsMap[schema.SCHEMA_NAME]) {
            schemaGrantsMap[schema.SCHEMA_NAME] = {};
          }
        });

        if (!this.localUser.isNew) {
          const grants = await this.connection.showGrantsForUser(this.user.user, this.user.host);

          for (const row of grants) {
            const grantStr = Object.values(row)[0];

            if (typeof grantStr !== 'string') continue;

            const match = grantStr.match(/GRANT (.+) ON [`]?(.+?)[`]?.\* TO/i);
            if (grantStr.includes('GRANT ALL PRIVILEGES') && match) {
              const schema = match[2];
              if (!schemaGrantsMap[schema]) {
              schemaGrantsMap[schema] = {};
              }
              [...this.objectPrivileges, ...this.ddlPrivileges, ...this.otherPrivileges].forEach(priv => {
              schemaGrantsMap[schema][priv] = true;
              });
              continue;
            }
            if (!match) continue;

            const privsStr = match[1];
            const schema = match[2];
            const privileges = privsStr.split(',').map(p => p.trim().toUpperCase());

            if (!schemaGrantsMap[schema]) {
              schemaGrantsMap[schema] = {};
            }

            for (const priv of privileges) {
              schemaGrantsMap[schema][priv] = true;
            }
          }
        }

        return Object.entries(schemaGrantsMap).map(([name, privileges]) =>
              this.normalizeSchemaPrivileges({ name, host: this.localUser.host || '%', privileges }));

      } catch (error) {
        console.error('Error obtaining User Grants:', error);
      }
    },
      
    togglePassword(field) {
      if (field === 'password') {
        this.showPassword = !this.showPassword
      } else {
        this.showConfirmPassword = !this.showConfirmPassword
      }
    },
    deleteAccount() {
      this.$emit('user-deleted', this.localUser)
    },
    expirePassword() {
      this.$emit('expire-password', this.localUser)
    },
    revokeAllPrivileges() {
      this.$emit('revoke-privileges', this.localUser)
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
      const grants = await this.connection.showGrantsForUser(this.user.user, this.user.host);

      const localUser = {
        ...this.user,
        authType: details[0]?.Authentication_Type || 'caching_sha2_password',
        encryptedPassword: details[0]?.Encrypted_Password || '',
        maxQueries: limits[0]?.max_questions || 0,
        maxUpdates: limits[0]?.max_updates || 0,
        maxConnections: limits[0]?.max_connections || 0,
        maxUserConnections: limits[0]?.max_user_connections || 0,
        schemas: (() => {
          const schemaGrantsMap = {};
          for (const row of grants) {
            const grantStr = Object.values(row)[0];
            if (typeof grantStr !== 'string') continue;
            const match = grantStr.match(/GRANT (.+) ON [`]?(.+?)[`]?.\* TO/i);
            if (!match) continue;
            const privsStr = match[1];
            const schema = match[2];
            const privileges = privsStr.split(',').map(p => p.trim().toUpperCase());
            if (!schemaGrantsMap[schema]) schemaGrantsMap[schema] = {};
            for (const priv of privileges) schemaGrantsMap[schema][priv] = true;
          }
          return Object.entries(schemaGrantsMap).map(([name, privileges]) =>
            this.normalizeSchemaPrivileges({ name, host: this.user.host || '%', privileges })
          );
        })()
      };

      this.localUser = localUser;
    },
    async loadUserGrants() {
      try {
        const grants = await this.getUserGrants();
        this.localUser.schemas = grants;
      } catch (error) {
        console.error('Failed to load user grants:', error);
      }
    },
    async applyChanges() {
      if (this.localUser.password && !this.passwordsMatch) {
        this.$noty.error('Password and confirmation do not match.');
        return;
      }
      const changes = [];

      if (this.localUser.isNew) {
        // New User Creation - [0, user, host, password, authType]
        changes.push([0, this.localUser.user, this.localUser.host, this.localUser.password, this.localUser.authType]);
      } else {

        // UserName or Host Changes - [1, oldUserName, newUser, oldHost, newHost]
        if (this.localUser.user !== this.user.user || this.localUser.host !== this.user.host) {
          changes.push([1, this.user.user, this.localUser.user, this.user.host, this.localUser.host]);
        }
        
        // Authentication Type and Password Changes - [2, user, host, newPassword, newAuthType]
        if ((this.localUser.password && this.localUser.password !== undefined) || 
        this.localUser.authType !== this.backupDetails.authType) { 
          changes.push([2, this.localUser.user, this.localUser.host, this.localUser.password, this.localUser.authType]); 
        }
    }
      // Account Limits Changes - [3, user, host, maxQueries, maxUpdates, maxConnections, maxUserConnections]
      if (
        this.localUser.maxQueries !== this.backupDetails.maxQueries ||
        this.localUser.maxUpdates !== this.backupDetails.maxUpdates ||
        this.localUser.maxConnections !== this.backupDetails.maxConnections ||
        this.localUser.maxUserConnections !== this.backupDetails.maxUserConnections
      ) {
        changes.push([
          3,
          this.localUser.user,
          this.localUser.host,
          this.localUser.maxQueries ?? 0,
          this.localUser.maxUpdates ?? 0,
          this.localUser.maxConnections ?? 0,
          this.localUser.maxUserConnections ?? 0
        ]); 
      }

      // Schema Privileges Changes - [4, user, schemaName, schemaHost, privileges, revokedPrivileges]
      const currentSchemasMap = new Map(this.localUser.schemas.map(schema => [`${schema.name}@${schema.host || '%'}`, schema]));
      const originalSchemasArray = await this.getUserGrants();
      const originalSchemasMap = new Map(
        originalSchemasArray.map(schema => [`${schema.name}@${schema.host || '%'}`, schema])
      );

      for (const [key, currentSchema] of currentSchemasMap.entries()) {
        const originalSchema = originalSchemasMap.get(key);
        if (!originalSchema) {
          changes.push([4, this.localUser.user, currentSchema.name, currentSchema.host || '%', Object.keys(currentSchema.privileges).filter(priv => currentSchema.privileges[priv])]);
        } else {
            const privilegesChanged = Object.keys(currentSchema.privileges).some(priv => {
            return currentSchema.privileges[priv] !== originalSchema.privileges[priv];
            });
          if (privilegesChanged) {
            const revokedPrivileges = Object.keys(originalSchema.privileges).filter(
              priv => originalSchema.privileges[priv] && !currentSchema.privileges[priv]
            );
            changes.push([
              4,
              this.localUser.user,
              currentSchema.name,
              currentSchema.host || '%',
              Object.keys(currentSchema.privileges).filter(priv => currentSchema.privileges[priv]),
              revokedPrivileges
            ]);
          }
        }
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

    addNewSchema() {
      this.localUser.schemas.push({
        name: '',
        privileges: {
          select: false,
          insert: false,
          update: false,
          delete: false,
          create: false,
          alter: false,
          drop: false,
          index: false,
          references: false
        }
      })
    },
    resetNewSchemaPrivileges() {
      const allPrivileges = [...this.objectPrivileges, ...this.ddlPrivileges, ...this.otherPrivileges];
      this.newSchema.privileges = allPrivileges.reduce((acc, priv) => {
        acc[priv] = false;
        return acc;
      }, {});
    },
    showDeleteModal() {
      this.$modal.show('delete-user-modal');
    },
    async confirmDelete() {
      if (!this.localUser) return;
      try {
        let result = await this.connection.deleteUser(this.localUser.user, this.localUser.host);
        this.$noty.success(`User ${this.localUser.user} deleted successfully`);
        this.$store.dispatch('updateUsersList');
        this.$modal.hide('delete-user-modal');
        this.setSelectedUser(null);
      } catch (error) {
        console.error('Failed to delete user:', error);
        this.$noty.error(`Failed to delete user: ${error.message}`);
      }
    },
    showApplyModal(user) {
      this.$modal.show('apply-changes-user-modal');
    },
    async confirmApply() {
      if (!this.localUser) return;
      try {
        await this.applyChanges();
        this.$modal.hide('apply-changes-user-modal');
        this.setSelectedUser(null);
      } catch (error) {
        console.error('Failed to apply changes:', error);
        this.$noty.error(`Failed to apply changes: ${error.message}`);
      }
    },
    removeSchema(index) {
      this.localUser.schemas.splice(index, 1);
    },
    editSchema(index) {
      const schema = this.localUser.schemas[index];
      this.newSchema = this.normalizeSchemaPrivileges(schema);
      this.newSchema = {
        name: schema.name,
        host: schema.host,
        privileges: { ...schema.privileges },
        localUser: {
          ...this.localUser,
          schemas: this.localUser.schemas.map((s, i) => (i === index ? schema : s))
        }
      };
    },
    selectAllPrivileges() {
      for (const priv in this.newSchema.privileges) {
        this.updatePrivilege(priv, true);
      }
    },
    unselectAllPrivileges() {
      for (const priv in this.newSchema.privileges) {
        this.updatePrivilege(priv, false);
      }
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
    normalizeSchemaPrivileges(schema) {
      const allPrivileges = [
        ...this.objectPrivileges,
        ...this.ddlPrivileges,
        ...this.otherPrivileges
      ];
      const normalized = {};
      allPrivileges.forEach(priv => {
        normalized[priv] = !!(schema.privileges && schema.privileges[priv]);
      });
      return {
        ...schema,
        privileges: normalized
      };
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
}
</script>

<style scoped>
.user-detail-view {
  padding: 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.detail-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #444;
}

.back-button {
  background-color: #f1f3f4;
  border: none;
}

.subsection-tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 20px;
}

.tab-button {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #555;
  font-weight: 500;
}

.tab-button:hover {
  color: #4285f4;
  background-color: #f8f9fa;
}

.tab-button.active {
  color: #4285f4;
  border-bottom-color: #4285f4;
}

.detail-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  padding: 20px;
  margin-bottom: 20px;
}

.detail-section {
  margin-bottom: 25px;
}

.detail-section h4 {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4285f4;
  margin-top: 0;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: #4285f4;
  box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
}

.password-input {
  position: relative;
  display: flex;
}

.password-input .form-control {
  padding-right: 40px;
  color: #666;
}

.password-input .btn-icon {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
}

.form-note {
  color: #666;
  font-size: 0.85em;
  margin-top: 5px;
  display: flex;
  align-items: flex-start;
  gap: 5px;
}

.password-warning {
  color: #d32f2f;
  background-color: #fce8e6;
  padding: 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 15px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.btn {
  padding: 10px 16px;
  border-radius: 4px;
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn.success {
  background-color: #34a853;
  color: white;
}

.btn.success:hover {
  background-color: #2d9249;
}

.btn.danger {
  background-color: #ea4335;
  color: white;
}

.btn.danger:hover {
  background-color: #d33426;
}

.btn-icon {
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  background: none;
  border: none;
}

.btn-icon.primary {
  color: #4285f4;
}

.btn-icon:hover {
  background-color: #f1f3f4;
}

.material-icons {
  font-size: 20px;
}

.checkbox-group {
  margin-bottom: 12px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.privilege-table-container {
  overflow-x: auto;
  margin-bottom: 20px;
}

.privilege-table {
  width: 100%;
  border-collapse: collapse;
}

.privilege-table th, .privilege-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.privilege-table th {
  background-color: #f5f5f5;
  font-weight: 500;
}

.privilege-table tr:hover {
  background-color: #f9f9f9;
}

.privilege-table input[type="checkbox"] {
  margin: 0;
}

.schema-privileges-header {
  margin-bottom: 20px;
}

.schema-host-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.privilege-categories {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.privilege-category {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 15px;
}

.privilege-category h5 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #4285f4;
}

.privilege-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.privilege-options label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.privilege-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.current-privileges {
  margin-top: 30px;
}

.privilege-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.privilege-tag {
  background-color: #e0e0e0;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.editing-row {
  background-color: #f9f9f9;
}

</style>
