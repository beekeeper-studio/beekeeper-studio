<template>
  <span class="theme-preview-scope" :data-theme-preview="themeId">
    <link
      rel="stylesheet"
      :href="`theme://${themeId}.css?preview&t=${reloadedAt}`"
    >
    <span
      class="theme-preview"
      :class="[`theme-${themeId}`, dark ? 'dark-theme' : 'light-theme']"
    >
      <span class="titlebar-preview">
        <span v-if="$config.isMac" class="traffic-lights">
          <span class="traffic-light close" />
          <span class="traffic-light minimize" />
          <span class="traffic-light maximize" />
        </span>
        <span class="title">Beekeeper Studio</span>
        <span class="titlebar-actions">
          <template v-if="!$config.isMac">
            <i class="material-icons">remove</i>
            <i class="material-icons">crop_square</i>
            <i class="material-icons">clear</i>
          </template>
        </span>
      </span>
      <span class="workspace-preview">
        <span class="sidebar-preview">
          <span class="heading">Entities</span>
          <span class="table-item">
            <i class="material-icons table-icon">grid_on</i>
            <span class="name">users</span>
          </span>
          <span class="table-item">
            <i class="material-icons table-icon">grid_on</i>
            <span class="name">orders</span>
          </span>
          <span class="table-item">
            <i class="material-icons view-icon">grid_on</i>
            <span class="name">active_users</span>
          </span>
        </span>
        <span class="query-editor-preview">
          <span class="tabs-preview">
            <span class="tab active">
              <i class="material-icons query">code</i>
              Query #1
            </span>
            <span class="tab">
              <i class="material-icons table-icon">grid_on</i>
              users
            </span>
          </span>
          <span class="editor-preview">
            <span class="line">
              <span class="gutter">1</span>
              <span class="kw">SELECT</span> * <span class="kw">FROM</span> users
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
          <table class="result-preview">
            <thead>
              <tr>
                <th class="range-highlight range-bottom">id</th>
                <th class="range-highlight range-bottom">name</th>
                <th>role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="range-selected range-top range-left">1</td>
                <td class="range-selected range-top range-right">alice</td>
                <td>admin</td>
              </tr>
              <tr>
                <td class="range-selected range-bottom range-left">2</td>
                <td
                  class="range-selected range-bottom range-right range-handle"
                >
                  bob
                </td>
                <td>admin</td>
              </tr>
              <tr>
                <td>3</td>
                <td>carol</td>
                <td>admin</td>
              </tr>
            </tbody>
          </table>
        </span>
      </span>
      <span class="statusbar-preview">
        <i class="material-icons">link</i>
        <span class="name">my_database</span>
        <i class="material-icons settings">settings</i>
      </span>
    </span>
  </span>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  props: {
    themeId: {
      type: String,
      required: true,
    },
    dark: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      reloadedAt: 0,
    };
  },
  mounted() {
    if (import.meta.hot) {
      import.meta.hot.on("theme-css-update", this.reloadStylesheet);
    }
  },
  beforeDestroy() {
    if (import.meta.hot) {
      import.meta.hot.off("theme-css-update", this.reloadStylesheet);
    }
  },
  methods: {
    reloadStylesheet() {
      this.reloadedAt = Date.now();
    },
  },
});
</script>

<style scoped lang="scss">
.theme-preview-scope {
  display: block;
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
    position: relative;
    display: flex;
    align-items: center;
    padding: 0.3em 0.6em;
    font-size: 0.85em;
    color: var(--titlebar-fg);
    background: var(--titlebar-bg);

    .title {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
    }

    .traffic-lights {
      display: flex;
      gap: 0.4em;
    }

    .traffic-light {
      width: 0.8em;
      height: 0.8em;
      border-radius: 50%;

      &.close {
        background: #ff5f57;
      }

      &.minimize {
        background: #febc2e;
      }

      &.maximize {
        background: #28c840;
      }
    }

    .titlebar-actions {
      display: flex;
      align-items: center;
      gap: 0.5em;
      margin-left: auto;

      i {
        font-size: 1.3em;
        margin: 0;
      }
    }
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
        color: var(--icon-table-fg);

        &.view-icon {
          color: var(--icon-view-fg);
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
        color: var(--icon-table-fg);
      }

      .query {
        color: var(--icon-query-fg);
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
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    border-top: 1px solid var(--border-subtle);

    th,
    td {
      padding: 0 0.25em;
      text-align: left;

      &:first-child {
        width: 2.25em;
        padding-left: 0.5em;
      }
    }

    th {
      font-weight: 600;
      color: var(--text-contrast);
      border-bottom: 1px solid var(--border-subtle);
    }

    tbody tr:nth-child(odd) {
      background-color: var(--bg-subtle-a);
    }

    th.range-highlight {
      color: var(--table-header-highlight-fg);
      background: var(--table-header-highlight-bg);
    }

    td, th {
      &.range-selected {
        background: var(--table-cell-selected-bg);
      }

      &.range-bottom {
        border-bottom: 1px solid var(--table-range-border);
      }

      &.range-left {
        border-left: 1px solid var(--table-range-border);
      }

      &.range-right {
        border-right: 1px solid var(--table-range-border);
      }

      &.range-handle {
        position: relative;

        &::after {
          content: "";
          position: absolute;
          right: -3px;
          bottom: -3px;
          z-index: 1;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--table-range-handle-bg);
        }
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
