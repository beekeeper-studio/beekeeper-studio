<template>
  <div>
    <div class="ssh-table-container">
      <div class="ssh-orders">
        <div
          v-for="(_row, idx) in rows"
          :key="idx"
          class="host-bullet"
          :title="
            idx === rows.length - 1 ? 'Target Host' : `Jump Host #${idx + 1}`
          "
        />
        <div class="add-host-bullet">
          <i class="material-icons">add_circle</i>
        </div>
      </div>
      <div class="ssh-table-rows">
        <div class="ssh-table" :data-row-count="rows.length" ref="sshTable" />
        <button
          type="button"
          class="btn btn-flat add-host-btn"
          @click="addSshConfig"
        >
          Add Jump Host
        </button>
      </div>
    </div>

    <div class="ssh-agent-indicator" v-if="useSshAgent">
      <div class="error" v-if="$config.isSnap">
        <i class="material-icons">error_outline</i>
        <div>
          SSH Agent Forwarding is not possible with the Snap version of
          Beekeeper Studio due to the security model of Snap apps.
          <external-link :href="enableSshLink">Read more</external-link>
        </div>
      </div>
      <div v-else-if="$config.isWindows" class="info">
        <i class="material-icons-outlined">info</i>
        <div>
          We didn't find a *nix ssh-agent running, so we'll attempt to use the
          PuTTY agent, pageant.
        </div>
      </div>
      <div v-else class="warning">
        <i class="material-icons">error_outline</i>
        <div>You don't seem to have an SSH agent running.</div>
      </div>
    </div>

    <!-- Edit form for the selected row -->
    <template v-if="selectedIndex !== null && selectedSshConfig">
      <div class="row gutter">
        <div class="col s9 form-group">
          <label>Hostname</label>
          <input
            type="text"
            class="form-control"
            v-model="selectedSshConfig.host"
          />
        </div>
        <div class="col s3 form-group">
          <label>Port</label>
          <input
            type="number"
            class="form-control"
            v-model.number="selectedSshConfig.port"
          />
        </div>
      </div>
      <div class="form-group">
        <label>Authentication</label>
        <select class="form-control" v-model="selectedSshConfig.mode">
          <option
            v-for="option in sshModeOptions"
            :key="option.mode"
            :value="option.mode"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Username</label>
        <masked-input
          :value="selectedSshConfig.username"
          :privacyMode="privacyMode"
          @input="(val) => (selectedSshConfig.username = val)"
        />
      </div>
      <div v-if="selectedSshConfig.mode === 'keyfile'" class="private-key gutter">
        <div v-if="$config.isSnap && !$config.snapSshPlug" class="row">
          <div class="alert alert-warning">
            <i class="material-icons">error_outline</i>
            <div>
              Hey snap user! You need to
              <external-link :href="enableSshLink">enable SSH access</external-link>,
              then restart Beekeeper to provide access to your .ssh directory.
            </div>
          </div>
        </div>
        <div class="row form-group">
          <label>Private Key File</label>
          <file-picker
            v-model="selectedSshConfig.keyfile"
            editable
            :show-hidden-files="true"
            :default-path="filePickerDefaultPath"
          />
        </div>
        <div class="row form-group">
          <label>Key Passphrase <span class="hint">(Optional)</span></label>
          <input
            type="password"
            class="form-control"
            v-model="selectedSshConfig.keyfilePassword"
          />
        </div>
      </div>
      <div v-if="selectedSshConfig.mode === 'userpass'" class="form-group">
        <label>Password</label>
        <input
          type="password"
          class="form-control"
          v-model="selectedSshConfig.password"
        />
      </div>

      <!-- Keepalive shown only for the last (target) row -->
      <div v-if="isSelectedTargetHost" class="col form-group">
        <label for="sshKeepaliveInterval">
          Keepalive Interval
          <i
            class="material-icons"
            style="padding-left: 0.25rem"
            v-tooltip="{
              content: 'Ping the server after this many seconds when idle <br /> to prevent getting disconnected due to inactiviy <br/> (like<code> ServerAliveInterval 60 </code>in ssh/config)',
              html: true,
            }"
            >help_outlined</i
          >
        </label>
        <input
          type="number"
          v-model.number="config.sshKeepaliveInterval"
          name="sshKeepaliveInterval"
          placeholder="(in seconds)"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Tabulator } from "tabulator-tables";
import FilePicker from "@/components/common/form/FilePicker.vue";
import ExternalLink from "@/components/common/ExternalLink.vue";
import MaskedInput from "@/components/MaskedInput.vue";
import { IConnection } from "@/common/interfaces/IConnection";
import { TransportConnectionSshConfig, TransportSshConfig } from "@/common/transport/TransportSshConfig";

