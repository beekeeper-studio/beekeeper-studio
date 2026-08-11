<template>
  <div class="shortcut-hints">
    <ai-shell-promo />
    <div class="shortcuts">
      <div class="shortcut-item">
        <div>{{ queryActionText(true) }}</div>
        <shortcut-display-helper shortcut-path="queryEditor.primaryQueryAction" />
      </div>
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
    </div>
    <div class="shortcuts-footer">
      <a
        href="#"
        @click.prevent="viewAllShortcuts"
      >View all shortcuts</a>
    </div>
  </div>
</template>
<script type="text/javascript">
import ShortcutDisplayHelper from './ShortcutDisplayHelper.vue';
import AiShellPromo from './AiShellPromo.vue';
import { AppEvent } from '@/common/AppEvent';

  export default {
    components: {
      ShortcutDisplayHelper,
      AiShellPromo
    },
    methods : {
      isPrimaryRunCurrentQuery() {
        return this.$bksConfig.ui.queryEditor?.primaryQueryAction.toLowerCase() === 'submitcurrentquery'
      },
      queryActionText(getPrimaryText) {
        if (getPrimaryText) {
          return this.isPrimaryRunCurrentQuery() ? 'Run Current' : 'Run All'
        }

        return this.isPrimaryRunCurrentQuery() ? 'Run All' : 'Run Current'
      },
      // The in-app modal is generated from live config, so it reflects the
      // user's own keybindings. A static page can't.
      viewAllShortcuts() {
        this.trigger(AppEvent.openKeyboardShortcuts)
      }
    }
  }
</script>
