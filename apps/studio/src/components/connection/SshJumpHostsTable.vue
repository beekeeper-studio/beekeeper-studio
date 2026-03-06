<template>
  <div class="ssh-table-container">
    <div class="ssh-orders">
      <div v-for="(_row, idx) in rows" :key="idx" class="host-bullet" :title="idx === rows.length - 1 ? 'Target Host' : `Jump Host #${idx + 1}`
        " />
      <div class="add-host-bullet">
        <i class="material-icons">add_circle</i>
      </div>
    </div>
    <div class="ssh-table-rows">
      <div class="ssh-table" ref="sshTable" />
      <button type="button" class="btn btn-flat add-host-btn">
        Add Jump Host
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Tabulator } from "tabulator-tables";

export default Vue.extend({
  props: {
    rows: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      sshTable: null as Tabulator | null,
    };
  },
  watch: {
    async rows() {
      if (!this.sshTable) {
        return;
      }
      const selectedRowPosition =
        this.sshTable.getSelectedRows()[0]?.getPosition() ?? 1;
      await this.sshTable.setData(this.rows);
      this.sshTable.selectRow(
        this.sshTable.getRowFromPosition(selectedRowPosition)
      );
    },
  },
  methods: {
    createTable() {
      this.destroyTable();

      const sshTable = new Tabulator(this.$refs.sshTable, {
        layout: "fitColumns",
        movableRows: true,
        rowHeader: {
          headerSort: false,
          resizable: false,
          minWidth: 30,
          width: 30,
          rowHandle: true,
          formatter: "handle",
        },
        columnDefaults: {
          headerSort: false,
          resizable: false,
        },
        columns: [
          { title: "Host", field: "host", minWidth: 140 },
          { title: "Username", field: "username", minWidth: 72 },
          {
            title: "Auth",
            field: "auth",
            minWidth: 70,
            formatter: "lookup",
            formatterParams: {
              agent: "Agent",
              userpass: "Password",
              keyfile: "Key File",
            },
          },
          {
            title: "",
            cssClass: "action",
            formatter(cell) {
              const button = document.createElement("button");
              button.type = "button";
              button.classList.add("btn", "btn-fab");
              const icon = document.createElement("i");
              icon.classList.add("material-icons");
              icon.innerText = "clear";
              button.appendChild(icon);
              button.onclick = () => {
                console.log("hello ", cell.getRow().getData());
              };
              return button;
            },
          },
        ],
      });
      this.sshTable = sshTable;

      sshTable.on("tableBuilt", async () => {
        await sshTable.setData(this.rows);
        sshTable.getRowFromPosition(1).select();
      });
      sshTable.on("rowClick", (_e, row) => {
        if (row.isSelected()) {
          return;
        }
        row
          .getTable()
          .getSelectedRows()
          .forEach((r) => r.deselect());
        row.select();
      });
    },
    destroyTable() {
      if (this.sshTable) {
        this.sshTable.destroy();
        this.sshTable = null;
      }
    },
  },
  mounted() {
    this.createTable();
  },
  beforeDestroy() {
    this.destroyTable();
  },
});
</script>

<style lang="scss" scoped>
.ssh-table-container {
  display: flex;

  .ssh-table-rows {
    flex-grow: 1;
  }
}

.ssh-orders {
  display: flex;
  flex-direction: column;
  // width: 1.5rem;
  padding-top: calc(2.28rem + 3px);
  gap: 3px;
  margin-right: 0.75rem;
  color: var(--text-lighter);

  >* {
    height: 2.14rem;
    display: flex;
    align-items: center;
    position: relative;

    &.host-bullet::before {
      content: "";
      width: 0.75em;
      height: 0.75em;
      background-color: currentColor;
      border-radius: 9999px;
    }

    &.add-host-bullet {
      position: relative;

      .material-icons {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-size: 1em;
      }
    }

    &:not(:last-child)::after {
      position: absolute;
      inset-inline: 0;
      margin-inline: auto;
      bottom: -0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "Material Icons";
      font-size: 1em;
      content: "more_vert";
    }
  }
}

.btn.add-host-btn {
  width: 100%;
  padding-left: 2.5rem;
  color: var(--text-dark);
  font-size: 0.831rem;
  font-weight: normal;
  justify-content: flex-start;
  border-radius: 5px;
  border: none;
  background-color: rgb(from var(--theme-base) r g b / 4%);

  &:hover,
  &:focus {
    font-weight: normal;
  }
}

.ssh-table ::v-deep {
  &.tabulator {
    .tabulator-header {
      box-shadow: none;

      .tabulator-col {
        .tabulator-col-content {
          padding-inline: 0.4rem;
        }

        .tabulator-col-title {
          color: var(--text-lighter);
        }
      }
    }

    .tabulator-row {
      background-color: rgb(from var(--theme-base) r g b / 5%);
    }
  }

  .tabulator-row {
    margin: 3px 0;
    color: var(--text-dark);
    border-radius: 5px;
    font-size: 0.831rem;

    &.tabulator-selected {
      outline-offset: -1px;
      outline: 1px solid var(--input-highlight);
    }

    .tabulator-row-header {
      background-color: transparent;
    }

    .tabulator-cell {

      &,
      &.tabulator-row-header {
        padding-inline: 0.4rem;
      }

      &:hover {
        background-color: transparent;
      }

      &.action {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        padding: 0;

        button {
          margin: 0;
          background-color: transparent;

          &:hover .material-icons {
            color: var(--text-dark);
          }

          .material-icons {
            color: var(--text-lighter);
            font-size: 1.3em;
          }
        }
      }

      .tabulator-row-handle-box {
        width: auto;
        display: flex;
        height: 60%;
        gap: 2px;
      }

      .tabulator-row-handle-bar {
        height: 100%;
        margin: 0;
        width: 1px;
        background-color: var(--border-color);

        &:last-child {
          display: none;
        }
      }
    }
  }
}
</style>
