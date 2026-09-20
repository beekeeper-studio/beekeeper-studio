<template>
  <base-modal :name="modalName">
    <template #title>Appearance</template>
    <div class="form-group">
      <label for="theme-mode">Mode</label>
      <x-buttons class="selectbutton" id="theme-mode">
        <x-button
          :toggled="themeAppearance === 'light'"
          @click.prevent="setThemeDark('light')"
        >
          <span class="togglebutton-content">Light</span>
        </x-button>
        <x-button
          :toggled="themeAppearance === 'dark'"
          @click.prevent="setThemeDark('dark')"
        >
          <span class="togglebutton-content">Dark</span>
        </x-button>
        <x-button
          :toggled="themeAppearance === 'auto'"
          @click.prevent="setThemeDark('auto')"
        >
          <span class="togglebutton-content">Auto</span>
        </x-button>
      </x-buttons>
    </div>
    <div class="form-group">
      <label>Theme</label>
      <div class="theme-list">
        <label
          v-for="theme in themes"
          :key="theme.id"
          class="theme-item"
          :class="{ selected: themeId === theme.id }"
        >
          <span class="theme-preview-frame">
            <span
              class="theme-preview"
              :class="[
                `theme-${theme.id}`,
                themeDark ? 'dark-theme' : 'light-theme',
              ]"
            >
              <span class="titlebar-preview">
                <span class="title">Beekeeper Studio</span>
              </span>
              <span class="workspace-preview">
                <span class="sidebar-preview">
                  <span class="heading">Entities</span>
                  <span
                    v-for="table in previewTables"
                    :key="table.name"
                    class="table-item"
                  >
                    <i
                      class="material-icons"
                      :class="`${table.entityType}-icon`"
                      >grid_on</i
                    >
                    <span class="name">{{ table.name }}</span>
                  </span>
                </span>
                <span class="query-editor-preview">
                  <span class="tabs-preview">
                    <span
                      v-for="tab in previewTabs"
                      :key="tab.name"
                      class="tab"
                      :class="{ active: tab.active }"
                    >
                      <i class="material-icons" :class="tab.iconClass">{{
                        tab.icon
                      }}</i>
                      {{ tab.name }}
                    </span>
                  </span>
                  <span class="editor-preview">
                    <span class="line">
                      <span class="gutter">1</span>
                      <span class="kw">SELECT</span> *
                      <span class="kw">FROM</span> users
                    </span>
                    <span class="line">
                      <span class="gutter">2</span>
                      <span class="kw">WHERE</span> role =
                      <span class="str">'admin'</span>
                    </span>
                    <span class="line">
                      <span class="gutter">3</span>
                      <span class="kw">LIMIT</span> <span class="num">3</span>
                    </span>
                    <span class="actions">
                      <span class="btn-primary-preview"> Run </span>
                    </span>
                  </span>
                  <span class="result-preview">
                    <span class="table-row header">
                      <span v-for="col in previewColumns" :key="col">{{
                        col
                      }}</span>
                    </span>
                    <span
                      v-for="(row, i) in previewRows"
                      :key="i"
                      class="table-row"
                    >
                      <span v-for="(cell, j) in row" :key="j">{{ cell }}</span>
                    </span>
                  </span>
                </span>
              </span>
              <span class="statusbar-preview">
                <i class="material-icons">link</i>
                <span class="name">my_database</span>
                <i class="material-icons settings">settings</i>
              </span>
            </span>
          </span>
          <span class="theme-name checkbox-group">
            <input
              type="radio"
              name="theme-name"
              :value="theme.id"
              :checked="themeId === theme.id"
              @change="setThemeId(theme.id)"
            />
            <span>{{ theme.label }}</span>
          </span>
        </label>
      </div>
    </div>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapActions, mapGetters, mapState } from "vuex";
import { AppEvent } from "@/common/AppEvent";
import BaseModal from "@/components/common/modals/BaseModal.vue";

export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "appearance-modal",
      previewTables: [
        { name: "users", entityType: "table" },
        { name: "orders", entityType: "table" },
        { name: "active_users", entityType: "view" },
      ],
      previewTabs: [
        { name: "Query #1", icon: "code", iconClass: "query", active: true },
        { name: "users", icon: "grid_on", iconClass: "table-icon" },
      ],
      previewColumns: ["id", "name", "role"],
      previewRows: [
        [1, "alice", "admin"],
        [2, "bob", "admin"],
        [3, "carol", "admin"],
      ],
    };
  },
  computed: {
    ...mapState("theme", ["themes"]),
    ...mapGetters({
      themeId: "theme/id",
      themeAppearance: "theme/appearance",
      themeDark: "theme/dark",
    }),
    rootBindings() {
      return [{ event: AppEvent.openAppearanceModal, handler: this.open }];
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    ...mapActions("theme", {
      setThemeDark: "setDark",
      setThemeId: "setId",
    }),
    open() {
      this.$modal.show(this.modalName);
    },
  },
});
</script>

