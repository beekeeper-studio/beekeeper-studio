<template>
  <div class="table-info-table user-list-table">
    <div class="bk-section-header">
      <h3 class="bk-title">
        <i class="material-icons">list_alt</i> User Accounts
      </h3>
      <button class="btn btn-primary" @click="addAccount">
        <i class="material-icons">person_add</i> Add User
      </button>
    </div>
    <div class="table-info-table-wrap">
      <div ref="userTabulator"></div>
    </div>
  </div>
</template>

<script>
import { TabulatorFull } from 'tabulator-tables'
import { createNewTabUser } from '@/lib/db/models'

export default {
  name: 'TabUserManagementUserList',
  props: {
    users: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  data() {
    return {
      tabulator: null,
      destroyed: false,
      columns: [
        {
          title: 'User',
          field: 'user',
          formatter: (cell) => {
            const value = cell.getValue()
            if (!value) {
              return `<span class="bk-anonymous-user"><i class="material-icons">incognito</i> anonymous</span>`
            }
            return `<span class="bk-user-name"><i class="material-icons">person</i> ${value}</span>`
          },
          widthGrow: 2,
          cellDblClick: (e, cell) => {
            this.emitUserSelected(cell.getRow())
          }
        },
        {
          title: 'From Host',
          field: 'host',
          formatter: (cell) => {
            const value = cell.getValue()
            return `<span class="bk-user-host">${value || 'unknown'}</span>`
          },
          widthGrow: 2,
          cellDblClick: (e, cell) => {
            this.emitUserSelected(cell.getRow())
          }
        }
      ]
    }
  },
  watch: {
    users: {
      handler() {
        if (this.tabulator) {
          this.tabulator.destroy()
          this.tabulator = null
        }
        this.$nextTick(() => {
          this.initTabulator()
        })
      },
      deep: true
    }
  },
  methods: {
    initTabulator() {
      this.tabulator = new TabulatorFull(this.$refs.userTabulator, {
        columns: this.columns,
        data: this.users,
        layout: 'fitColumns',
        height: 400,
        placeholder: "No users"
      })
    },
    addAccount() {
      const newUser = createNewTabUser();
      this.$emit('user-added', newUser);
    },
    emitUserSelected(row) {
      this.$emit('user-selected', row.getData())
    }
  },
  mounted() {
    this.initTabulator()
  },
  beforeDestroy() {
    if (this.tabulator) {
      this.tabulator.destroy()
      this.tabulator = null
    }
  }
}
</script>

<style scoped>
.table-info-table.user-list-table {
  padding: 20px;
}

.bk-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.bk-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}

.material-icons {
  font-size: 20px;
}

.table-info-table-wrap {
  background: var(--bk-bg-card, #fff);
  border-radius: 8px;
  border: 1px solid var(--bk-border-color, #e0e0e0);
  padding: 0;
  margin-top: 10px;
}

.bk-user-name, .bk-anonymous-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bk-user-host {
  color: var(--bk-user-color, #666);
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

.btn-primary {
  background: #4285f4;
  color: #fff;
}

.btn-primary:hover {
  background: #3367d6;
}
</style>
