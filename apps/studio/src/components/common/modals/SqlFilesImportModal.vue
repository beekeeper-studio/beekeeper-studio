<template>
  <modal
    class="vue-dialog beekeeper-modal sql-files-import-modal"
    :name="modalName"
  >
    <!-- TODO: Make sure one of the elements in this modal is focused so that the keyboard trap works -->
    <div v-kbd-focus="true">
      <div class="dialog-content">
        <div class="dialog-c-title">
          {{ $t('sqlImport.title') }}
        </div>
        <a
          class="close-btn btn btn-fab"
          href="#"
          @click.prevent="close"
        >
          <i class="material-icons">clear</i>
        </a>
        <div class="message">
          {{ $t('sqlImport.message') }}
        </div>
        <div class="file-picker-wrapper">
          <file-picker
            v-model="files"
            multiple
            :button-text="$t('sqlImport.chooseFiles')"
            :options="{
              filters: [
                { name: $t('sqlImport.sqlFilesFilter'), extensions: ['sql'] },
                { name: $t('sqlImport.allFilesFilter'), extensions: ['*'] },
              ],
            }"
          />
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click="close"
        >
          {{ $t('common.cancel') }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="files.length === 0"
          @click="submit"
        >
          {{ $t('sqlImport.import') }}
        </button>
      </div>
    </div>
  </modal>
</template>

<script>
import FilePicker from "@/components/common/form/FilePicker.vue";
import { AppEvent } from "@/common/AppEvent";
import _ from 'lodash';

export default {
  components: {
    FilePicker,
  },
  props: ["name"],
  data() {
    return {
      files: [],
    };
  },
  computed: {
    modalName() {
      return this.name || "sql-files-import";
    },
    rootBindings() {
      return [{ event: AppEvent.promptSqlFilesImport, handler: this.open }];
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
      this.$emit("submit", files);
      this.close();
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
};
</script>
