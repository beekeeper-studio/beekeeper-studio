<template>
  <div class="shortcuts">
    <div class="shortcut-item">
      <div>Quick Search</div>
      <div
        class="shortcut"
        v-html="getHtmlForKeybinds('general.openQuickSearch')"
      >
      </div>
    </div>
    <div class="shortcut-item">
      <div>Autocomplete</div>
      <div class="shortcut">
        <span>Ctrl</span><span>Space</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>Run</div>
      <div
        class="shortcut"
        v-html="getHtmlForKeybinds('queryEditor.submitTabQuery')"
      >
      </div>
    </div>
    <div class="shortcut-item">
      <div>Run Current</div>
      <div
        class="shortcut"
        v-html="getHtmlForKeybinds('queryEditor.submitCurrentQuery')"
      >
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
        <span>Ctrl</span><span>Shift</span><span>N</span>
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
        v-html="getHtmlForKeybinds('tab.reopenLastClosedTab')"
      >
      </div>
    </div>
    <div class="shortcut-item">
      <div>Close Tab</div>
      <div
        class="shortcut"
        v-html="getHtmlForKeybinds('tab.closeTab')"
      >
      </div>
    </div>
    <div class="shortcut-item">
      <div>Find</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>F</span>
      </div>
      <div
        class="shortcut"
        v-else
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
  export default {
    props: ['isMongo'],
    data() {
      return {

      }
    },
    methods: {
      getHtmlForKeybinds(path) {
        const formatted = this.$formatKeybindHint(path, false)
        return formatted
          .split('+')
          .map((k) => {
            if (this.$config.isMac) {
              switch (k) {
                case 'Meta':
                  return '⌘';
                case 'Shift':
                  return '⇧';
                default:
                  return k;
              }
            } else {
              return k;
            }
          })
          .map((k) => `<span>${k}</span>`)
          .join('');
      }
    }
  }
</script>
