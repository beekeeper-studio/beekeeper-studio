<template>
  <div class="shortcuts">
    <div class="shortcut-item">
      <div>{{ $t('Quick Search') }}</div>
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
      <div>{{ $t('Autocomplete') }}</div>
      <div class="shortcut">
        <span>Ctrl</span><span>Space</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>{{ $t('Run') }}</div>
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
      <div>{{ $t('Run Current') }}</div>
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
      <div>{{ $t('New Window') }}</div>
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
      <div>{{ $t('New Tab') }}</div>
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
      <div>{{ $t('Reopen Closed Tabs') }}</div>
      <div
        class="shortcut"
        v-if="$config.isMac"
      >
        <span>⌘</span><span>⇧</span><span>T</span>
      </div>
      <div 
        class="shortcut"
        v-else
      >
        <span>Ctrl</span><span>⇧</span><span>T</span>
      </div>
    </div>
    <div class="shortcut-item">
      <div>{{ $t('Close Tab') }}</div>
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
      <div>{{ $t('Find') }}</div>
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
      <div>{{ $t('Find and Replace') }}</div>
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
  }
</script>
