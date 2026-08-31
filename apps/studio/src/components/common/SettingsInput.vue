<template>
  <div
    class="form-group settings-input"
    v-if="setting"
  >
    <label :for="settingKey">{{ title }}</label>

    <!-- Filled state: show compact card for file/directory inputs -->
    <div
      v-if="isPathInput && hasValue"
      class="settings-input-filled"
    >
      <div class="settings-input-filled-card">
        <i class="material-icons settings-input-filled-icon">check_circle</i>
        <span class="settings-input-filled-path" :title="value">{{ value }}</span>
        <button
          class="settings-input-clear-btn"
          type="button"
          title="Clear"
          @click.prevent="clearValue"
        >
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>

    <!-- Empty state for file/directory inputs -->
    <template v-else-if="isPathInput">
      <div class="settings-input-empty">
        <file-picker
          ref="filePicker"
          v-model="value"
          :default-path="value || ''"
          v-bind="filePickerProps"
        />
        <auto-download-button
          v-if="driverDepRequirementId"
          :requirement-id="driverDepRequirementId"
          :setting-key="settingKey"
          @installed="onDriverDepInstalled"
        />
      </div>
    </template>

    <!-- Text input (non-file) -->
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
import AutoDownloadButton from './form/AutoDownloadButton.vue'
export default Vue.extend({
  components: { FilePicker, AutoDownloadButton },
  props: ['settingKey', 'title', 'inputType', 'help'],
  data: () => ({
    driverDepRequirementId: null as string | null,
  }),
  computed: {
    ...mapState('settings', {'settings': 'settings'} ),
    setting() {
      return this.settings[this.settingKey]
    },
    value: {
      set(newValue) {
        this.saveSetting(newValue)
      },
      get() {
        return this.setting.value
      }
    },
    isPathInput(): boolean {
      return this.inputType === 'file' || this.inputType === 'directory'
    },
    hasValue(): boolean {
      return !!this.value && this.value.toString().trim().length > 0
    },
    filePickerProps(): Record<string, any> {
      if (this.inputType === 'directory') {
        return { options: { properties: ['openDirectory'] }, buttonText: 'Choose Directory' }
      }
      return {}
    },
  },
  methods: {
    saveSetting: _.debounce(async function(value: string) {
      if (!this.setting) return
      await this.$store.dispatch('settings/save', { key: this.settingKey, value })
      this.$emit('changed', this.value)
    }, 500),
    onDriverDepInstalled() {
      this.$emit('changed')
    },
    clearValue() {
      this.value = ''
    },
  },
  async beforeMount() {
    if (!this.setting) {
      const nu = await this.$util.send('appdb/setting/new');
      nu.key = this.settingKey
      this.$store.dispatch('settings/saveSetting', nu)
    }
  },
  async mounted() {
    if (this.isPathInput) {
      try {
        this.driverDepRequirementId = await this.$util.send(
          'driverDep/requirementForSettingKey',
          { settingKey: this.settingKey }
        );
      } catch {
        // Driver dep system not available — no button shown
      }
    }
  },
})
</script>

<style lang="scss" scoped>
.settings-input {
  .help {
    margin-top: 0.2rem;
  }
}

.settings-input-empty {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .input-group {
    flex: 1;
  }
}

.settings-input-filled-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--bks-border-color, rgba(255, 255, 255, 0.1));
  border-radius: 4px;
  background: var(--bks-query-editor-bg, rgba(0, 0, 0, 0.1));
}

.settings-input-filled-icon {
  font-size: 18px;
  color: var(--bks-brand-success, #4caf50);
  flex-shrink: 0;
}

.settings-input-filled-path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.85rem;
  opacity: 0.85;
}

.settings-input-clear-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  margin: 0;
  min-width: 0;
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  opacity: 0.4;
  color: inherit;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.08);
  }

  .material-icons {
    font-size: 16px;
  }
}
</style>
