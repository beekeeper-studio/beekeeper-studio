<template>
  <base-modal
    :name="modalName"
    max-width="960px"
    height="85vh"
    @opened="handleOpened"
    @closed="handleClosed"
  >
    <template #title>
      Theme Playground
    </template>
    <div class="theme-playground">
      <section>
        <h3>Scales</h3>
        <label class="switch-label aliases-switch">
          <x-switch
            :toggled="showStepAliases"
            @click.prevent="showStepAliases = !showStepAliases"
          />
          <span>Aliases</span>
        </label>
        <table class="scale-table">
          <thead>
            <tr>
              <th />
              <th v-for="n in 12" :key="n" :class="{ alias: showStepAliases }">
                <span>{{ stepLabel(n) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="hue in hues">
              <tr :key="hue">
                <th>{{ hue }}</th>
                <td v-for="n in 12" :key="n">
                  <div
                    class="swatch"
                    :style="{ background: `var(--${hue}-${n})` }"
                    :title="`--${hue}-${stepName(n)}`"
                  />
                </td>
              </tr>
              <tr :key="`${hue}-a`">
                <th />
                <td v-for="n in 12" :key="n">
                  <div
                    class="swatch checker"
                    :style="{ '--color': `var(--${hue}-a${n})` }"
                    :title="`--${hue}-${stepAlphaLabel(n)}`"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </section>

      <section class="buttons">
        <h3>Buttons</h3>
        <x-buttons class="selectbutton size-picker">
          <x-button
            v-for="size in buttonSizes"
            :key="size.label"
            :toggled="buttonSize === size.cls"
            @click.prevent="buttonSize = size.cls"
          >
            <span class="togglebutton-content">{{ size.label }}</span>
          </x-button>
        </x-buttons>
        <div v-for="state in ['Normal', 'Disabled']" :key="state">
          <h4>{{ state }}</h4>
          <table class="variant-table">
            <thead>
              <tr>
                <th />
                <th v-for="color in buttonColors" :key="color">
                  {{ color ? variantLabel(color) : "Default" }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in buttonVariants" :key="v">
                <th>{{ variantLabel(v) }}</th>
                <td v-for="color in buttonColors" :key="color">
                  <button
                    class="btn"
                    :class="[v, color, buttonSize]"
                    :disabled="state === 'Disabled'"
                  >
                    <i class="material-icons">edit</i>
                    Edit
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Icon buttons</h3>
        <div v-for="state in ['Normal', 'Disabled']" :key="state">
          <h4>{{ state }}</h4>
          <table class="variant-table">
            <thead>
              <tr>
                <th />
                <th v-for="color in buttonColors" :key="color">
                  {{ color ? variantLabel(color) : "Default" }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in buttonVariants" :key="v">
                <th>{{ variantLabel(v) }}</th>
                <td v-for="color in buttonColors" :key="color">
                  <button
                    class="btn btn-icon"
                    :class="[v, color]"
                    :disabled="state === 'Disabled'"
                  >
                    <i class="material-icons">add</i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Badges</h3>
        <table class="variant-table">
          <thead>
            <tr>
              <th />
              <th v-for="color in badgeColors" :key="color">
                {{ color ? variantLabel(color) : "Default" }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in ['', 'badge-primary']" :key="v">
              <th>{{ v ? variantLabel(v) : "Flat" }}</th>
              <td v-for="color in badgeColors" :key="color">
                <span class="badge" :class="[v, color]">Badge</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h3>Kbd</h3>
        <div class="row-wrap">
          <span class="kbd">Ctrl</span>
          <span class="kbd">Shift</span>
          <span class="kbd">P</span>
          <span class="kbd">⌘</span>
          <span class="kbd">Enter</span>
        </div>
      </section>

      <section>
        <h3>Alerts</h3>
        <div
          v-for="color in ['', 'alert-info', 'alert-success', 'alert-warning', 'alert-danger']"
          :key="color"
          class="alert"
          :class="color"
        >
          <i class="material-icons">info_outline</i>
          <div class="alert-body">
            {{ color ? variantLabel(color) : "Default" }}: something happened that you should know about.
          </div>
        </div>
      </section>

      <section>
        <h3>Nav pills</h3>
        <div class="nav-pills">
          <a
            v-for="pill in ['Columns', 'Indexes', 'Relations', 'Triggers']"
            :key="pill"
            class="nav-pill"
            :class="{ active: pill === activePill }"
            @click.prevent="activePill = pill"
          >{{ pill }}</a>
        </div>
      </section>

      <section>
        <h3>Loading spinner</h3>
        <div class="row-wrap">
          <loading-spinner />
          <loading-spinner :size="24" />
          <x-progressbar class="sample-progressbar" />
        </div>
      </section>

      <section>
        <h3>Select button</h3>
        <x-buttons class="selectbutton">
          <x-button
            v-for="mode in ['Light', 'Dark', 'Auto']"
            :key="mode"
            :toggled="selectButtonValue === mode"
            @click.prevent="selectButtonValue = mode"
          >
            <span class="togglebutton-content">{{ mode }}</span>
          </x-button>
        </x-buttons>
      </section>

      <section>
        <h3>Switch</h3>
        <div class="row-wrap">
          <label class="switch-label">
            <x-switch :toggled="switchOn" @click.prevent="switchOn = !switchOn" />
            <span>{{ switchOn ? "On" : "Off" }}</span>
          </label>
          <label class="switch-label">
            <x-switch toggled disabled />
            <span>Disabled on</span>
          </label>
          <label class="switch-label">
            <x-switch disabled />
            <span>Disabled off</span>
          </label>
        </div>
      </section>

      <section>
        <h3>Tooltips</h3>
        <div class="row-wrap">
          <button class="btn btn-flat" v-tooltip="'Plain tooltip'">
            Hover me
          </button>
          <button
            class="btn btn-flat"
            v-tooltip="{ content: 'Info tooltip', classes: ['tooltip-info'] }"
          >
            Info
          </button>
          <span class="bks-tooltip-wrapper tooltip-target">
            Hover for a rich tooltip
            <span class="bks-tooltip bks-tooltip-top-center">
              Tooltips with body text and a <a href="#">link</a> use this style.
            </span>
          </span>
        </div>
      </section>

      <section>
        <h3>Context menu</h3>
        <div class="row-wrap">
          <button class="btn btn-flat" @click="openSampleMenu">
            <i class="material-icons">menu</i>
            Open menu
          </button>
          <div class="context-target" @contextmenu.prevent="openSampleMenu">
            Right-click here
          </div>
        </div>
      </section>

      <section>
        <h3>Tree list</h3>
        <div class="tree-box">
          <tree
            :folders="treeFolders"
            :items="[]"
            :expanded-ids="treeExpanded"
            @update:expandedIds="treeExpanded = $event"
          >
            <template #folder="{ props }">
              <tree-folder v-bind="props" />
            </template>
          </tree>
        </div>
      </section>

      <section>
        <h3>Tabulator</h3>
        <div ref="tabulator" class="sample-table" />
      </section>

      <section class="editor-section">
        <h3>Text editor</h3>
        <sql-text-editor
          :value="`-- Orders placed this month, with the customer's name
  SELECT o.id, c.name, o.total, o.created_at
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  WHERE o.created_at >= date_trunc('month', now())
    AND o.status <> 'cancelled'
  ORDER BY o.total DESC
  LIMIT 25;`"
          :markers="[]"
          class="sample-editor"
        />
      </section>

      <section>
        <h3>Typography</h3>
        <p>Body text with a <a href="#">link</a> and <code>inline code</code>.</p>
        <p class="text-muted">
          Muted text
        </p>
        <p
          v-for="t in [
            'text-primary',
            'text-info',
            'text-success',
            'text-warning',
            'text-danger',
          ]"
          :key="t"
          :class="t"
        >
          {{ t }}
        </p>
      </section>

      <section>
        <h3>Forms</h3>
        <div class="form-group">
          <label>Text input</label>
          <input type="text" class="form-control" placeholder="Placeholder">
        </div>
        <div class="form-group">
          <label>Select</label>
          <select class="form-control">
            <option>One</option>
            <option>Two</option>
          </select>
        </div>
        <div class="form-group">
          <label>Textarea</label>
          <textarea class="form-control" rows="3" />
        </div>
        <div class="form-group">
          <label class="checkbox-group">
            <input type="checkbox">
            <span>Checkbox</span>
          </label>
          <label class="checkbox-group">
            <input type="radio">
            <span>Radio</span>
          </label>
        </div>
        <div class="form-group">
          <label>Multi select</label>
          <multi-select
            v-model="multiSelectQuery"
            placeholder="Add a member"
            :suggestions="multiSelectSuggestions"
            :selected-options="multiSelectSelected"
            @item-add="multiSelectSelected.push($event)"
            @item-remove="multiSelectSelected.splice(multiSelectSelected.indexOf($event), 1)"
          />
        </div>
      </section>

      <section>
        <h3>Cards</h3>
        <div class="row-wrap">
          <div class="card padding">
            <h4 class="card-title">
              Card
            </h4>
            <p>Some content inside a card.</p>
          </div>
          <div class="card-flat padding">
            <h4 class="card-title">
              Flat card
            </h4>
            <p>Some content inside a flat card.</p>
          </div>
        </div>
      </section>
    </div>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import BaseModal from "./BaseModal.vue";
import { divider, openMenu } from "@beekeeperstudio/ui-kit";
import { Tree, TreeFolder } from "@beekeeperstudio/ui-kit/vue/tree";
import { TabulatorFull } from "tabulator-tables";
import { tabulatorForTableData } from "@/common/tabulator";
import { vueEditor } from "@shared/lib/tabulator/helpers";
import NullableInputEditorVue from "@shared/components/tabulator/NullableInputEditor.vue";
import Mutators from "@/mixins/data_mutators";
import { escapeHtml } from "@shared/lib/tabulator";
import SqlTextEditor from "@beekeeperstudio/ui-kit/vue/sql-text-editor";
import MultiSelect from "@/components/common/form/MultiSelect.vue";
import LoadingSpinner from "@/components/common/loading/LoadingSpinner.vue";

const TABLE_COLUMNS = [
  { field: "id", title: "id", dataType: "int4", width: 70, cssClass: "primary-key", editable: false },
  { field: "name", title: "name", dataType: "text", editor: vueEditor(NullableInputEditorVue) },
  { field: "email", title: "email", dataType: "varchar(255)", editor: vueEditor(NullableInputEditorVue) },
  { field: "plan", title: "plan", dataType: "text", editor: vueEditor(NullableInputEditorVue) },
  { field: "created_at", title: "created_at", dataType: "timestamptz", cssClass: "read-only-field", editable: false },
];

const TABLE_DATA = [
  { id: 1, name: "Ada Lovelace", email: "ada@example.com", plan: "team", created_at: "2026-01-04" },
  { id: 2, name: "Grace Hopper", email: null, plan: "solo", created_at: "2026-02-11" },
  { id: 3, name: "Linus Torvalds", email: "linus@example.com", plan: "team", created_at: "2026-03-19" },
  { id: 4, name: "Margaret Hamilton", email: "margaret@example.com", plan: null, created_at: "2026-05-02" },
  { id: 5, name: "Ken Thompson", email: "ken@example.com", plan: "", created_at: null },
];

// Two levels of folders and no items, so every folder shows its empty state.
function treeFolders() {
  const folder = (id: string, parentId: string | null, name: string) => ({
    id,
    parentId,
    type: "folder" as const,
    name,
    draggable: false,
    children: [],
  });
  const reports = folder("folder-1", null, "Reports");
  const monthly = folder("folder-2", "folder-1", "Monthly");
  const archive = folder("folder-3", null, "Archive");
  reports.children.push(monthly);
  return [reports, monthly, archive];
}

export default Vue.extend({
  mixins: [Mutators],
  components: { BaseModal, Tree, TreeFolder, SqlTextEditor, MultiSelect, LoadingSpinner },
  data() {
    return {
      modalName: "theme-playground-modal",
      tabulator: null as TabulatorFull | null,
      hues: ["gray", "red", "orange", "yellow", "green", "blue", "purple", "pink"],
      showStepAliases: false,
      stepAliases: [
        "bg-base",
        "bg-subtle",
        "bg",
        "bg-hover",
        "bg-active",
        "border-subtle",
        "border",
        "border-hover",
        "solid-bg",
        "solid-bg-hover",
        "text",
        "text-contrast",
      ],
      switchOn: true,
      selectButtonValue: "Light",
      multiSelectQuery: "",
      multiSelectSuggestions: ["Ada Lovelace", "Grace Hopper", "Linus Torvalds", "Margaret Hamilton", "Ken Thompson"],
      multiSelectSelected: ["Grace Hopper"],
      activePill: "Columns",
      treeExpanded: ["folder-1", "folder-2", "folder-3"],
      treeFolders: treeFolders(),
      buttonVariants: ["", "btn-flat", "btn-primary"],
      buttonSizes: [{ label: "Default", cls: "" }, { label: "Small", cls: "btn-small" }],
      buttonSize: "",
      buttonColors: ["", "btn-brand", "btn-info", "btn-danger"],
      badgeColors: ["", "badge-info", "badge-success", "badge-warning", "badge-danger"],
    };
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openThemePlayground, handler: this.open }];
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
    this.tabulator?.destroy();
  },
  methods: {
    open() {
      this.$modal.show(this.modalName);
    },
    handleOpened() {
      this.tabulator = tabulatorForTableData(
        this.$refs.tabulator as HTMLElement,
        {
          persistenceID: "theme-playground",
          data: TABLE_DATA,
          columns: TABLE_COLUMNS.map(({ dataType, ...c }) => ({
            ...c,
            formatter: this.cellFormatter,
            tooltip: true,
            titleFormatter: () => `
            <span class="title">
              ${escapeHtml(c.title)}
              <span class="column-data-type">${escapeHtml(dataType)}</span>
            </span>`,
          })),
          height: "220px",
        }
      );
      this.tabulator.on("cellEdited", (cell) => {
        cell.getElement().classList.add("edited");
      });
    },
    handleClosed() {
      this.tabulator?.destroy();
      this.tabulator = null;
    },
    openSampleMenu(event: MouseEvent) {
      openMenu({
        event,
        options: [
          { label: "Open", handler: () => undefined, shortcut: "Enter" },
          { label: "Rename", handler: () => undefined, shortcut: "F2" },
          {
            label: "Export as",
            handler: () => undefined,
            items: [
              { label: "CSV", handler: () => undefined },
              { label: "JSON", handler: () => undefined },
            ],
          },
          divider,
          { id: "pin", label: "Pinned", checked: true, handler: () => undefined },
          { label: "Share", handler: () => undefined, disabled: true },
          divider,
          { label: "Delete", handler: () => undefined, class: "text-danger", icon: "delete_outline" },
        ],
      });
    },
    stepName(n: number) {
      if (this.showStepAliases) {
        return this.stepAliases[n - 1];
      }
      return String(n);
    },
    stepLabel(n: number) {
      if (this.showStepAliases) {
        return `${n}: ${this.stepAliases[n - 1]}`;
      }
      return String(n);
    },
    stepAlphaLabel(n: number) {
      if (this.showStepAliases) {
        return `${this.stepAliases[n - 1]}-a`;
      }
      return `a${n}`;
    },
    variantLabel(cls: string) {
      if (!cls) {
        return "Ghost";
      }
      const name = cls.replace(/^(btn|badge|alert)-/, "");
      return name.charAt(0).toUpperCase() + name.slice(1);
    },
  },
});
</script>

<style lang="scss" scoped>
.theme-playground {
  padding: 0.5rem 0 2rem;
  height: auto;
  overflow: visible;
}

section {
  margin-bottom: 2rem;
  max-width: 900px;
}

h3 {
  margin: 0 0 0.75rem;
}

.aliases-switch {
  margin-bottom: 0.75rem;
}

h4 {
  margin: 2rem 0 0.5rem;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--text-muted);
}

.scale-table {
  border-collapse: separate;
  border-spacing: 0.25rem;
  margin-left: -0.25rem;

  th {
    font-size: 0.8rem;
    font-weight: normal;
    color: var(--text-muted);
    text-align: center;
  }

  thead th {
    width: 3rem;
    vertical-align: bottom;
    white-space: nowrap;
  }

  thead th.alias {
    height: 3rem;
    font-size: 0.7rem;
    text-align: left;

    span {
      display: block;
      width: 0;
      transform: rotate(-30deg);
      transform-origin: left bottom;
    }
  }

  tbody th {
    text-align: left;
    text-transform: capitalize;
    white-space: nowrap;
    padding-right: 0.25rem;
  }

  td {
    padding: 0;
  }
}

.swatch {
  width: 3rem;
  height: 3rem;
  border-radius: 4px;
  position: relative;
  overflow: hidden;

  &.checker::before {
    content: "";
    position: absolute;
    inset: 0;
    background: repeating-conic-gradient(
        var(--gray-a4) 0 25%,
        transparent 0 50%
      )
      0 0 / 21px 21px;
  }

  &.checker::after {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--color);
  }
}

.variant-table {
  border-collapse: collapse;
  margin-bottom: 0.75rem;

  th {
    font-size: 0.8rem;
    font-weight: normal;
    text-align: left;
    color: var(--text-muted);
  }

  thead th {
    text-align: center;
  }

  tbody th {
    width: 5rem;
  }

  th {
    padding: 0.25rem;
    padding-left: 0;
  }

  td {
    text-align: left;
    padding: 0.5rem;
  }
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
}

.tooltip-target {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-decoration: underline dotted;
  cursor: help;
}

.context-target {
  padding: 0.75rem 1.25rem;
  border: 1px dashed var(--border);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.85rem;
  user-select: none;
}

.tree-box {
  max-width: 320px;
  padding: 0.5rem 0;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
}

.sample-table {
  height: 220px;
}

.sample-editor {
  height: 220px;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  overflow: hidden;
}

.size-picker {
  margin-bottom: 0.75rem;
}

.sample-progressbar {
  width: 12rem;
}

.row-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.card,
.card-flat {
  min-width: 220px;
}
</style>
