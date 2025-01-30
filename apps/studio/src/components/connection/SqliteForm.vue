<template>
  <div class="sqlite-form">
    <div class="host-port-user-password">
      <div class="row gutter">
        <div class="col form-group">
          <label
            for="Database"
            required
          >Database File</label>
          <file-picker v-model="config.defaultDatabase" />

          <toggle-form-area
            title="Runtime Extensions"
            :expand-initially="extensionChosen"
          >
            <template>
              <div class="alert alert-info">
                <i class="material-icons-outlined">info</i>
                <span class="flex">
                  <span class="expand">
                    This is a global setting that affects all SQLite connections. 
                  </span>
                  <a href="https://docs.beekeeperstudio.io/docs/sqlite#runtime-extensions">Learn more</a>
                </span>
              </div>

              <div
                class="alert"
                v-if="extensionChosen"
              >
                <i class="material-icons-outlined">check</i>
                <span class="flex flex-row">
                  <span class="expand">
                    {{ settings.sqliteExtensionFile.value }}
                  </span>
                  <a
                    class="a-icon"
                    @click.prevent="unloadExtension"
                  ><i class="material-icons">delete</i></a>
                </span>
              </div>
              <settings-input
                v-else
                setting-key="sqliteExtensionFile"
                input-type="file"
                title="Runtime extension file"
                :help="`File must have extension .${loadExtensionFileType}`"
              />
            </template>
          </toggle-form-area>
          <div
            class="alert alert-warning"
            v-if="$config.isSnap"
          >
            <i class="material-icons">error_outline</i>
            <div>
              Hey snap user! If you want to use a sqlite database on an external drive you'll need to give Beekeeper some extra permissions
              <external-link :href="snap">
                Read more
              </external-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">  
import Vue from 'vue'
import SettingsInput from '../common/SettingsInput.vue'
import { mapState } from 'vuex'
import ToggleFormArea from '../common/ToggleFormArea.vue'
import FilePicker from '../common/form/FilePicker.vue'
export default Vue.extend({
  props: ['config'],
  components: {
    SettingsInput,
    ToggleFormArea,
    FilePicker
  },
  data() {
    return {
      snap: "https://docs.beekeeperstudio.io/pages/troubleshooting#i-get-permission-denied-when-trying-to-access-a-database-on-an-external-drive",
      loadExtensionFileType: this.$config.isMac ? "dylib" : this.$config.isWindows ? "dll" : "so"
    }
  },
  computed: {
    ...mapState('settings', { 'settings': 'settings'}),
    extensionChosen() {
      return !!this.settings?.sqliteExtensionFile?.value
    }
  },
  methods: {
    async unloadExtension() {
      this.settings.sqliteExtensionFile.value = ''
    	await this.$store.dispatch('settings/saveSetting', this.settings.sqliteExtensionFile)
    },
  }
})
</script>
