<template>
  <div class="import mini-wrap">
    <form class="import-section-wrapper card-flat padding">
      <h3 class="card-title">
        Import Data Into Table '{{ stepperProps.table }}'
      </h3>
      <div class="form-group">
        <label for="fileName">Select File To Import (.csv, .xlsx, .json, .jsonl only)</label>
        <file-picker
          v-model="fileName"
          :options="filePickerOptions"
          class="file-picker-wrapper"
        />
      </div>

      <section v-if="fileName != null">
        <div class="form-group">
          <label class="checkbox-group">
            <input
              type="checkbox"
              v-model="trimWhitespaces"
              class="form-control"
            > Automatically Trim Whitespace
          </label>
        </div>
        <toggle-form-area
          title="Auto Detect Separators"
          :hide-toggle="true"
          :expanded="!isAutodetect"
        >
          <template v-slot:header>
            <x-switch
              @click.prevent="isAutodetect = !isAutodetect"
              :toggled="isAutodetect"
            />
          </template>
          <template>
            <!--
              Go through these and each file type should have a default they can detect through whatever means.
              Add an object or something to handle in the specific importer file to get what is necessary and autofill it
              or at least tell Vue what is auto-setupable(?) and let the user change it if they so choose
            -->
            <div class="row gutter">
              <div class="col s6">
                <div class="form-group">
                  <label for="columnDelimeter">
                    Column Separator
                  </label>
                  <input
                    type="text"
                    class="form-control"
                    name="columnDelimeter"
                    v-model="columnDelimeter"
                  >
                </div>
                <div class="form-group">
                  <label for="quoteCharacter">
                    Text Quote Character
                  </label>
                  <input
                    type="text"
                    class="form-control"
                    name="quoteCharacter"
                    v-model="quoteCharacter"
                  >
                </div>
              </div>
              <div class="col s6">
                <div class="form-group">
                  <label for="escapeCharacter">
                    Escape Character
                  </label>
                  <input
                    type="text"
                    class="form-control"
                    name="escapeCharacter"
                    v-model="escapeCharacter"
                  >
                </div>
                <div class="form-group">
                  <label for="newlineCharacter">
                    Newline Character
                  </label>
                  <input
                    type="text"
                    class="form-control"
                    name="newlineCharacter"
                    v-model="newlineCharacter"
                  >
                </div>
              </div>
            </div>
          </template>
        </toggle-form-area>
        <div class="options-wrapper flex-row">
          <toggle-form-area title="Null Value Detection">
            <label>Select which values should be interpreted as NULL</label>
            <fieldset class="form-group row gutters">
              <div class="col s6">
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    value=""
                    v-model="nullableValues"
                    class="form-control"
                  > Empty String
                </label>
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    value="NULL"
                    v-model="nullableValues"
                    class="form-control"
                  > "NULL"
                </label>
              </div>
              <div class="col s6">
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    value="NA"
                    v-model="nullableValues"
                    class="form-control"
                  > "NA"
                </label>
                <label class="checkbox-group">
                  <input
                    type="checkbox"
                    value="-"
                    v-model="nullableValues"
                    class="form-control"
                  > "-"
                </label>
              </div>
            </fieldset>
          </toggle-form-area>
        </div>
        <div
          class="options-wrapper flex-row"
          v-if="this.fileType === 'xlsx'"
        >
          <toggle-form-area title="Select Sheet to import">
            <label>Only 1 sheet can be imported at a time.</label>
            <fieldset class="form-group row gutters">
              <div class="col s6">
                <label
                  v-for="sheetName in this.sheets"
                  :key="sheetName"
                  class="checkbox-group"
                >
                  <input
                    type="radio"
                    :value="sheetName"
                    v-model="sheetSelected"
                    class="form-control"
                  > {{ sheetName }}
                </label>
              </div>
            </fieldset>
          </toggle-form-area>
        </div>
        <hr>

        <hr>
        <div class="import-cta-button-wrapper">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="previewFile"
          >
            Preview File With Selection
          </button>
          <button
            class="btn btn-primary btn-icon"
            type="button"
            @click.prevent="$emit('finish')"
          >
            <span>Map To Table</span>
            <span class="material-icons">
              keyboard_arrow_right
            </span>
          </button>
        </div>
      </section>
    </form>
    <div>
      <h3 v-show="tabulator">
        Parsed File Preview
      </h3>
      <div
        class="file-picker-wrapper"
        ref="tabulator"
      />
    </div>
  </div>
</template>

