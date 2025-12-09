<template>
  <section class="import-section-wrapper schema-builder">
    <div
      class="card-flat padding form-group"
      v-if="!createTable"
    >
      <label class="checkbox-group">
        <input
          type="checkbox"
          class="form-control"
          v-model="truncateTable"
        >
        Truncate the table before importing new data
      </label>
      <label class="checkbox-group">
        <input
          type="checkbox"
          class="form-control"
          v-model="runAsUpsert"
        >
        Import data as an Upsert (Be sure to map a primary key field!)
      </label>
    </div>
    <form
      class="card-flat form-group padding"
      v-if="createTable"
    >
      <div
        class="form-group"
        v-if="defaultSchema"
      >
        <label for="schema">Schema</label>
        <input
          type="text"
          v-model="newTableSchema"
          :placeholder="defaultSchema"
        >
      </div>
      <div class="form-group">
        <label for="table">Table Name</label>
        <input
          type="text"
          v-model="newTableName"
          placeholder="untitled_table"
        >
      </div>
    </form>
    <div
      class="mapper-wrapper"
      :class="{ 'mapper-wrapper--create': createTable }"
      ref="tabulator"
    />
    <button
      class="btn btn-primary btn-icon btn-table-create"
      type="button"
      @click.prevent="$emit('finish')"
    >
      <span>Review &amp; Execute</span>
      <span class="material-icons">
        keyboard_arrow_right
      </span>
    </button>
  </section>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { Tabulator, TabulatorFull } from 'tabulator-tables'
import Mutators, { emptyResult, buildNullValue } from '../../mixins/data_mutators'
import { trashButton, vueEditor, vueFormatter } from '@shared/lib/tabulator/helpers'
import CheckboxFormatterVue from '@shared/components/tabulator/CheckboxFormatter.vue'
import CheckboxEditorVue from '@shared/components/tabulator/CheckboxEditor.vue'
import { escapeHtml } from '@shared/lib/tabulator'
import { getDialectData } from '@shared/lib/dialects'
import NullableInputEditorVue from '@shared/components/tabulator/NullableInputEditor.vue'

