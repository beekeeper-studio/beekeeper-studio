<template>
  <div
    class="nav-item-wrap"
    v-hotkey="keymap"
  >
    <li
      class="nav-item"
      :title="title + scope"
      @contextmenu="$emit('contextmenu', $event)"
      @mouseenter="showTooltip('Double click to refresh')"
      @mouseleave="hideTooltip"
    >
      <a
        class="nav-link"
        @mousedown="mousedown"
        @dblclick="handleDoubleClick"
        @click.middle.prevent="maybeClose"
        @contextmenu="$bks.openMenu({item: tab, options: contextOptions, event: $event})"
        :class="{ active: selected }"
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
          <span v-if="isLoading" class="loading-spinner">
            <svg class="spinner-svg" viewBox="0 0 50 50">
              <circle class="spinner-path" cx="25" cy="25" r="20" fill="none" stroke-width="4"/>
            </svg>
          </span>
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
    <div 
      v-if="tooltip.visible"
      class="tooltip"
    >
      {{ tooltip.message }}
    </div>
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

  export default {
  components: { TabIcon },
    props: ['tab', 'tabsCount', 'selected'],
    data() {
      return {
        unsaved: false,
        hover: false,
        sureOpen: false,
        lastFocused: null,
        isLoading: false,
        tooltip: {
          visible: false,
          timeout: null,
          message: '',
        },
      }
    },
    methods: {
      showTooltip(message) {
        this.tooltipTimeout = setTimeout(() => {
          if (this.tab.tabType === 'table') {
            this.tooltip.visible = true;
            this.tooltip.message = message;

            this.$nextTick(() => {
              const tooltipElement = document.querySelector('.tooltip');
              const rect = this.$el.getBoundingClientRect(); // Get the position of the tab header

              // Dynamically set the tooltip's position to align with the center of the tab header
              tooltipElement.style.top = `${rect.top - tooltipElement.offsetHeight}px`;
              tooltipElement.style.left = `${rect.left + rect.width / 2 - tooltipElement.offsetWidth / 2}px`;
            });
          }
        }, 1000);
      },
      hideTooltip() {
        clearTimeout(this.tooltipTimeout);
        this.tooltip.visible = false;
      },
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
      },
      handleDoubleClick(e) {
        if (e.which === 1 || e.button === 0) {
          if (this.tab.tabType === 'table') {
            // Set loading indicator state
            this.isLoading = true;
            setTimeout(() => {
              // Reset loading indicator state after a time period
              this.isLoading = false;
            }, 1000);
            // Emit dbclick signal to CoreTabs
            this.$emit('dblclick', this.tab);
          }
        }
      },
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
      contextOptions() {
        const copyNameClass = (this.tab.tabType === "table" || this.tab.tabType === "table-properties") ? "" : "disabled";

        return [
          { name: "Close", slug: 'close', handler: ({event}) => this.maybeClose(event)},
          { name: "Close Others", slug: 'close-others', handler: ({item}) => this.$emit('closeOther', item)},
          { name: 'Close All', slug: 'close-all', handler: ({item}) => this.$emit('closeAll', item)},
          { name: "Close Tabs to Right", slug: 'close-to-right', handler: ({item}) => this.$emit('closeToRight', item)},
          { name: "Duplicate", slug: 'duplicate', handler: ({item}) => this.$emit('duplicate', item) },
          { name: "Copy Entity Name", slug: 'copy-name', handler: ({item}) => this.$emit('copyName', item), class: copyNameClass }
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
    }
  }

</script>

<style scoped>

.nav-item {
  position: relative;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.nav-item:hover {
  transform: scale(1.1);
  background-color: rgba(255, 255, 255, 0.2);
}

.tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 5px 7px 5px 8px;
  border-radius: 10px 10px 0 0;
  font-size: 0.8em;
  white-space: nowrap;
  z-index: 1000;
  pointer-events: none;
  text-align: center;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Change the position and size of the loading indicator */
.spinner-svg {
  margin-right: 17px;
  margin-top: 10px;
  width: 10px;
  height: 10px;
  animation: rotate 2s linear infinite;
}

/* Change the color of the loading indicator */
.spinner-path {
  stroke: #ffffff;
  stroke-linecap: round;
  stroke-dasharray: 90, 150;
  stroke-dashoffset: 0;
  transform-origin: center;
  animation: dash 1.5s ease-in-out infinite;
}

@keyframes rotate {
  100% { transform: rotate(360deg); }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}
</style>