export default Vue.extend({
  components: { FilePicker, ExternalLink, MaskedInput },

  props: {
    config: {
      type: Object as PropType<IConnection>,
      required: true,
    },
    privacyMode: Boolean,
  },

  data() {
    return {
      sshTable: null as Tabulator | null,
      selectedIndex: null as number | null,
      enableSshLink:
        "https://docs.beekeeperstudio.io/installation/linux/#ssh-key-access-for-the-snap",
      sshModeOptions: [
        { label: "Key File", mode: "keyfile" },
        { label: "Username & Password", mode: "userpass" },
        { label: "SSH Agent", mode: "agent" },
      ],
      filePickerDefaultPath: window.main.join(
        platformInfo.homeDirectory,
        ".ssh"
      ),
    };
  },

  computed: {
    // Sorted list of join rows — the last entry is the target host
    sortedConfigs(): TransportConnectionSshConfig[] {
      return (this.config.sshConfigs ?? []).slice().sort((a, b) => a.position - b.position);
    },
    rows() {
      return this.sortedConfigs.map((join) => ({
        host: join.sshConfig?.host,
        port: join.sshConfig?.port,
        username: join.sshConfig?.username,
        mode: join.sshConfig?.mode,
        ref: join,
      }));
    },
    selectedJoin(): TransportConnectionSshConfig | null {
      if (this.selectedIndex === null || this.selectedIndex >= this.sortedConfigs.length) {
        return null;
      }
      return this.sortedConfigs[this.selectedIndex];
    },
    selectedSshConfig(): TransportSshConfig | null {
      return this.selectedJoin?.sshConfig ?? null;
    },
    isSelectedTargetHost(): boolean {
      return this.selectedIndex === this.rows.length - 1;
    },
    useSshAgent() {
      return this.sortedConfigs.some((join) => join.sshConfig?.mode === "agent");
    },
  },

  watch: {
    async rows() {
      if (!this.sshTable) return;
      // Preserve the current Tabulator row position across data refreshes,
      // clamped to the new row count.
      const currentPos = this.sshTable.getSelectedRows()[0]?.getPosition() ?? 1;
      await this.sshTable.setData(this.rows);
      const newCount = this.sshTable.getRows().length;
      const targetPos = Math.min(currentPos, newCount);
      const row = this.sshTable.getRowFromPosition(targetPos);
      if (row) row.select();
    },
  },

  methods: {
    addSshConfig() {
      const sshConfigs = [...(this.config.sshConfigs ?? [])];
      const newJoin: TransportConnectionSshConfig = {
        id: null,
        connectionId: this.config.id ?? null,
        sshConfigId: null,
        position: sshConfigs.length,
        createdAt: null,
        updatedAt: null,
        version: null,
        sshConfig: {
          id: null,
          host: "",
          port: 22,
          mode: "agent",
          username: null,
          password: null,
          keyfile: null,
          keyfilePassword: null,
          createdAt: null,
          updatedAt: null,
          version: null,
        },
      };
      sshConfigs.push(newJoin);
      this.$set(this.config, "sshConfigs", sshConfigs);
      this.selectedIndex = sshConfigs.length - 1;
    },
    removeSshConfig(index: number) {
      if (this.rows.length === 1) {
        throw new Error("There should be at least one host");
      }
      const sshConfigs = [...(this.config.sshConfigs ?? [])].sort((a, b) => a.position - b.position);
      sshConfigs.splice(index, 1);
      sshConfigs.forEach((cfg, i) => { cfg.position = i; });
      this.$set(this.config, "sshConfigs", sshConfigs);
    },
    reorderSshConfigs(newOrder: TransportConnectionSshConfig[]) {
      const reindexed = newOrder.map((join, i) => ({ ...join, position: i }));
      this.$set(this.config, "sshConfigs", reindexed);
    },
    createTable() {
      this.destroyTable();
      const sshTable = new Tabulator(this.$refs.sshTable as HTMLElement, {
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
          {
            title: "Host",
            field: "host",
            minWidth: 140,
            formatter: (cell) => {
              const host = cell.getValue() ?? "";
              const port = cell.getRow().getCell("port").getValue() ?? "";
              return port ? `${host}:${port}` : host;
            },
          },
          { title: "", field: "port", visible: false },
          { title: "Username", field: "username", minWidth: 72 },
          {
            title: "Auth",
            field: "mode",
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
            formatter: (cell) => {
              const button = document.createElement("button");
              button.type = "button";
              button.classList.add("btn", "btn-fab", "remove-btn");
              const icon = document.createElement("i");
              icon.classList.add("material-icons");
              icon.innerText = "clear";
              button.appendChild(icon);
              button.onclick = (e) => {
                const pos = cell.getRow().getPosition(true);
                if (pos) {
                  e.stopPropagation();
                  this.removeSshConfig(pos - 1);
                }
              };
              return button;
            },
          },
          // For storing a reference to the config / jumphost object
          { title: "", field: "ref", visible: false },
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
      sshTable.on("rowSelected", (row) => {
        const pos = row.getPosition();
        if (pos) {
          this.selectedIndex = pos - 1;
        }
      });
      sshTable.on("rowMoved", () => {
        const newOrder: TransportConnectionSshConfig[] = sshTable.getRows().map((r) => r.getData().ref);
        this.reorderSshConfigs(newOrder);
      })
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
  padding-top: calc(2.28rem + 3px);
  gap: 3px;
  margin-right: 0.75rem;
  color: var(--text-lighter);

  > * {
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
  &[data-row-count="1"] .tabulator-cell .remove-btn {
    visibility: hidden;
  }

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

.ssh-agent-indicator > div {
  display: flex;
  font-size: 0.76em;
  gap: 0.4em;
  padding-top: 0.5em;

  .material-icons,
  .material-icons-outlined {
    font-size: 1.17em;
    line-height: 0.9;
  }

  &.error {
    color: var(--brand-danger);
  }
  &.info {
    color: var(--brand-info);
  }
  &.warning {
    color: var(--brand-warning);
  }
}
</style>
