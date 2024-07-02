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
        <span>Ctrl</span><span>P</span>
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
        v-if="$config.isMac"
      >
        <span>⌘</span><span>Enter</span>
      </div>
      <div
        class="shortcut"
        v-else
      >
        <span>Ctrl</span><span>Enter</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>Run Current</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>⇧</span><span>Enter</span>
      </div>
      <div
        class="shortcut"
        v-else
      >
        <span>Ctrl</span><span>Shift</span><span>Enter</span>
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
      <div>Close Tab</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>W</span>
      </div>
      <div
        class="shortcut"
        v-else
      >
        <span>Ctrl</span><span>W</span>
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
    <div class="shortcut-item">
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
    data() {
      return {

      }
    },
  }
</script>
