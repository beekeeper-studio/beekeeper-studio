<template>
  <bk-buttons
    class="pending-changes-button"
    v-hotkey="hotkeys"
  >
    <bk-button
      class="btn btn-primary"
      @click.prevent="submitApply"
      style="margin:0"
    >
      <span>{{ labelApply || 'Apply' }}</span>
    </bk-button>
    <bk-button
      v-if="dialect !== 'mongodb'"
      class="btn btn-primary"
      menu
      style="margin:0"
    >
      <i class="material-icons">arrow_drop_down</i>
      <bk-menu>
        <bk-menuitem @click.prevent="submitApply">
          <bk-label>
            {{ labelApply || 'Apply' }}
          </bk-label>
          <bk-shortcut value="Control+S" />
        </bk-menuitem>
        <bk-menuitem @click.prevent="submitSql">
          <bk-label>
            {{ labelSql || 'Copy to SQL' }}
          </bk-label>
          <bk-shortcut value="Control+Shift+S" />
        </bk-menuitem>
      </bk-menu>
    </bk-button>
  </bk-buttons>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'

export default Vue.extend({
  name: 'PendingChangesButton',
  props: {
    submitApply: Function,
    submitSql: Function,
    labelApply: String,
    labelSql: String,
  },
  computed: {
    ...mapGetters(['dialect']),
    hotkeys() {
      return this.$vHotkeyKeymap({
        'general.save': this.submitApply.bind(this),
        'general.openInSqlEditor': this.submitSql.bind(this),
      })
    }
  }
})
</script>

