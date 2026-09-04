<template>
  <base-modal name="theme-preview">
    <template #title>
      Theme Preview
    </template>

    <section>
      <h4>Palette</h4>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th />
              <th v-for="step in steps" :key="step">
                {{ step }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="family in families" :key="family">
              <td>--{{ family }}-*</td>
              <td v-for="step in steps" :key="step">
                <div
                  class="chip"
                  :style="{ backgroundColor: `var(--${family}-${step})` }"
                  :title="`var(--${family}-${step})`"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h4>Buttons</h4>
      <div class="specimens">
        <button class="btn" type="button">
          btn
        </button>
        <button class="btn btn-primary" type="button">
          btn-primary
        </button>
        <button class="btn btn-brand" type="button">
          btn-brand
        </button>
        <button class="btn btn-flat" type="button">
          btn-flat
        </button>
        <button class="btn btn-link" type="button">
          btn-link
        </button>
        <button class="btn btn-info" type="button">
          btn-info
        </button>
        <button class="btn btn-danger" type="button">
          btn-danger
        </button>
        <button class="btn btn-primary" type="button" disabled="disabled">
          disabled
        </button>
      </div>
      <div class="specimens">
        <button class="btn btn-flat btn-small" type="button">
          btn-small
        </button>
        <button class="btn btn-flat btn-icon" type="button">
          <i class="material-icons">save</i>btn-icon
        </button>
        <button class="btn btn-flat btn-badge" type="button">
          btn-badge<span class="badge">3</span>
        </button>
        <button class="btn btn-fab" type="button" title="btn-fab">
          <i class="material-icons">add</i>
        </button>
        <button class="btn btn-fab btn-primary" type="button" title="btn-fab btn-primary">
          <i class="material-icons">check</i>
        </button>
      </div>
      <div class="btn-group">
        <button class="btn btn-flat" type="button">
          btn-group
        </button>
        <button class="btn btn-primary" type="button">
          Connect
        </button>
      </div>
    </section>

    <section>
      <h4>Alerts</h4>
      <div class="alert">
        <i class="material-icons">info_outline</i>
        <div class="alert-body">
          <p>
            plain .alert &mdash; no variant, so it inherits
            <code>--alert-fg</code> over <code>--alert-bg</code>.
          </p>
        </div>
      </div>
      <div
        v-for="alert in alertVariants"
        :key="alert.variant"
        class="alert"
        :class="`alert-${alert.variant}`"
      >
        <i class="material-icons">{{ alert.icon }}</i>
        <div class="alert-body">
          <p>alert-{{ alert.variant }} &mdash; with a <a href="#" @click.prevent>link</a>.</p>
        </div>
      </div>
      <div class="alert alert-info alert-centered alert-small">
        <i class="material-icons">info_outline</i>
        <div class="alert-body">
          <p>alert-small alert-centered</p>
        </div>
      </div>
      <div class="inline-alert">
        inline-alert &mdash; plain text with an
        <a href="#" @click.prevent>underlined link</a>.
      </div>
      <error-alert
        :error="['error-alert component', 'a second message']"
        title="error-alert"
        :closable="true"
      />
    </section>

    <section>
      <h4>Noty</h4>
      <div class="specimens">
        <button
          v-for="variant in notyVariants"
          :key="variant"
          class="btn btn-flat"
          type="button"
          @click="showNoty(variant)"
        >
          {{ variant }}
        </button>
      </div>
    </section>

    <section>
      <h4>Forms</h4>
      <div class="form-group">
        <label for="theme-preview-input">form-control</label>
        <input
          id="theme-preview-input"
          class="form-control"
          type="text"
          placeholder="placeholder text"
        >
      </div>
      <div class="form-group">
        <label for="theme-preview-select">custom-select</label>
        <select id="theme-preview-select" class="form-control custom-select">
          <option>An option</option>
          <option>Another option</option>
        </select>
      </div>
      <div class="form-group">
        <label for="theme-preview-textarea">textarea</label>
        <textarea
          id="theme-preview-textarea"
          class="form-control"
          rows="2"
          placeholder="placeholder text"
        />
      </div>
      <div class="form-group">
        <label for="theme-preview-disabled">disabled</label>
        <input
          id="theme-preview-disabled"
          class="form-control"
          type="text"
          value="disabled"
          disabled
        >
      </div>
      <div class="form-group">
        <label class="checkbox-group" for="theme-preview-checkbox">
          <input
            id="theme-preview-checkbox"
            class="form-control"
            type="checkbox"
          >
          <span>checkbox-group</span>
        </label>
      </div>
    </section>

    <section>
      <h4>Cards</h4>
      <div class="card-flat padding">
        <h3 class="card-title">
          card-flat
        </h3>
        <div class="card-body">
          Body text sitting on the card surface.
        </div>
        <div class="card-actions">
          <button class="btn btn-flat" type="button">
            Cancel
          </button>
          <button class="btn btn-primary" type="button">
            Save
          </button>
        </div>
      </div>
    </section>

    <section>
      <h4>Tooltips</h4>
      <div class="specimens">
        <button class="btn btn-flat" type="button" v-tooltip="'A tooltip'">
          hover me
        </button>
        <button
          class="btn btn-flat"
          type="button"
          v-tooltip="{ content: 'An info tooltip', classes: ['tooltip-info'] }"
        >
          tooltip-info
        </button>
      </div>
    </section>

    <section>
      <h4>Context menu</h4>
      <div class="context-menu-target" @contextmenu.prevent.stop="openMenu">
        right click
      </div>
    </section>

    <section>
      <h4>Text editor</h4>
      <div class="editor-wrapper">
        <sql-text-editor
          :value="sql"
          :read-only="true"
          :line-wrapping="true"
        />
      </div>
    </section>

    <section>
      <h4>Table</h4>
      <div class="table-specimen">
        <bks-table
          :data="tableData"
          :columns="tableColumns"
        />
      </div>
    </section>

    <section>
      <h4>Tree</h4>
      <div class="tree-specimen">
        <bks-tree
          :folders="treeFolders"
          :items="treeItems"
          :expanded-ids="treeExpandedIds"
        />
      </div>
    </section>

    <section>
      <h4>JSON sidebar</h4>
      <div class="json-viewer-wrapper">
        <json-viewer :value="json" />
      </div>
    </section>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import Noty from "noty";
import { AppEvent } from "@/common/AppEvent";
import SqlTextEditor from "@beekeeperstudio/ui-kit/vue/sql-text-editor";
import BksTable from "@beekeeperstudio/ui-kit/vue/table";
import { Tree as BksTree } from "@beekeeperstudio/ui-kit/vue/tree";
import JsonViewer from "../../sidebar/JsonViewer.vue";
import BaseModal from "./BaseModal.vue";
import ErrorAlert from "../ErrorAlert.vue";

export default Vue.extend({
  components: {
    BaseModal,
    ErrorAlert,
    SqlTextEditor,
    JsonViewer,
    BksTable,
    BksTree,
  },
  data() {
    return {
      steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100],
      families: [
        "grayscale",
        "red",
        "orange",
        "yellow",
        "green",
        "pink",
        "blue",
      ],
      alertVariants: [
        { variant: "danger", icon: "error_outline" },
        { variant: "warning", icon: "warning_amber" },
        { variant: "info", icon: "info_outline" },
        { variant: "success", icon: "check_circle_outline" },
      ],
      notyVariants: ["success", "info", "warning", "error"],
      treeFolders: [
        {
          id: "folder-1",
          parentId: null,
          type: "folder",
          name: "Production",
          draggable: true,
          children: [],
        },
        {
          id: "folder-2",
          parentId: null,
          type: "folder",
          name: "Staging",
          draggable: true,
          children: [],
        },
      ],
      treeItems: [],
      treeExpandedIds: ["folder-1"],
      tableColumns: [
        { title: "id", field: "id", primaryKey: true },
        { title: "name", field: "name", editable: true },
        { title: "email", field: "email", editable: true },
        { title: "active", field: "active", editable: true },
      ],
      tableData: [
        { id: 1, name: "Ada Lovelace", email: "ada@example.com", active: true },
        { id: 2, name: "Alan Turing", email: "alan@example.com", active: false },
        { id: 3, name: "Grace Hopper", email: "grace@example.com", active: true },
      ],
      sql: [
        "-- comment",
        "SELECT id, name AS label, count(*)",
        "FROM users u",
        "WHERE u.active = true AND u.age > 21",
        "ORDER BY name;",
      ].join("\n"),
      json: {
        string: "value",
        number: 42,
        bool: true,
        null: null,
        nested: { key: "value" },
      },
    };
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openThemePreview, handler: this.open }];
    },
  },
  methods: {
    showNoty(variant) {
      this.$noty[variant](`A ${variant} notification`, {
        timeout: false,
        closeWith: ["button"],
        buttons: [
          Noty.button("Close", "btn btn-flat", () => Noty.closeAll()),
          Noty.button("Confirm", "btn btn-primary", () => Noty.closeAll()),
        ],
      });
    },
    open() {
      this.$modal.show("theme-preview");
    },
    openMenu(event) {
      this.$bks.openMenu({
        event,
        item: null,
        options: [
          { name: "An item", handler: () => undefined },
          { name: "Another item", handler: () => undefined },
          { type: "divider" },
          { name: "Disabled item", handler: () => undefined, disabled: true },
          {
            name: "Submenu",
            items: [{ name: "Nested item", handler: () => undefined }],
          },
        ],
      });
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

<style lang="scss" scoped>
section {
  margin-bottom: 2rem;
}

h4 {
  margin: 0 0 0.75rem;
  color: var(--text-lighter);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-wrapper {
  width: 100%;
  overflow: auto;
}

table {
  border-collapse: separate;
  border-spacing: 0;
}

th {
  padding-bottom: 1rem;
  font-weight: normal;
}

th:first-child,
td:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--modal-bg);
  padding-right: 1rem;
  white-space: nowrap;
}

.chip {
  width: 40px;
  height: 40px;
  border-radius: 2px;
}

.specimens {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.context-menu-target {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 5rem;
  border: 1px dashed var(--border-color);
  border-radius: 4px;
  color: var(--text-light);
  user-select: none;
}

.table-specimen {
  height: 12rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.tree-specimen {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: auto;
  max-height: 12rem;
}

.json-viewer-wrapper {
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.editor-wrapper {
  height: 8rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}
</style>
