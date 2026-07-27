<template>
  <modal
    class="vue-dialog beekeeper-modal sql-files-import-modal"
    :name="modalName"
  >
    <!-- TODO: Make sure one of the elements in this modal is focused so that the keyboard trap works -->
    <div v-kbd-focus="true">
      <div class="dialog-content">
        <div class="dialog-c-title">
          Import SQL Files into Saved Queries
        </div>
        <a
          class="close-btn btn btn-fab"
          href="#"
          @click.prevent="close"
        >
          <i class="material-icons">clear</i>
        </a>
        <div class="message">
          This will make a copy of your .sql files and add them to your Beekeeper
          Studio saved queries. Any changes to the original .sql files will not be
          reflected in Beekeeper Studio.
        </div>
        <div class="form-group">
          <label for="import-type">Import Type</label>
          <select
            name="importType"
            class="form-control custom-select"
            v-model="importType"
            id="import-type"
          >
            <option value="single">Individual Files</option>
            <option value="recursive">Recursive Directory</option>
          </select>
          <div class="file-picker-wrapper">
            <file-picker
              v-model="files"
              :multiple="isIndividual"
              :button-text="buttonText"
              :options="dialogOptions"
            />
          </div>
          <div class="form-group" v-if="isCloud && rootFolders.length > 0 && !isIndividual">
            <label>Parent Folder</label>
            <select v-model="parentId">
              <option v-for="f in rootFolders" :key="f.id" :value="f.id">
                {{ f.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click="close"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="files.length === 0"
          @click="submit"
        >
          Import
        </button>
      </div>
    </div>
  </modal>
</template>

<script>
import FilePicker from "@/components/common/form/FilePicker.vue";
import { AppEvent } from "@/common/AppEvent";
import { mapGetters, mapState } from 'vuex'
import _ from 'lodash';

export default {
  components: {
    FilePicker,
  },
  props: ["name"],
  data() {
    return {
      files: [],
      importType: 'single',
      parentId: null
    };
  },
  computed: {
    ...mapGetters(['isCloud', 'isUltimate']),
    ...mapState('data/queryFolders', {'folders': 'items'}),
    modalName() {
      return this.name || "sql-files-import";
    },
    rootBindings() {
      return [{ event: AppEvent.promptSqlFilesImport, handler: this.open }];
    },
    buttonText() {
      return this.importType === 'single' ? 'Choose Files' : 'Choose Directory'
    },
    isIndividual() {
      return this.importType === 'single';
    },
    dialogOptions() {
      const result = {
        filters: null,
        properties: null
      }

      if (this.isIndividual) {
        result.filters = [
          { name: 'SQL files (*.sql, *.txt)', extensions: ['sql', 'txt'] },
          { name: 'All files', extensions: ['*'] },
        ]
      } else {
        result.properties = [ 'openDirectory' ]
      }

      return result;
    },
    rootFolders() {
      return this.folders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name))
    },
  },
  methods: {
    open() {
      this.files = [];
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    submit() {
      const files = _.isArray(this.files) ? this.files : [this.files];
      const config = {
        type: this.importType,
        parentId: this.parentId,
        paths: files
      };
      this.$emit("submit", config);
      this.close();
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
};
</script>
