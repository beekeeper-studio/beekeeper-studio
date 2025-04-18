<template>
  <div 
    class="table-info-table table-schema-validation"
    v-hotkey="hotkeys"
  >
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <error-alert
          :error="error"
          v-if="error"
        />

        <div class="table-subheader">
          <div class="table-title">
            <h2>Schema Validation</h2>
          </div>
          <slot />
          <span class="expand" />
          <div class="actions">
            <a
              @click.prevent="refresh"
              v-tooltip="`${ctrlOrCmd('r')} or F5`"
              class="btn btn-link btn-fab"
            ><i class="material-icons">refresh</i></a>
          </div>
        </div>

        <div class="validation-settings">
          <div class="form-row">
            <div class="form-group col-md-6">
              <label for="validation-level">Validation Level</label>
              <select v-model="validationLevel" id="validation-level" class="form-control">
                <option value="off">Off (No validation)</option>
                <option value="moderate">Moderate (Apply to inserts and updates)</option>
                <option value="strict">Strict (Apply to all operations)</option>
              </select>
              <small class="form-text text-muted">
                Controls how strictly MongoDB applies validation rules to existing documents during updates
              </small>
            </div>

            <div class="form-group col-md-6">
              <label for="validation-action">Validation Action</label>
              <select v-model="validationAction" id="validation-action" class="form-control">
                <option value="error">Error (Reject invalid documents)</option>
                <option value="warn">Warn (Allow invalid documents, but log warnings)</option>
              </select>
              <small class="form-text text-muted">
                Controls whether MongoDB rejects invalid documents or just logs warnings
              </small>
            </div>
          </div>

          <div class="form-group">
            <label for="schema-editor">JSON Schema</label>
            <text-editor
              mode="application/json"
              v-model="schemaJSON"
              class="schema-editor"
            />
            <small class="form-text text-muted">
              MongoDB uses JSON Schema to validate document structure
            </small>
          </div>
        </div>
      </div>
    </div>

    <div class="expand" />

    <status-bar class="tabulator-footer" :active="active">
      <div class="flex flex-middle statusbar-actions">
        <slot name="footer" />
        <x-button
          v-if="isDirty"
          class="btn btn-flat reset"
          @click.prevent="resetForm"
        >
          Reset
        </x-button>
        <x-buttons
          v-if="isDirty"
          class="pending-changes"
        >
          <x-button
            class="btn btn-primary"
            @click.prevent="submitApply"
          >
            <i
              v-if="error"
              class="material-icons"
            >error</i>
            <span>Apply</span>
          </x-button>
        </x-buttons>
        <slot name="actions" />
      </div>
    </status-bar>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import TextEditor from '@/components/common/texteditor/TextEditor.vue'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import StatusBar from '@/components/common/StatusBar.vue'
import rawLog from '@bksLogger'

const log = rawLog.scope('TableSchemaValidation')
const DEFAULT_SCHEMA = '{\n  "bsonType": "object",\n  "required": [],\n  "properties": {}\n}'

export default {
  components: {
    TextEditor,
    ErrorAlert,
    StatusBar
  },
  props: {
    table: {
      type: Object,
      required: true
    },
    active: {
      type: Boolean,
      default: false
    },
    'tab-state': {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      validationLevel: 'moderate',
      validationAction: 'error',
      schemaJSON: DEFAULT_SCHEMA,
      initialLevel: 'moderate',
      initialAction: 'error',
      initialSchema: DEFAULT_SCHEMA,
      hasExistingValidation: false,
      hasLoaded: false,
      error: null,
      loading: false,
    }
  },
  computed: {
    ...mapState(['connection']),
    hotkeys() {
      return this.$vHotkeyKeymap({
        'general.refresh': this.refresh,
        'general.save': this.submitApply
      })
    },
    isValidJSON() {
      try {
        JSON.parse(this.schemaJSON)
        return true
      } catch (e) {
        return false
      }
    },
    isDirty() {
      return this.validationLevel !== this.initialLevel || 
             this.validationAction !== this.initialAction || 
             this.schemaJSON !== this.initialSchema
    }
  },
  watch: {
    isDirty() {
      // Update the tab dirty state to enable/disable Apply buttons
      this.tabState.dirty = this.isDirty
    },
    active(newVal) {
      if (newVal && !this.hasLoaded) {
        this.loadValidation()
      }
    }
  },
  methods: {
    ctrlOrCmd(key) {
      return platformInfo.isMac ? `⌘${key.toUpperCase()}` : `Ctrl+${key}`
    },
    
    async loadValidation() {
      if (this.loading) return
      this.loading = true
      this.error = null

      try {
        const result = await this.connection.getCollectionValidation(this.table.name)
        if (result && result.validator && result.validator.$jsonSchema) {
          // Found existing validation
          this.hasExistingValidation = true
          this.schemaJSON = JSON.stringify(result.validator.$jsonSchema, null, 2)
          this.validationLevel = result.validationLevel || 'moderate'
          this.validationAction = result.validationAction || 'error'
        } else {
          // No existing validation
          this.hasExistingValidation = false
          this.schemaJSON = DEFAULT_SCHEMA
          this.validationLevel = 'moderate'
          this.validationAction = 'error'
        }
        
        // Store initial values for dirty checking
        this.initialSchema = this.schemaJSON
        this.initialLevel = this.validationLevel
        this.initialAction = this.validationAction
        
        this.hasLoaded = true
      } catch (err) {
        log.error('Failed to get collection validation', err)
        this.error = err
        this.resetForm()
      } finally {
        this.loading = false
      }
    },
    
    resetForm() {
      // Reset to initial values loaded from database
      this.validationLevel = this.initialLevel
      this.validationAction = this.initialAction 
      this.schemaJSON = this.initialSchema
    },
    
    refresh() {
      this.hasLoaded = false
      this.loadValidation()
    },
    
    async submitApply() {
      if (!this.isValidJSON) {
        this.$noty.error('Invalid JSON schema')
        return
      }
      
      try {
        this.loading = true
        this.error = null
        const schema = JSON.parse(this.schemaJSON)
        
        await this.connection.setCollectionValidation({
          collection: this.table.name,
          validationLevel: this.validationLevel,
          validationAction: this.validationAction,
          schema: schema
        })
        
        // Update initial values after successful save
        this.initialSchema = this.schemaJSON
        this.initialLevel = this.validationLevel
        this.initialAction = this.validationAction
        
        this.$noty.success(`Schema validation updated for ${this.table.name}`)
        this.hasExistingValidation = true
        this.$emit('actionCompleted')
      } catch (err) {
        log.error('Failed to set validation', err)
        this.error = err
      } finally {
        this.loading = false
      }
    }
  },
  mounted() {
    this.tabState.dirty = false
    if (this.active) {
      this.loadValidation()
    }
  },
  beforeDestroy() {
    // Clean up any resources if needed
  }
}
</script>

<style lang="scss">
.table-schema-validation {
  display: flex;
  flex-direction: column;
  height: 100%;

  .table-info-table-wrap {
    overflow: auto;
  }

  .schema-editor {
    height: 300px;
    margin-top: 8px;
  }
  
  .validation-settings {
    padding: 0 1rem;
  }
}
</style>
