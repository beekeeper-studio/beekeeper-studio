<template>
  <modal
    class="vue-dialog beekeeper-modal sql-files-import-modal"
    :name="modalName"
  >
    <div v-kbd-trap="true">
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
        <div v-if="!importing" class="message">
          This will make a copy of your .sql files and add them to your Beekeeper
          Studio saved queries. Any changes to the original .sql files will not be
          reflected in Beekeeper Studio.
        </div>
        <div v-if="!importing" class="form-group">
          <div class="form-group">
            <label for="import-type">Import Type</label>
            <select
              name="importType"
              class="form-control custom-select"
              v-model="importType"
              id="import-type"
            >
              <option value="single">Individual Files</option>
              <option value="recursive">Recursive Directory*</option>
            </select>
          </div>
          <template v-if="isIndividual || isUltimate">
            <div class="form-group">
              <label for="importFiles">{{importType === 'single' ? 'Files' : 'Directory'}}</label>
              <file-picker
                v-model="files"
                :multiple="isIndividual"
                :directory="!isIndividual"
                :button-text="buttonText"
                :options="dialogOptions"
              />
            </div>
            <div class="form-group">
              <label>Parent Folder</label>
              <in-app-folder-picker
                v-model="parentId"
                folder-path="data/queryFolders"
              />
            </div>
            <div v-if="!isIndividual" class="form-group">
              <label class="checkbox form-row">
                <input
                  v-model="preserveRoot"
                  type="checkbox"
                >
                Preserve Root
                <i
                  class="material-icons"
                  v-tooltip="{
                    content: `Import Root directory, otherwise import children at the root of the parent folder`
                  }"
                >
                help_outlined
                </i>
              </label>
            </div>
          </template>
          <upgrade-panel v-else
            standalone
            :feature-name="'Recursive Import'"
          />
        </div>
        <div v-else>
          <div v-if="!importFinished" class="importing-state">
            <label class="importing-ellipsis">Importing</label>
            <x-progressbar></x-progressbar>
          </div>
          <div v-else class="import-stats">
            <p class="stats-summary">
              Successfully imported
              {{ $pluralize('directory', importStats.directories, true) }}
              and {{ $pluralize('query', importStats.queries, true) }}
            </p>
            <div class="warnings">
              <button
                v-if="hasWarnings"
                type="button"
                class="warnings-toggle"
                :aria-expanded="warningsExpanded"
                @click="warningsExpanded = !warningsExpanded"
              >
                <i class="material-icons chevron">
                  {{ warningsExpanded ? 'expand_more' : 'chevron_right' }}
                </i>
                <span>Generated {{ $pluralize('warning', importStats.warnings.length, true) }}</span>
              </button>
              <span v-else class="warnings-none">
                Generated {{ $pluralize('warning', importStats.warnings.length, true) }}
              </span>
              <ul v-if="warningsExpanded" class="warnings-list">
                <li v-for="(warning, index) in importStats.warnings" :key="index">
                  {{ warning }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!importing" class="vue-dialog-buttons">
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
          :disabled="files.length === 0 || (isCloud && parentId === null)"
          @click="submit"
        >
          Import
        </button>
      </div>
      <div v-else class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click="close"
        >
          Close
        </button>
      </div>
    </div>
  </modal>
</template>

<script lang="ts">
import FilePicker from "@/components/common/form/FilePicker.vue";
import InAppFolderPicker from "@/components/common/form/InAppFolderPicker.vue";
import UpgradePanel from "@/components/upsell/UpgradePanel.vue";
import { AppEvent } from "@/common/AppEvent";
import { mapState, mapGetters } from 'vuex'
import _ from 'lodash';
import { IDirectoryImportStats } from '@/common/interfaces/IDirectoryImportStats';
import rawLog from '@bksLogger';

const log = rawLog.scope('SqlFilesImport')

export default {
  components: {
    FilePicker,
    InAppFolderPicker,
    UpgradePanel
  },
  props: ["name"],
  data() {
    return {
      files: [],
      importType: 'single',
      parentId: null,
      importing: false,
      importFinished: false,
      importStats: null,
      warningsExpanded: false,
      preserveRoot: true
    };
  },
  computed: {
    ...mapState('data/queryFolders', {'folders': 'items'}),
    ...mapGetters(["isCloud", "isUltimate"]),
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
      if (this.isIndividual) {
        return {
          filters: [
            { name: 'SQL files (*.sql, *.txt)', extensions: ['sql', 'txt'] },
            { name: 'All files', extensions: ['*'] },
          ]
        }
      }

      return {};
    },
    rootFolders() {
      return this.folders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name))
    },
    hasWarnings() {
      return this.importStats?.warnings?.length > 0;
    },
  },
  methods: {
    open() {
      this.files = [];
      this.parentId = null;
      this.importing = false;
      this.importFinished = false;
      this.importStats = null;
      this.warningsExpanded = false;
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    submit() {
      if (this.importType === 'single') {
        const files = _.isArray(this.files) ? this.files : [this.files];
        const config = {
          parentId: this.parentId,
          paths: files
        };
        this.$emit("submit", config);
        this.close();
      } else {
        this.importDirectory();
      }
    },
    async importDirectory() {
      this.importing = true;
      const dir = _.isArray(this.files) ? this.files[0] : this.files;
      try {
        const stats: IDirectoryImportStats = await this.$util.send('workspace/importDirectory', {
          dir,
          parentId: this.parentId,
          preserveRoot: this.preserveRoot
        });

        await this.$store.dispatch('refreshQueries');

        this.importStats = stats;
        this.importFinished = true;
      } catch (e) {
        this.$noty.error(`Error importing queries: ${e?.message ?? e}`)
        log.error(e);
        this.close();
      }
    }
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
};
</script>

<style lang="scss" scoped>
.importing-state {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 0;

  .importing-ellipsis {
    margin: 0;
    text-align: center;
  }
}

.import-stats {
  .stats-summary {
    margin: 0 0 0.5rem;
  }

  .warnings-toggle {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;

    .chevron {
      font-size: 1.25rem;
    }
  }

  .warnings-none {
    // Align text with the toggle rows, which are offset by the chevron.
    padding-left: 1.5rem;
  }

  .warnings-list {
    margin: 0.25rem 0 0;
    padding-left: 1.5rem;
    list-style: disc;
    max-height: 12rem;
    overflow-y: auto;

    li {
      margin-bottom: 0.25rem;
      word-break: break-word;
    }
  }
}

.importing-ellipsis::after {
  content: "...";
  animation: dots 1s steps(2) infinite;
}

@keyframes dots {
  0%   { content: "..."; }
  50%  { content: ".."; }
  100% { content: "..."; }
}
</style>
