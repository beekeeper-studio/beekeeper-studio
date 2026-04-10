<template>
  <div class="shortcuts">
    <div class="shortcut-item">
      <div>Quick Search</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>P</span>
      </div>
      <div
        class="shortcut"
        v-else
      >
        <span v-for="sc in this.getShortcut(this.$bksConfig.keybindings.general.openQuickSearch)" :key="sc">{{ sc }}</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>Autocomplete</div>
      <div class="shortcut">
        <span>Ctrl</span><span>Space</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>{{ queryActionText(true) }}</div>
      <div
        class="shortcut"
      >
        <span v-for="sc in this.getShortcut(this.$bksConfig.keybindings.queryEditor.primaryQueryAction)" :key="sc">{{ sc }}</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>{{ queryActionText(false) }}</div>
      <div
        class="shortcut"
      >
        <span v-for="sc in this.getShortcut(this.$bksConfig.keybindings.queryEditor.secondaryQueryAction)" :key="sc">{{ sc }}</span>
      </div>
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
      <div
        class="shortcut"
      >
        <span v-for="sc in this.getShortcut(this.$bksConfig.keybindings.tab.reopenLastClosedTab)" :key="sc">{{ sc }}</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>Close Tab</div>
      <div
        class="shortcut"
      >
        <span v-for="sc in this.getShortcut(this.$bksConfig.keybindings.tab.closeTab)" :key="sc">{{ sc }}</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>Find</div>
      <div
        class="shortcut"
      >
        <span>⌘</span><span>F</span>
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
  import { convertKeybinding } from '@/common/bksConfig/BksConfigProvider'

  export default {
    props: ['isMongo'],
    data() {
      return {

      }
    },
    methods : {
      getShortcut(shortcut) {
        return convertKeybinding('ui', Array.isArray(shortcut) ? shortcut[0] : shortcut, this.$bksConfig.platformInfo.platform)
      },
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
