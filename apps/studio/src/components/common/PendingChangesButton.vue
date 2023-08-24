<template>
  <x-buttons
    class="pending-changes-button"
    v-hotkey="hotkeys"
  >
    <x-button
      class="btn btn-primary"
      @click.prevent="submitApply"
      style="margin:0"
    >
      <span>{{ labelApply || 'Apply' }}</span>
    </x-button>
    <x-button
      class="btn btn-primary"
      menu
      style="margin:0"
    >
      <i class="material-icons">arrow_drop_down</i>
      <x-menu>
        <x-menuitem @click.prevent="submitApply">
          <x-label>
            {{ labelApply || 'Apply' }}
          </x-label>
          <x-shortcut value="Control+S" />
        </x-menuitem>
        <x-menuitem @click.prevent="submitSql">
          <x-label>
            {{ labelSql || 'Copy to SQL' }}
          </x-label>
          <x-shortcut value="Control+Shift+S" />
        </x-menuitem>
      </x-menu>
    </x-button>
  </x-buttons>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
    name: 'PendingChangesButton',
    props: {
        submitApply: Function,
        submitSql: Function,
        labelApply: String,
        labelSql: String,
    },
    computed: {
        hotkeys() {
            const result = {}
            result[this.ctrlOrCmd('s')] = this.submitApply.bind(this)
            result[this.ctrlOrCmd('shift+s')] = this.submitSql.bind(this)
            return result
        }
    }
})
</script>

