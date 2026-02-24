<template>
  <div class="sqlite-form">
    <div class="host-port-user-password">
      <div class="row gutter">
        <div class="col form-group">
          <label
            for="Database"
            required
          >Database File</label>
          <file-picker 
            v-model="config.defaultDatabase"
            input-id="Database"
            editable
            show-create-button
          />

          <toggle-form-area
            v-show="isUltimate"
            title="Runtime Extensions"
            :initially-expanded="extensionChosen"
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
                v-if="extensionChosen"
              >
                <div v-for="extension in extensions" :key="extension" class="alert">
                  <i class="material-icons-outlined">check</i>
                  <span class="flex flex-row">
                    <span class="expand">
                      {{ extension }}
                    </span>
                    <a
                      class="a-icon"
                      @click.prevent="unloadExtension(extension)"
                    ><i class="material-icons">delete</i></a>
                  </span>
                </div>
              </div>
              <div class="alert" v-else>
                <span class="flex">
                  <span class="expand">
                    No extensions loaded
                  </span>
                </span>
              </div>
              <div class="row flex-middle">
                <span class="expand"/>
                <div class="btn-group">
                  <button class="btn" @click.prevent.stop="loadExtension">
                    <i class="material-icons">add</i> Add Extension
                  </button>
                </div>
              </div>
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
import { mapGetters, mapState } from 'vuex'
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
      snap: "https://docs.beekeeperstudio.io/support/troubleshooting/#i-get-permission-denied-when-trying-to-access-a-database-on-an-external-drive",
      loadExtensionFileType: this.$config.isMac ? "dylib" : this.$config.isWindows ? "dll" : "so"
    }
  },
  computed: {
    ...mapGetters(['isUltimate']),
    ...mapGetters('settings', { 'sqliteRuntimeExtensions': 'sqliteRuntimeExtensions' }),
    extensionChosen() {
      return this.extensions && this.extensions?.length > 0
    },
    extensions() {
      return this.sqliteRuntimeExtensions?.value
    }
  },
  methods: {
    async unloadExtension(toRemove: string) {
      let value = this.sqliteRuntimeExtensions?.value
      value = value.filter((v) => v !== toRemove);
      await this.$store.dispatch('settings/save', { key: 'sqliteExtensionFile', value })
    },
    async loadExtension() {
      let file = this.$native.dialog.showOpenDialogSync({
        properties: ['openFile']
      });

      if (Array.isArray(file)) file = file[0]

      let value = this.sqliteRuntimeExtensions?.value
      value.push(file)
      await this.$store.dispatch('settings/save', { key: 'sqliteExtensionFile', value })
    }
  }
})
</script>
