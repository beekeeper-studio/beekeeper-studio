<template>
  <div>
    <h4 class="mb-2 flex align-center schema-priv-title" style="gap: 6px;">
      <i class="material-icons">storage</i> Schema Privileges
    </h4>

    <div class="privilege-categories" v-if="newSchema.name" style="justify-content: center;">
      <div class="privilege-category">
        <div class="privilege-options">
          <label v-for="priv in allPrivileges" :key="priv">
            <input 
              type="checkbox" 
              :checked="newSchema.privileges[priv]" 
              @change="$emit('update-privilege', priv, $event.target.checked)"
            >
            {{ priv }}
          </label>
        </div>
      </div>
    </div>

    <div class="flex gap-2 mb-3 justify-center select-buttons-row" v-if="newSchema.name">
      <button class="btn btn-flat" @click="$emit('select-all-privileges')">
        <i class="material-icons">check_box</i> Select ALL
      </button>
      <button class="btn btn-flat" @click="$emit('unselect-all-privileges')">
        <i class="material-icons">check_box_outline_blank</i> Unselect All
      </button>
    </div>

    <div>
      <h5 class="mb-2">Current Privileges</h5>
      <div style="overflow-x:auto;">
        <table class="table">
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
              class="priv-row"
            >
              <td>{{ schema.name }}</td>
              <td>{{ schema.host || '%' }}</td>
              <td>
                <div class="flex wrap">
                  <span 
                    class="chip mr-1 mb-1"
                    v-for="(value, priv) in schema.privileges" 
                    v-if="value"
                    :key="priv"
                  >
                    {{ priv }}
                  </span>
                </div>
              </td>
              <td>
                <button class="btn-icon" @click="$emit('edit-schema', index)" title="Edit">
                  <i class="material-icons">edit</i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    localUser: Object,
    allPrivileges: Array,
    newSchema: Object
  }
}
</script>

<style scoped>

.privilege-categories {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  margin-bottom: 20px;
}
.privilege-category {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 15px;
  background: #fafbfc;
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
  font-size: 0.95em;
}
.table {
  background: #fafbfc;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 12px;
}
.table th, .table td {
  padding: 12px 16px;
  vertical-align: middle;
}
.priv-row {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border: 1px solid #ececec;
}
.chip {
  background-color: #e0e0e0;
  color: #333;
  padding: 5px 14px;
  border-radius: 14px;
  font-size: 1em;
  margin: 4px 6px 4px 0;
  display: inline-block;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.btn-icon {
  border-radius: 50%;
  border: none;
  background: #f5f5f7;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  font-size: 1.2em;
  margin: 0 auto;
}
.btn-icon:hover {
  background: #e0e0e0;
}
.bg-light {
  background: #f3f6fa;
}

.flex.justify-center,
.justify-center {
  justify-content: center;
}

.select-buttons-row {
  margin-bottom: 32px !important;
}
</style>
