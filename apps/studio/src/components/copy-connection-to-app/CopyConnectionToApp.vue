<template>
  <span>
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        :name="modalName"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">
            {{ applicationTitle }}
            <button
              type="button"
              class="close-btn btn btn-fab"
              @click.prevent="close"
            >
              <i class="material-icons">clear</i>
            </button>
          </div>
          <div class="code-container">
            <pre><code>{{ connectionText }}</code></pre>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button 
            class="btn btn-flat" 
            type="button"
            @click.prevent="close"
          >
            Close
          </button>
          <button
            type="button"
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
          </button>
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
        <x-menuitem @click.prevent="copyConnection('knex')">
          <x-label>To Knex.js</x-label>
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
import { 
  generateRubyDatabaseYaml,
  generateKnexConnection,
  generateJdbcConnectionString,
  generateSqlAlchemyConnection,
  generateConnectionString
} from './utils'

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
        case 'knex':
          this.applicationTitle = 'Knex.js Connection'
          this.connectionText = generateKnexConnection(this.config)
          this.open()
          break;
        case 'jdbc':
          this.applicationTitle = 'JDBC Connection String'
          this.connectionText = generateJdbcConnectionString(this.config)
          this.open()
          break;
        case 'sqlalchemy':
          this.applicationTitle = 'SQLAlchemy Connection'
          this.connectionText = generateSqlAlchemyConnection(this.config)
          this.open()
          break;
        case 'connectionstring':
          this.applicationTitle = 'Connection String'
          this.connectionText = generateConnectionString(this.config)
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
.code-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 10px;
  margin-bottom: 10px;
}

pre {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
</style>
