<template>
  <div class="routine-editor">
    <div
      v-if="error"
      class="alert-wrapper"
    >
      <div class="alert alert-danger">
        {{ error.message || error }}
      </div>
    </div>
    <template v-else>
      <div class="routine-editor-header">
        <div class="routine-meta">
          <i class="material-icons">functions</i>
          <span class="routine-name">{{ routineName }}</span>
          <span class="routine-type badge">{{ routineTypeName }}</span>
        </div>
        <div class="routine-actions">
          <x-button
            class="btn btn-flat"
            :disabled="!canExecute || loading"
            title="Open a query tab with a CALL/EXEC template"
            @click.prevent="execute"
          >
            <i class="material-icons">play_arrow</i> Execute
          </x-button>
          <x-button
            class="btn btn-primary"
            :disabled="!canSave"
            :title="saveTitle"
            @click.prevent="save"
          >
            <i class="material-icons">save</i> {{ saving ? 'Saving…' : 'Save' }}
          </x-button>
        </div>
      </div>
      <div
        v-if="loading"
        class="routine-editor-loading"
      >
        <x-progressbar />
      </div>
      <div
        v-show="!loading"
        class="routine-editor-body"
      >
        <sql-text-editor
          :value="definition"
          :read-only="!canEdit"
          :is-focused="active"
          :formatter-dialect="formatterDialect"
          :language-id="languageId"
          :line-wrapping="false"
          :keybindings="keybindings"
          :default-schema="defaultSchema"
          @bks-value-change="onValueChange"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import SqlTextEditor from '@beekeeperstudio/ui-kit/vue/sql-text-editor'
import { FormatterDialect, dialectFor } from '@shared/lib/dialects/models'
import { safeSqlFormat as safeFormat } from '@/common/utils'
import { RoutineTypeNames } from '@/lib/db/models'
import rawLog from '@bksLogger'

const log = rawLog.scope('TabRoutineEditor')

export default {
  components: { SqlTextEditor },
  props: ['tabId', 'active', 'tab'],
  data() {
    return {
      initialized: false,
      loading: true,
      saving: false,
      error: null,
      // The definition currently shown in the editor
      definition: '',
      // The last-saved definition, used to detect unsaved changes
      savedDefinition: '',
    }
  },
  computed: {
    ...mapState(['connection', 'routines', 'usedConfig']),
    ...mapGetters(['dialect', 'dialectData', 'dialectTitle']),
    routineName() {
      return this.tab.tableName
    },
    routineSchema() {
      return this.tab.schemaName
    },
    routineType() {
      return this.tab.entityType
    },
    routineTypeName() {
      return RoutineTypeNames[this.routineType] || this.routineType
    },
    /** Full Routine object from the store (has params for execute). */
    routine() {
      const found = (this.routines || []).find((r) =>
        r.name === this.routineName &&
        (r.schema || null) === (this.routineSchema || null)
      )
      return found || {
        name: this.routineName,
        schema: this.routineSchema,
        type: this.routineType,
        routineParams: [],
      }
    },
    canEdit() {
      return !!this.dialectData.editableRoutineDefinition && !this.usedConfig?.readOnlyMode
    },
    canExecute() {
      return !!this.dialectData.routineExecuteStatement
    },
    unsavedChanges() {
      return this.definition !== this.savedDefinition
    },
    canSave() {
      return this.canEdit && !this.saving && !this.loading && this.unsavedChanges
    },
    saveTitle() {
      if (this.usedConfig?.readOnlyMode) return 'Read-only mode is enabled'
      if (!this.dialectData.editableRoutineDefinition) {
        return `Editing routines is not supported for ${this.dialectTitle}`
      }
      return ''
    },
    formatterDialect() {
      return FormatterDialect(dialectFor(this.dialect))
    },
    languageId() {
      return this.dialectData.textEditorMode || 'sql'
    },
    defaultSchema() {
      return this.routineSchema || this.dialectData.defaultSchema || 'public'
    },
    keybindings() {
      return { 'Mod-s': () => this.save() }
    },
    shouldInitialize() {
      return this.active && !this.initialized
    },
  },
  watch: {
    unsavedChanges() {
      this.tab.unsavedChanges = this.unsavedChanges
    },
    shouldInitialize() {
      if (this.shouldInitialize) this.initialize()
    },
  },
  mounted() {
    if (this.shouldInitialize) this.initialize()
  },
  methods: {
    async initialize() {
      this.initialized = true
      this.loading = true
      this.error = null
      try {
        const result = await this.connection.getRoutineCreateScript(
          this.routineName, this.routineType, this.routineSchema
        )
        const raw = Array.isArray(result) ? result[0] : result
        // Make the definition re-runnable for this dialect (e.g. CREATE OR ALTER)
        const editable = this.dialectData.editableRoutineDefinition
          ? this.dialectData.editableRoutineDefinition(raw || '', this.routine)
          : (raw || '')
        let formatted = editable
        try {
          formatted = safeFormat(editable, { language: this.formatterDialect })
        } catch (ex) {
          log.warn('Could not format routine definition', ex)
        }
        this.definition = formatted
        this.savedDefinition = formatted
      } catch (ex) {
        log.error(ex)
        this.error = ex
      } finally {
        this.loading = false
      }
    },
    onValueChange(event) {
      this.definition = event.value
    },
    async save() {
      if (!this.canSave) return
      this.saving = true
      try {
        await this.connection.executeQuery(this.definition)
        this.savedDefinition = this.definition
        this.tab.unsavedChanges = false
        this.$noty.success(`${this.routineTypeName} '${this.routineName}' saved`)
        // Refresh the sidebar listing in case params/signature changed
        this.$store.dispatch('updateRoutines')
      } catch (ex) {
        log.error(ex)
        this.$noty.error(`Could not save routine: ${ex.message || ex}`)
      } finally {
        this.saving = false
      }
    },
    execute() {
      this.$root.$emit('loadRoutineExecute', this.routine)
    },
  },
}
</script>

<style lang="scss" scoped>
.routine-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
.routine-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.85rem;
  flex-shrink: 0;
}
.routine-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  .routine-name {
    font-weight: 600;
  }
  .badge {
    opacity: 0.7;
    font-size: 0.8rem;
  }
}
.routine-actions {
  display: flex;
  gap: 0.5rem;
}
.routine-editor-body {
  flex: 1;
  min-height: 0;
  position: relative;
}
.routine-editor-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