<style scoped lang="scss">
.theme-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding-bottom: 0.5rem;
}

.form-group label.theme-item {
  display: flex;
  flex-direction: column;
  padding: 0;
  cursor: pointer;
  align-items: flex-start;

  .theme-preview-frame {
    border: 2px solid var(--border-subtle);
    border-radius: 4px;
    overflow: hidden;
  }

  &.selected .theme-preview-frame {
    border-color: var(--primary-solid-bg);
  }

  .theme-name {
    padding-block: 0.5rem;

    input[type="radio"] {
      display: none;
    }
  }
}

.theme-preview-frame {
  width: 100%;
}

.theme-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  font-size: 0.75rem;
  line-height: 1.6;
  min-width: 0;
  color: var(--app-fg);
  background: var(--app-bg);

  .titlebar-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-block: 0.3em;
    font-size: 0.85em;
    color: var(--titlebar-fg);
    background: var(--titlebar-bg);
  }

  .statusbar-preview {
    display: flex;
    align-items: center;
    gap: 0.4em;
    padding: 0.3em 0.75em;
    font-size: 0.85em;
    color: var(--text-contrast);

    .material-icons {
      font-size: 1.2em;
      margin: 0;
    }

    .settings {
      margin-left: auto;
      color: var(--text);
    }
  }

  .workspace-preview {
    display: flex;

    > * {
      flex: 1 1 0;
      min-width: 0;
    }
  }

  .sidebar-preview {
    display: flex;
    flex: 0 0 8.25em;
    flex-direction: column;
    padding: 0.5em 0.75em;
    font-size: 0.85em;
    color: var(--sidebar-fg);
    background: var(--sidebar-bg);

    .heading {
      font-weight: bold;
      color: var(--text-contrast);
      margin-bottom: 0.5em;
    }

    .table-item {
      display: flex;
      align-items: center;
      gap: 0.5em;
      padding-block: 0.15em;

      .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .material-icons {
        font-size: 1.2em;
        margin: 0;
        color: var(--primary-text);

        &.view-icon {
          color: var(--info-solid-bg);
        }
      }
    }
  }

  .query-editor-preview {
    display: flex;
    flex-direction: column;
  }

  .tabs-preview {
    display: flex;
    gap: 1px;
    padding: 0.5em 0.5em 0;
    background: var(--tabs-header-bg);

    .tab {
      display: flex;
      align-items: center;
      gap: 0.4em;
      padding: 0.2em 0.8em;
      font-size: 0.85em;
      border-radius: 4px 4px 0 0;
      color: var(--tab-fg);
      background: var(--tab-bg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.active {
        font-weight: 600;
        color: var(--tab-active-fg);
        background: var(--tab-active-bg);
      }

      .material-icons {
        font-size: 1.2em;
        margin: 0;
      }

      .table-icon {
        color: var(--primary-text);
      }

      .query {
        color: var(--info-text);
      }
    }
  }

  .editor-preview {
    display: flex;
    flex-direction: column;
    padding: 0.5em 0.25em;
    font-family: var(--font-family-mono);
    color: var(--editor-fg, var(--text-contrast));
    background-color: var(--bg-base);
    white-space: nowrap;

    .line {
      display: flex;
      gap: 0.5em;
    }

    .gutter {
      width: 1em;
      text-align: right;
      color: var(--editor-linenumber-fg, var(--text));
    }

    .kw {
      color: var(--editor-keyword-fg, var(--info-text));
    }

    .str {
      color: var(--editor-string-fg, var(--primary-text));
    }

    .num {
      color: var(--editor-number-fg, var(--primary-text));
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5em;
    }
  }

  .result-preview {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--border-subtle);

    .table-row {
      display: grid;
      grid-template-columns: 1.5em 1fr 1fr;
      gap: 0.5em;
      padding-inline: 0.5em;

      &.header {
        font-weight: 600;
        color: var(--text-contrast);
        box-shadow: 0 1px var(--border-subtle);
      }

      &:nth-child(even) {
        background-color: var(--bg-subtle-a);
      }
    }
  }

  .btn-primary-preview {
    padding: 0 0.65em;
    line-height: 1.4;
    border-radius: 0.5em;
    font-weight: bold;
    color: var(--btn-primary-fg);
    background: var(--btn-primary-bg);
  }
}
</style>
