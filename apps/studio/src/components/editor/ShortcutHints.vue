<template>
  <div class="shortcuts">
    <div class="shortcut-item">
      <div>Quick Search</div>
      <shortcut-display-helper shortcut-path="general.openQuickSearch" />
    </div>
    <div class="shortcut-item">
      <div>Autocomplete</div>
      <div class="shortcut">
        <span>Ctrl</span><span>Space</span>
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
    <div class="shortcut-item">
      <div>New Window</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>⇧</span><span>N</span>
      </div>
      <div
        class="shortcut"
        v-else
      >
        <span>Ctrl</span><span>⇧</span><span>N</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>New Tab</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>T</span>
      </div>
      <div
        class="shortcut"
        v-else
      >
        <span>Ctrl</span><span>T</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>Reopen Closed Tabs</div>
      <shortcut-display-helper shortcut-path="tab.reopenLastClosedTab" />
    </div>
    <div class="shortcut-item">
      <div>Close Tab</div>
      <shortcut-display-helper shortcut-path="tab.closeTab" />
    </div>
    <div class="shortcut-item">
      <div>Find</div>
      <div
        v-if="$config.isMac"
        class="shortcut"
      >
        <span>⌘</span><span>F</span>
      </div>
      <div
        v-else
        class="shortcut"
      >
        <span>Ctrl</span><span>F</span>
      </div>

    </div>
    <div v-if="!isMongo" class="shortcut-item">
      <div>Find and Replace</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>R</span>
      </div>
      <div
        class="shortcut"
        v-else
      >
        <span>Ctrl</span><span>R</span>
      </div>
    </div>
  </div>
</template>
<script type="text/javascript">
import ShortcutDisplayHelper from './ShortcutDisplayHelper.vue';

  export default {
    props: ['isMongo'],
    components: {
      ShortcutDisplayHelper
    },
    methods : {
      isPrimaryRunCurrentQuery() {
        const { settings: configSettings } = this.$bksConfig
        return configSettings.queryEditor?.primaryQueryAction.toLowerCase() === 'submitcurrentquery'
      },
      queryActionText(getPrimaryText) {
        if (getPrimaryText) {
          return this.isPrimaryRunCurrentQuery() ? 'Run Current' : 'Run All/Selection'
        }

        return this.isPrimaryRunCurrentQuery() ? 'Run All/Selection' : 'Run Current'
      }
    }
  }
</script>
