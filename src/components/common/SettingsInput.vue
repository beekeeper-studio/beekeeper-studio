<template>
  <div
    class="form-group settings-input"
    v-if="setting"
  >
    <label :for="settingKey">{{ title }}</label>
    <file-picker
      v-if="inputType === 'file'"
      v-model="value"
    />
    <file-picker
      v-else-if="inputType === 'directory'"
      v-model="value"
      :options="{properties: ['openDirectory']}"
      button-text="Choose Directory"
    />
    <input
      v-else
      type="text"
      v-model="value"
    >
    <small
      v-if="help"
      class="help text-muted"
    >{{ help }}</small>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import _ from 'lodash'
import { mapState } from 'vuex'
import FilePicker from './form/FilePicker.vue'
export default Vue.extend({
  components: { FilePicker },
  props: ['settingKey', 'title', 'inputType', 'help'],
  data: () => ({

  }),
  computed: {
    ...mapState('settings', {'settings': 'settings'} ),
    setting() {
      return this.settings[this.settingKey]
    },
    value: {
      set(newValue) {
        this.setting.value = newValue
        this.saveSetting()
      },
      get() {
        return this.setting.value
      }
    }
  },
  methods: {
    saveSetting: _.debounce(async function() {
      if (!this.setting) return
      await this.$store.dispatch('settings/saveSetting', this.setting)
      this.$emit('changed', this.value)
    }, 500)
  },
  async beforeMount() {
    if (!this.setting) {
      const nu = await this.$util.send('appdb/setting/new');
      nu.key = this.settingKey
      this.$store.dispatch('settings/saveSetting', nu)
    }
  }
})
</script>

<style lang="scss">
.settings-input {
  .help {
    margin-top: 0.2rem;
  }
}
</style>
