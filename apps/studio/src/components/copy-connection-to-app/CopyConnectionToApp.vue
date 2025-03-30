<template>
  <span>
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        :name="modalName"
      >
        <div class="dialog-c-title">
          Add Field
          <a
            class="close-btn btn btn-fab"
            href="#"
            @click.prevent="close"
          >
            <i class="material-icons">clear</i>
          </a>
        </div>
        <div>
          {{ connectionText }}
        </div>
        <div class="vue-dialog-buttons">
          <button 
            class="btn btn-flat" 
            type="button"
            @click.prevent="close"
          >
            Close
          </button>
          <a
            v-clipboard:copy="connectionText"
            v-clipboard:success="onCopySuccess"
            v-clipboard:error="onCopyError"
            class="btn btn-icon btn-flat copy-btn"
          >
            <span
              class="material-icons"
            >
              content_copy
            </span>
            Copy Code to Clipboard
          </a>
        </div>
      </modal>
    </portal>
    <x-button
      class="btn btn-primary btn-small"
    >
      Copy connection to an App
      <i class="material-icons">arrow_drop_down</i>
      <x-menu>
        <x-menuitem @click.prevent="copyConnection('ruby')">
          <x-label>To Ruby</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="copyConnection('jdbc')">
          <x-label>To JDBC Connection String</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="copyConnection('sqlAlchemy')">
          <x-label>To SQLAlchemy</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="copyConnection('connectionString')">
          <x-label>To Connection String</x-label>
        </x-menuitem>
      </x-menu>
    </x-button>
  </span> 
</template>

<script>
import { generateRubyDatabaseYaml } from './utils'
export default {
  props: ['config'],
  data() {
    return {
      applicationTitle: null,
      connectionText: null,
      modalName: 'applicationConnection'
    }
  },
  methods: {
    copyConnection(app) {
      const lCaseApp = app.toLowerCase()
      
      switch (lCaseApp) {
        case 'ruby':
          this.applicationTitle = 'Ruby Database.yaml'
          this.connectionText = generateRubyDatabaseYaml(this.config)
          this.open()
          break;
        default:
          this.applicationTitle = null
          this.connectionText = null
          this.$noty.error(`${app} is not supported`)
      }
    },
    onCopySuccess() {
      this.$noty.info('Copied to Clipboard')
      this.close()
    },
    onCopyError(e) {
      this.$noty.error(`Error copying to clipboard: ${e.message}`)
    },
    open() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    }
  }
};
</script>

<style scoped>
</style>