export default {
  components: {

  },
  props: {
    stepperProps: {
      type: Object,
      required: true,
      default: () => ({
        tabId: null
      })
    },
  },
  mixins: [Mutators],
  data() {
    return {
      importerId: null,
      table: null,
      tabulator: null,
      tableColumnNames: {},
      nonNullableColumns: [],
      ignoreText: 'IGNORE',
      truncateTable: false,
      runAsUpsert: false,
      createTable: false,
      importOptions: null,
      newTableName: null,
      newTableSchema: null
    }
  },
  computed: {
    ...mapGetters(['dialect', 'dialectData']),
    ...mapGetters(['schemaTables']),
    ...mapGetters('imports', {'getImportOptions': 'getImportOptions'}),
    ...mapState('imports', {'tablesToImport': 'tablesToImport'}),
    ...mapState(['defaultSchema', 'connection']),
    columnTypes() {
      return this.dialectData.columnTypes.map((c) => c.pretty)
    },
    disabledFeatures() {
      return this.dialectData.disabledFeatures
    },
    importDataTypes() {
      return this.dialectData.importDataType
    },
    createTableColumns () {
      const autocompleteOptions = {
        freetext: true,
        allowEmpty: false,
        values: this.columnTypes,
        defaultValue: 'varchar(255)',
        listOnEmpty: true,
        autocomplete: true,
      }

      return [
        {
          title: 'Map to File Column',
          field: 'fileColumn',
          editable: false,
          formatter: this.fileColumnFormatter,
          cssClass: 'import-file-column'
        },
        {
          title: 'New Table Column',
          editor: vueEditor(NullableInputEditorVue),
          field: 'tableColumn',
          editable: true,
          formatter: this.fileColumnFormatter,
          cssClass: 'import-file-column'
        },
        {
          title: 'Type',
          field: 'dataType',
          editor: 'list',
          editorParams: autocompleteOptions,
          editable: true,
          cssClass: 'import-table-column',
          minWidth: 90,
        },
        (this.disabledFeatures?.nullable ? null : {
          title: 'Nullable',
          field: 'nullable',
          headerTooltip: "Allow this column to contain a null value",
          editor: vueEditor(CheckboxEditorVue),
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: true
          },
          cellEdited: this.cellEdited,
          editable: true,
          width: 70,
          cssClass: 'import-table-column',
        }),
        (this.disabledFeatures?.primary ? null : {
          title: 'Primary',
          field: 'primary',
          headerTooltip: "Select none, one, or multiple primary keys for your table.  ",
          editor: vueEditor(CheckboxEditorVue),
          formatter: vueFormatter(CheckboxFormatterVue),
          formatterParams: {
            editable: true
          },
          cellEdited: this.cellEdited,
          editable: true,
          width: 70,
          cssClass: 'import-table-column'
        }),
        {
          field: 'trash-button',
          title: null,
          formatter: (_cell) => `<div class="dynamic-action" title="Remove mapping" />`,
          width: 36,
          minWidth: 36,
          hozAlign: 'center',
          cellClick: (e, cell) => {
            cell.getRow().update({'tableColumn': this.ignoreText})
          },
          resizable: false,
          cssClass: "remove-btn read-only",
          editable: false
        }
      ]
    },
    importColumns () {
      const selectOptions = {
        values: {[this.ignoreText]: this.ignoreText, ...this.tableColumnNames}
      }

      return [
        {
          title: 'File Column',
          field: 'fileColumn',
          formatter: this.fileColumnFormatter,
          cssClass: 'import-file-column'
        },
        {
          title: 'Table Column',
          field: 'tableColumn',
          editable: true,
          editor: 'list',
          editorParams: selectOptions,
          formatter: this.importFormatter,
          cssClass: 'import-table-column',
        },
        {
          field: 'trash-button',
          title: null,
          formatter: (_cell) => `<div class="dynamic-action" title="Remove mapping" />`,
          width: 36,
          minWidth: 36,
          hozAlign: 'center',
          cellClick: (e, cell) => {
            cell.getRow().update({'tableColumn': this.ignoreText})
          },
          resizable: false,
          cssClass: "remove-btn read-only",
          editable: false
        }
      ]
    },
    simpleTableName() {
      const schema = this.newTableSchema ?? this.defaultSchema
      return schema ? `${schema}.${this.newTableName}` : this.newTableName
    }
  },
  methods: {
    getTable(tableData) {
      if (!tableData) return null

      const { schema, name: tableName } = tableData
      let foundSchema = ''
      if (this.schemaTables.length > 1) {
        foundSchema = this.schemaTables.find(s => s.schema === schema)
      } else {
        foundSchema = this.schemaTables[0]
      }
      return foundSchema.tables.find(t => t.name === tableName)
    },
    fileColumnFormatter(cell) {
      const cellValue = cell.getValue()
      return `<span class="expand">${escapeHtml(cellValue)}</span><i class="material-icons">right_arrow</i>`
    },
    importFormatter(cell) {
      const cellValue = cell.getValue()
      if (cellValue == this.ignoreText) return buildNullValue(this.ignoreText)
      const column = this.findByColumnName(cellValue)
      const attributesToShow = this.getColumnAttributes(column).join(" ")
      const attributesSpan = `<span class='attributes'>${escapeHtml(attributesToShow)}</span>`
      return `${cellValue} ${attributesSpan}`
    },
    importKey() {
      return `new-import-${this.stepperProps.tabId}`
    },
    betterColumnName(cName) {
      return cName.replace(/\s+/g, '_').toLowerCase()
    },
    getColumnType(dataTypes) {
      const dt = new Set(dataTypes)
      dt.delete('null')

      // if there are more than one type in the column, or there are no types, just default
      if (dt.size != 1) {
        return this.importDataTypes.defaultType
      }

      // we only return the analyzed type if there is only one of them (ie we can be sure the type is correct)
      return this.importDataTypes[dt.values().next().value]
    },
    async tableData(importedColumns) {
      const { meta } = await this.$util.send('import/getFileAttributes', { id: this.importerId })
      const importOptions = await this.getImportOptions(this.importKey())
      const tableColumns = new Map()

      importedColumns.forEach(ic => {
        const strippedField = ic.toLowerCase().replace(/[^0-9a-z]/gi, '')
        tableColumns.set(strippedField, ic)
      })

      return meta.fields.map(f => {
        const strippedField = f.toLowerCase().replace(/[^0-9a-z]/gi, '')
        const dataMap = importOptions?.importMap?.find(t => t.fileColumn === f)
        let tableColumn = dataMap?.tableColumn ?? this.ignoreText

        if (tableColumn === this.ignoreText && tableColumns.has(strippedField)) {
          tableColumn = tableColumns.get(strippedField)
        }

        return {
          fileColumn: f,
          tableColumn
        }
      })
    },
    async createTableData(importedColumns) {
      const response = await this.$util.send('import/generateColumnTypesFromFile', { id: this.importerId })

      return response.map(resp => (
        {
          fileColumn: resp.columnName,
          tableColumn: this.betterColumnName(resp.columnName),
          dataType: this.getColumnType(resp.dataTypes).toUpperCase(),
          nullable: resp.dataTypes.has('null'),
          primary: resp.primary
        }
      ))
    },
    findByColumnName (tableColumn) {
      return tableColumn ? this.table.columns.find(({columnName}) => columnName === tableColumn) : null
    },
    getColumnAttributes (column) {
      if (!column) return []
      return [
        column.dataType,
        column.nullable ? null : 'NOT NULL',
        column.default ? `(has default)` : null,
      ].filter(c => !!c)
    },
    async initTabulator() {
      if (this.createTable) {
        this.tabulator = new TabulatorFull(this.$refs.tabulator, {
          data: await this.createTableData(),
          columns: this.createTableColumns,
          layout: 'fitColumns',
          placeholder: 'No Data',
          columnDefaults: {
            resizable: false,
            headerSort: false,
            editable: false
          },
          height: 'auto'
        })
        return
      }

      const importedColumns = this.table.columns.map(t => t.columnName)
      this.tabulator = new TabulatorFull(this.$refs.tabulator, {
        data: await this.tableData(importedColumns),
        columns: this.importColumns,
        layout: 'fitColumns',
        placeholder: 'No Data',
        columnDefaults: {
          resizable: false,
          headerSort: false,
          editable: false
        },
        height: 'auto'
      })
    },
    async onFocus () {
      const importOptions = await this.tablesToImport.get(this.importKey())
      if (importOptions.importMap && this.importerId && this.tabulator) {
        this.tabulator.redraw()
      } else {
        this.initialize()
      }
    },
    schemaBuilder () {
      const columns = this.tabulator.getData()
        .filter(col => col.tableColumn !== this.ignoreText)
        .map(col => ({
          dataType: col.dataType,
          nullable: col.nullable,
          primaryKey: col.primary,
          columnName: col.tableColumn
        }))
      return {
        name: this.newTableName,
        schema: this.newTableSchema ?? this.defaultSchema,
        columns
      }
    },
    canContinue() {
      if (this.tabulator === null) return false

      if (this.createTable) {
        return true
      }

      const nonNullableColumns = new Set(this.nonNullableColumns)
      const tableData = this.tabulator.getData()
        .filter(t => t.tableColumn.toLowerCase().trim() !== this.ignoreText.toLowerCase() && t.tableColumn !== '')
        .map(t => t.tableColumn)
      const tableDataSet = new Set(tableData)

      this.tabulator.getData().forEach(data => {
        if (data.tableColumn.toLowerCase().trim() === this.ignoreText.toLowerCase()) {
          return
        }
        nonNullableColumns.delete(data.tableColumn)
      })

      if (nonNullableColumns.size > 0) {
        this.$noty.error(`The following table columns are 'NOT NULL' columns without a default, so they must be included in your mapping: ${Array.from(nonNullableColumns).join(', ')}`)
        return false
      }

      if (tableData.length !== tableDataSet.size) {
        const duplicates = tableData.filter(t => {
          if (tableDataSet.has(t)) {
            tableDataSet.delete(t)
          } else {
            return t
          }
        })

        this.$noty.error(`The following table columns can only be mapped to one header: ${duplicates.join(', ')}`)
        return false
      }

      return true
    },
    async onNext() {
      const importOptions =  await this.tablesToImport.get(this.importKey())

      if (importOptions.createNewTable) {
        importOptions.table = this.schemaBuilder()
      }

      importOptions.importMap = await this.$util.send('import/mapper', { id: this.importerId, dataToMap: this.tabulator.getData() })
      importOptions.truncateTable = this.truncateTable
      importOptions.runAsUpsert = this.runAsUpsert

      const importData = {
        table: this.importKey(),
        importProcessId: this.importerId,
        importOptions
      }
      await this.$util.send('import/setOptions', { id: this.importerId, options: importOptions })
      this.$store.commit('imports/upsertImport', importData)
    },
    async initialize () {
      const importOptions = await this.tablesToImport.get(this.importKey())
      this.createTable = importOptions.createNewTable

      if (!importOptions.createNewTable) {
        await this.$store.dispatch('updateTableColumns', this.getTable(importOptions.table))
        this.table = this.getTable(importOptions.table)
        const { tableColumnNames, nonNullableColumns } = this.table.columns.reduce((acc, column) => {
          const columnText = [column.columnName, ...this.getColumnAttributes(column)]

          acc.tableColumnNames[column.columnName] = `${columnText.join(' ')}`

          if (!column.nullable && !column.hasDefault) {
            acc.nonNullableColumns.push(column.columnName)
          }

          return acc
        }, { tableColumnNames: {}, nonNullableColumns: []})
        this.tableColumnNames = tableColumnNames
        this.nonNullableColumns = nonNullableColumns
      } else {
        const splitFileName = importOptions.fileName.split('/')
        const [fileName] = splitFileName[splitFileName.length-1].split('.')
        this.newTableName = fileName
      }

      if (!importOptions.importProcessId) {
        this.importerId = await this.$util.send('import/init', { options: importOptions })
      } else {
        this.importerId = importOptions.importProcessId
      }

      this.initTabulator()
    },
  },
  mounted () {
    this.initialize()
  },
  unmounted() {
    if (this.tabulator) this.tabulator.destroy()
  }
}
</script>

<style lang="scss" scoped>
  .mapper-wrapper {
    margin-top: 2rem;

    &::v-deep .tabulator-tableholder {
      .tabulator-bks-checkbox {
        height: 100%;
      }

      .remove-btn .dynamic-action::after {
        top: -0.2rem;
      }
    }
  }
  .checkbox-group:last-of-type {
    padding-top: 1rem;
  }

  .btn-table-create {
    margin: 1rem 0 0 auto;
  }
</style>
