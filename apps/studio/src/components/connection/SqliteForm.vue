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
            title="Encryption"
            :initially-expanded="encryptionConfigured"
          >
            <template>
              <div class="row gutter">
                <div class="col s6 form-group">
                  <label for="sqliteCipher">Cipher</label>
                  <select
                    name="sqliteCipher"
                    id="sqliteCipher"
                    v-model="cipher"
                    :disabled="disabled"
                  >
                    <option
                      v-for="c in ciphers"
                      :key="c.value"
                      :value="c.value"
                    >
                      {{ c.name }}
                    </option>
                  </select>
                </div>
                <div class="col s6 form-group">
                  <label for="sqlitePassword">Encryption Password</label>
                  <password-input
                    v-model="config.password"
                    :disabled="disabled"
                  />
                </div>
              </div>
              <div class="row gutter" v-if="cipher === 'sqlcipher'">
                <div class="col s6 form-group">
                  <label for="sqliteCompat">SQLCipher Compatibility</label>
                  <select
                    name="sqliteCompat"
                    id="sqliteCompat"
                    v-model="cipherCompatibility"
                    :disabled="disabled"
                  >
                    <option
                      v-for="c in compatibilities"
                      :key="c.value"
                      :value="c.value"
                    >
                      {{ c.name }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="alert alert-info">
                <i class="material-icons-outlined">info</i>
                <span class="flex">
                  <span class="expand">
                    For encrypted databases (SQLCipher and compatible). Leave the password blank for unencrypted databases. If a correct password is rejected, try an older SQLCipher compatibility revision.
                  </span>
                </span>
              </div>
            </template>
          </toggle-form-area>

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
                    <a href="https://docs.beekeeperstudio.io/docs/sqlite#runtime-extensions">Learn more</a>
                  </span>
                </span>
              </div>

              <div
                v-if="!runtimeExtensionsEnabled"
                class="alert alert-warning"
              >
                <i class="material-icons">error_outline</i>
                <span class="flex">
                  <span class="expand">
                    Runtime extensions are disabled. Configured extensions will be ignored until you set
                    <code>allowRuntimeExtensions = true</code> under <code>[security]</code> in your user config file.
                    <a href="https://docs.beekeeperstudio.io/docs/sqlite#runtime-extensions">Learn more</a>
                  </span>
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
                      :class="{ disabled }"
                      @click.prevent="!disabled && unloadExtension(extension)"
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
                <span class="expand" />
                <div class="btn-group">
                  <button class="btn" @click.prevent.stop="loadExtension" :disabled="disabled">
                    <i class="material-icons">add</i> Add Extension
                  </button>
                </div>
              </div>
            </template>
          </toggle-form-area>
          <platform-warning location="database-file" />
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
import PasswordInput from '../common/form/PasswordInput.vue'
import PlatformWarning from './PlatformWarning.vue'
import { SqliteCiphers, SqliteCipherCompatibilities } from '@/lib/db/types'
export default Vue.extend({
  props: {
    config: Object,
    disabled: {
      type: Boolean,
      default: false
    }
  },
  components: {
    SettingsInput,
    ToggleFormArea,
    FilePicker,
    PasswordInput,
    PlatformWarning
  },
  data() {
    return {
      loadExtensionFileType: this.$config.isMac ? "dylib" : this.$config.isWindows ? "dll" : "so",
      ciphers: SqliteCiphers,
      compatibilities: SqliteCipherCompatibilities
    }
  },
  computed: {
    ...mapGetters(['isUltimate']),
    cipher: {
      get(): string {
        return this.config.sqliteOptions?.cipher || 'sqlcipher'
      },
      set(value: string) {
        this.$set(this.config, 'sqliteOptions', { ...this.config.sqliteOptions, cipher: value })
      }
    },
    cipherCompatibility: {
      get(): number {
        return this.config.sqliteOptions?.cipherCompatibility ?? 4
      },
      set(value: number) {
        this.$set(this.config, 'sqliteOptions', { ...this.config.sqliteOptions, cipherCompatibility: Number(value) })
      }
    },
    encryptionConfigured(): boolean {
      return !!this.config.password || !!this.config.sqliteOptions?.cipher
    },
    ...mapGetters('settings', { 'sqliteRuntimeExtensions': 'sqliteRuntimeExtensions' }),
    extensionChosen() {
      return this.extensions && this.extensions?.length > 0
    },
    extensions() {
      return this.sqliteRuntimeExtensions?.value
    },
    runtimeExtensionsEnabled() {
      return this.$bksConfig.security.allowRuntimeExtensions
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