<script>
  import { mapGetters, mapState } from 'vuex'
  import { Tabulator, TabulatorFull } from 'tabulator-tables'
  import FilePicker from '@/components/common/form/FilePicker.vue'
  import Mutators from '../../mixins/data_mutators'
  import ToggleFormArea from '../common/ToggleFormArea.vue'
  export default {
    components: {
    FilePicker,
    ToggleFormArea
},
    mixins: [Mutators],
    props: {
      stepperProps: {
        type: Object,
        required: true,
        default: () => ({
          schema: '',
          table: ''
        })
      }
    },
    data() {
      return {
        table: null,
        fileName: null,
        allowChangeSettings: false,
        columnDelimeter: null,
        quoteCharacter: null,
        escapeCharacter: null,
        newlineCharacter: null,
        nullableValues: [''],
        trimWhitespaces: true,
        importerId: null,
        isAutodetect: true,
        tabulator: null,
        sheetSelected: null,
        sheets: []
      }
    },
    computed: {
      ...mapGetters(['schemaTables']),
      filePickerOptions() {
        return {
          filters: [
            { name: 'Import Files', extensions: ['csv', 'json', 'jsonl', 'xlsx']}
          ]
        }
      },
      fileType() {
        if (this.fileName === null) return null
        const splitFile = this.fileName.split('.')
        return splitFile[splitFile.length - 1]
      }
    },
    watch: {
      async fileName () {
        const importOptions = {
          fileName: this.fileName,
          fileType: this.fileType,
        }

        this.table = this.getTable()
        await this.$store.dispatch('updateTableColumns', this.table)
        importOptions.table = this.table

        this.importerId = await this.$util.send('import/init', { options: importOptions, table: this.table })
        this.tabulator = null
        this.isAutodetect = true
        this.allowChangeSettings = await this.$util.send('import/allowChangeSettings', { id: this.importerId })
        await this.setAutodetectOptions()
        if (importOptions.fileType === 'xlsx') {
          await this.setXLSX()
        }
        
        this.$emit('change', Boolean(this.fileName))
      },
      async isAutodetect() {
        await this.setAutodetectOptions()
      }
    },
    methods: {
      tableKey() {
        const schema = this.stepperProps.schema ? `${this.stepperProps.schema}_` : ''
        return `${schema}${this.stepperProps.table}`
      },
      async setXLSX() {
        this.sheets = await this.$util.send('import/excel/getSheets', { id: this.importerId })
        this.sheetSelected = this.sheets[0]
      },
      async previewFile() {
        const importOptions = {
          fileName: this.fileName,
          fileType: this.fileType,
          columnDelimeter: this.columnDelimeter,
          quoteCharacter: this.quoteCharacter,
          escapeCharacter: this.escapeCharacter,
          newlineCharacter: this.newlineCharacter,
          nullableValues: this.nullableValues,
          trimWhitespaces: this.trimWhitespaces,
          useHeaders: true
        }

        this.table = this.getTable()
        await this.$store.dispatch('updateTableColumns', this.table)

        importOptions.table = this.table
        await this.$util.send('import/setOptions', { id: this.importerId, options: importOptions })
        const { data, columns } = await this.$util.send('import/getFilePreview', { id: this.importerId })
        const tableColumns = columns.map(column =>
          ({
            ...column,
            formatter: this.cellFormatter
          })
        )

        this.tabulator = new TabulatorFull(this.$refs.tabulator, {
          data: data,
          columns: tableColumns,
          renderHorizontal: 'virtual',
          placeholder: 'No Data',
          width: '100%',
          columnDefaults: {
            resizable: false,
            headerSort: false,
            editable: false
          }
        })
      },
      async setAutodetectOptions() {
        const isAutodetect = this.isAutodetect
        const autodetectedFields = await this.$util.send('import/getAutodetectedSettings', { id: this.importerId })
        // TODO: For different file types, might have to get from the importer class since ones that shouldn't be shown should be "null"
        const defaultFormat = {
          columnDelimeter: ',',
          quoteCharacter: '"',
          escapeCharacter: '"',
          newlineCharacter: '\\n'
        }

        for (const opt in defaultFormat) {
          if (autodetectedFields[opt] && isAutodetect) {
            this[opt] = null
          } else if (!isAutodetect && autodetectedFields[opt] || !autodetectedFields[opt] && this[opt] === null) {
            this[opt] = defaultFormat[opt]
          }
        }
      },
      canContinue() {
        return Boolean(this.fileName)
      },
      getTable() {
        let foundSchema = ''
        if (this.schemaTables.length > 1) {
          foundSchema = this.schemaTables.find(s => s.schema === this.stepperProps.schema)
        } else {
          foundSchema = this.schemaTables[0]
        }
        return foundSchema.tables.find(t => t.name === this.stepperProps.table)
      },
      async onNext() {
        const importData = {
          table: this.tableKey(),
          importProcessId: this.importerId,
          importOptions: {
            fileName: this.fileName,
            columnDelimeter: this.columnDelimeter,
            quoteCharacter: this.quoteCharacter,
            escapeCharacter: this.escapeCharacter,
            newlineCharacter: this.newlineCharacter,
            nullableValues: this.nullableValues,
            trimWhitespaces: this.trimWhitespaces,
            useHeaders: true,
            fileType: this.fileType,
            table: this.table
          }
        }

        await this.$util.send('import/setOptions', { id: this.importerId, options: importData.importOptions })
        return await this.$store.commit('imports/upsertImport', importData)
      }
    }
  }
</script>
