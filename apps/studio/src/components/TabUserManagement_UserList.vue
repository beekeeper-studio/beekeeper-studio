<template>
  <div class="user-list-view">
    <div class="section-header">
      <h3><i class="material-icons">list_alt</i> User Accounts</h3>
      <button class="btn btn-primary" @click="addAccount">
        <i class="material-icons">person_add</i> Add User
      </button>
    </div>
    
    <div class="table-container">
      <table class="user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>From Host</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="`${user.user}@${user.host}`">
            <td>
              <span v-if="!user.user" class="anonymous-user">
                <i class="material-icons">incognito</i> anonymous
              </span>
              <span v-else class="user-name">
                <i class="material-icons">person</i> {{ user.user }}
              </span>
            </td>
            <td>
              <span class="user-host">{{ user.host || 'unknown' }}</span>
            </td>
            <td>
              <button 
                class="btn-icon primary" 
                @click="$emit('user-selected', user)" 
                title="View Details"
              >
                <i class="material-icons">visibility</i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    users: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  methods: {
    addAccount() {
      const newUser = {
        user: 'newuser',
        host: '%',
        authType: 'caching_sha2_password',
        password: '',
        confirmPassword: '',
        isNew: true
      }
      this.$emit('user-added', newUser)
    }
  }
}
</script>

<style scoped>
.user-list-view {
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #444;
  margin: 0;
}

.table-container {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  max-height: 500px;
  overflow-y: auto;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
}

.user-table th, .user-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.user-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #555;
  position: sticky;
  top: 0;
}

.user-table tr:hover {
  background-color: #f5f7fa;
}

.user-name, .anonymous-user {
  display: flex;
  color: #666;
  align-items: center;
  gap: 8px;
}

.user-host {
  color: #666;
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

.btn-primary {
  background-color: #4285f4;
  color: white;
}

.btn-primary:hover {
  background-color: #3367d6;
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
</style>
