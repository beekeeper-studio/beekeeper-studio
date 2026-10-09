<template>
  <div class="shortcut-hints">
    <div class="shortcuts">
      <div class="shortcut-item">
        <div>Quick Search</div>
        <shortcut-display-helper shortcut-path="general.openQuickSearch" />
      </div>
      <template v-if="type === 'core-tabs'">
        <div class="shortcut-item">
          <div>New Tab</div>
          <div class="shortcut">
            <span>{{ $config.isMac ? '⌘' : 'Ctrl' }}</span><span>T</span>
          </div>
        </div>
        <div class="shortcut-item">
          <div>Reopen Last Closed Tab</div>
          <shortcut-display-helper shortcut-path="tab.reopenLastClosedTab" />
        </div>
        <div class="shortcut-item">
          <div>Toggle Primary Sidebar</div>
          <div class="shortcut" v-if="$config.isMac">
            <span>⌘</span><span>B</span>
          </div>
          <div class="shortcut" v-else>
            <span>Alt</span><span>S</span>
          </div>
        </div>
        <div class="shortcut-item">
          <div>New Window</div>
          <div class="shortcut">
            <span>{{ $config.isMac ? '⌘' : 'Ctrl' }}</span><span>⇧</span><span>N</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="shortcut-item">
          <div>Autocomplete</div>
          <div class="shortcut">
            <span>Ctrl</span><span>Space</span>
          </div>
        </div>
        <div class="shortcut-item">
          <div>Format Query</div>
          <div class="shortcut">
            <span>{{ $config.isMac ? '⌘' : 'Ctrl' }}</span><span>⇧</span><span>F</span>
          </div>
        </div>
        <div class="shortcut-item">
          <div>{{ queryActionText(true) }}</div>
          <shortcut-display-helper shortcut-path="queryEditor.primaryQueryAction" />
        </div>
        <div class="shortcut-item">
          <div>{{ queryActionText(false) }}</div>
          <shortcut-display-helper shortcut-path="queryEditor.secondaryQueryAction" />
        </div>
      </template>
    </div>
    <button
      class="btn btn-small btn-link btn-view-all"
      @click="openKeyboardShortcuts"
    >View all shortcuts ...</button>
  </div>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent';
import ShortcutDisplayHelper from './ShortcutDisplayHelper.vue';

type ShortcutHintsType = 'core-tabs' | 'query-editor'

  export default {
    props: {
      type: {
        required: true,
        type: String as () => ShortcutHintsType
      }
    },
    components: {
      ShortcutDisplayHelper
    },
    methods : {
      openKeyboardShortcuts() {
        this.trigger(AppEvent.openKeyboardShortcuts)
      },
      isPrimaryRunCurrentQuery() {
        return this.$bksConfig.ui.queryEditor?.primaryQueryAction.toLowerCase() === 'submitcurrentquery'
      },
      queryActionText(getPrimaryText) {
        if (getPrimaryText) {
          return this.isPrimaryRunCurrentQuery() ? 'Run Current' : 'Run All'
        }

        return this.isPrimaryRunCurrentQuery() ? 'Run All' : 'Run Current'
      }
    }
  }
</script>
<style lang="scss" scoped>
.btn.btn-view-all {
  margin-top: 0.5rem;
  margin-left: -0.25rem;
  color: var(--text-lighter);
}
</style>
