<template>
  <div
    class="nav-item-wrap"
    v-hotkey="keymap"
  >
    <li
      class="nav-item"
      :title="title + scope"
      @contextmenu="$emit('contextmenu', $event)"
    >
      <a
        class="nav-link"
        @mousedown="mousedown"
        @click.middle.prevent="maybeClose"
        @contextmenu="$bks.openMenu({id: headerContextMenuId, item: tab, options: contextOptions, event: $event})"
        :class="{ active: selected, 'active-transaction': isTransaction }"
      >
        <tab-icon :tab="tab" />
        <span
          class="tab-title truncate"
          :title="title + (!$store.getters.minimalMode ? scope : '')"
        >{{ title }} <span
          v-if="scope && !$store.getters.minimalMode"
          class="tab-title-scope"
        >{{ scope }}</span></span>
        <div class="tab-action">
          <span
            class="tab-close"
            @mouseenter="hover=true"
            @mouseleave="hover=false"
            @mousedown.stop="doNothing"
            @click.prevent.stop="maybeClose"
          >
            <i
              class="material-icons close"
              v-if="hover || !closeIcon"
            >close</i>
            <i
              class="material-icons unsaved"
              v-else
            >{{ closeIcon }}</i>
          </span>
        </div>
      </a>
    </li>
    <portal to="modals">
      <modal
        :name="modalName"
        class="beekeeper-modal vue-dialog sure header-sure"
        @opened="sureOpened"
        @closed="sureClosed"
        @before-open="beforeOpened"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">
            Really close <span class="tab-like"><tab-icon
              :tab="tab"
              :force-icon="true"
            /> {{ this.tab.title }}</span>?
          </div>
          <p>{{ tab.isRunning ? 'There is an active process still running. Closing the tab now will force it to stop and could result in catastrophe.' : 'You will lose unsaved changes' }}</p>
        </div>
        <div class="vue-dialog-buttons">
          <span class="expand" />
          <button
            ref="no"
            @click.prevent="$modal.hide(modalName)"
            class="btn btn-sm btn-flat"
          >
            Cancel
          </button>
          <button
            @focusout="sureOpen && $refs.no && $refs.no.focus()"
            @click.prevent="closeForReal"
            class="btn btn-sm btn-primary"
          >
            Close Tab
          </button>
        </div>
      </modal>
    </portal>
  </div>
</template>
<script>
import TabIcon from './tab/TabIcon.vue'
import { mapState } from 'vuex'
import _ from 'lodash'

  export default {
  components: { TabIcon },
    props: ['tab', 'tabsCount', 'selected'],
    data() {
      return {
        unsaved: false,
        hover: false,
        sureOpen: false,
        lastFocused: null
      }
    },
    methods: {
      beforeOpened() {
        this.lastFocused = document.activeElement
      },
      sureOpened() {
        this.sureOpen = true
        this.$refs.no?.focus()
      },
      sureClosed() {
        this.sureOpen = false
        if (this.lastFocused) {
          this.lastFocused.focus()
        }
      },
      closeForReal() {
        this.$modal.hide(this.modalName)
        this.$nextTick(() => {
          this.$emit(this.tab.isRunning ? 'forceClose' : 'close', this.tab)
        })
      },
      async maybeClose(event) {
        event.stopPropagation()
        event.preventDefault()
        this.$emit('close', this.tab)
      },
      doNothing() {
        // Empty on purpose
      },
      mousedown(e) {
        if (e.which === 1) {
          this.$emit('click', this.tab)
        }
      }
    },
    watch: {
      activeTab() {
        if(!this.activeTab){
           return;
         }
         const { schemaName, tabType, tableName } = this.activeTab;
         const newSelectedSidebarItem = `${tabType}.${schemaName}.${tableName}`;
         this.$store.commit('selectSidebarItem', newSelectedSidebarItem);
      },
    },
    computed: {
      ...mapState('tabs', { 'activeTab': 'active' }),
      headerContextMenuId() {
        // "tab.query.header", "tab.table.header", "tab.tableProperties.header", etc..
        return `tab.${_.camelCase(this.tab.tabType)}-header`
      },
      contextOptions() {
        const copyNameClass = (this.tab.tabType === "table" || this.tab.tabType === "table-properties") ? "" : "disabled";

        const devOptions = []
        if (this.tab.tabType === "plugin-shell" || this.tab.tabType === "plugin-base") {
          devOptions.push({ name: "[DEV] Reload plugin view", slug: 'dev-reload-plugin-view', handler: ({item}) => this.$emit('reloadPluginView', item) })
        }

        return [
          { name: "Close", slug: 'close', handler: ({event}) => this.maybeClose(event)},
          { name: "Close Others", slug: 'close-others', handler: ({item}) => this.$emit('closeOther', item)},
          { name: 'Close All', slug: 'close-all', handler: ({item}) => this.$emit('closeAll', item)},
          { name: "Close Tabs to Right", slug: 'close-to-right', handler: ({item}) => this.$emit('closeToRight', item)},
          { name: "Duplicate", slug: 'duplicate', handler: ({item}) => this.$emit('duplicate', item) },
          { name: "Copy Entity Name", slug: 'copy-name', handler: ({item}) => this.$emit('copyName', item), class: copyNameClass },
          ...(window.platformInfo.isDevelopment ? devOptions : []),
        ];
      },
      modalName() {
        return `sure-${this.tab.id}`
      },
      closeIcon() {
        if (this.tab.alert) return 'error_outline'
        if (this.tab.unsavedChanges) return 'fiber_manual_record'
        return null
      },
      keymap() {
        if (!this.selected) return {}

        return this.$vHotkeyKeymap({
          'tab.closeTab': this.maybeClose,
        })
      },
      cleanText() {
        // no spaces
        if (!this.tab.text) {
          return null
        }
        const result = this.tab.text.replace(/\s+/, '')
        return result.length === 0 ? null : result
      },
      scope() {
        if (this.tab.titleScope) {
          return ' ' + '[' + this.tab.titleScope + ']'
        } else {
          return ''
        }
      },
      tableTabTitle() {
        if (!this.tab.tabType === 'table') return null;
        let result = this.tab.table.name
        return result
      },
      queryTabTitle() {
        if (!this.tab.tabType === 'query') return null
        if (this.tab.query && this.tab.query.title) {
          return this.tab.query.title
        }
        if (!this.cleanText) {
          return this.tab.title
        }

        if (this.tab.query.text.length >= 32) {
          return `${this.tab.query.text.substring(0, 32)}...`
        } else {
          return this.tab.query.text
        }
      },
      title() {
        return this.queryTabTitle || this.tableTabTitle || "Unknown"
      },
      isTransaction() {
        return this.tab.isTransaction === true;
      }
    }
  }

</script>
