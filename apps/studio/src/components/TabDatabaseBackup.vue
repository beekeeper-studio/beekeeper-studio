<template>
  <div
    v-if="isRestore && usedConfig.readOnlyMode"
    class="tabcontent"
  >
    <div class="not-supported">
      <div class="card-flat padding">
        <h3 class="card-title">
          Read Only Mode is enabled for this connection. Restoring is disabled
        </h3>
      </div>
    </div>
  </div>
  <div
    v-else-if="!isSupported"
    class="tabcontent"
  >
    <div class="not-supported">
      <div class="card-flat padding">
        <h3 class="card-title">
          Beekeeper does not currently support {{ isRestore ? 'restore' : 'backups' }} for {{ dialect }} ☹️
        </h3>
      </div>
    </div>
  </div>
  <div
    v-else-if="isCommunity"
    class="tab-upsell-wrapper"
  >
    <upsell-content></upsell-content>
  </div>
  <div
    v-else-if="dataLoaded"
    class="tabcontent"
  >
    <div v-if="!backupRunning" class="backup-stepper-wrapper">
      <Stepper
        :steps="steps"
        :button-portal-target="isRestore ? 'restore-stepper-buttons' : 'backup-stepper-buttons'"
        @finished="runBackup"
      />
    </div>
    <div
      v-else
      class="backup-tab-progress"
    >
      <modal
        class="vue-dialog beekeeper-modal relative job-status success"
        :name="`success-modal-${tab.id}`"
        @opened="focusCloseTab"
      >
        <div class="dialog-content">
          <div class="outer-circle">
            <div class="inner-circle">
              <i class="material-icons">check</i>
            </div>
          </div>
          <div>{{ isRestore ? 'Restore' : 'Backup' }} Successful!!</div>
          <button
            ref="closeTab"
            @click="close"
            class="btn btn-primary primary-action"
          >
            Close Tab
          </button>
          <button
            @click="$modal.hide(`success-modal-${tab.id}`)"
            class="close-modal"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
      </modal>
      <modal
        class="vue-dialog beekeeper-modal relative job-status fail"
        :name="`fail-modal-${tab.id}`"
        @opened="focusTryAgain"
      >
        <div class="dialog-content">
          <div class="outer-circle">
            <div class="inner-circle">
              <i class="material-icons">error_outline</i>
            </div>
          </div>
          <div>{{ isRestore ? 'Restore' : 'Backup' }} returned a non-zero exit code. Check the logs for details</div>
          <div class="btn-group">
            <button
              ref="ok"
              @click="$modal.hide(`fail-modal-${tab.id}`)"
              class="btn btn-primary primary-action"
            >
              Ok
            </button>
            <button
              @click="retry"
              class="btn btn-flat"
            >
              Retry
            </button>
            <button
              @click="$modal.hide(`fail-modal-${tab.id}`)"
              class="close-modal"
            >
              <i class="material-icons">close</i>
            </button>
          </div>
        </div>
      </modal>
      <BackupProgress
        :failed="this.failed"
        @openLog="openLog"
        @showLog="showLog"
        @retry="retry"
      />
    </div>
    <div class="expand" />
    <status-bar :active="active">
      <div class="statusbar-info col flex expand">
        <span
          class="statusbar-item"
          :title="`Included Tables ${includedTables}`"
        >
          <i class="material-icons">backup_table</i>
          <span>{{ includedTables }}</span>
        </span>
      </div>
      <portal-target
        class="portal-stepper-buttons"
        :name="isRestore ? 'restore-stepper-buttons' : 'backup-stepper-buttons'"
      />
    </status-bar>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import BackupObjects from './backup/BackupObjects.vue';
import BackupSettings from './backup/BackupSettings.vue';
import BackupReview from './backup/BackupReview.vue';
import BackupProgress from './backup/BackupProgress.vue';
import Stepper from './stepper/Stepper.vue';
import UpsellContent from '@/components/upsell/UpsellContent.vue'
import { Step } from './stepper/models';
import { mapGetters, mapState } from 'vuex';
import StatusBar from '@/components/common/StatusBar.vue';

export default Vue.extend({
  components: {
    Stepper,
    BackupProgress,
    StatusBar,
    UpsellContent
  },
  props: ['connection', 'tab', 'isRestore', 'active'],
  data() {
    return {
      backupRunning: false,
      dataLoaded: false
    }
  },
  watch: {
    commandEnd(newValue) {
      if (newValue) {
        this.tab.isRunning = false;
        if (!this.failed) {
          this.$modal.show(`success-modal-${this.tab.id}`);
        } else {
          this.$modal.show(`fail-modal-${this.tab.id}`)
        }
      }
    },
    active(isActive) {
      if (isActive) {
        // set the store's current mode (backup or restore)
        this.$store.commit('backups/setMode', this.isRestore);
      }
    }
  },
  computed: {
    ...mapGetters({
      'backupFeatures': 'backups/supportedFeatures',
      'logFile': 'backups/logFilePath',
      'dialect': 'dialect',
      'isCommunity': 'isCommunity',
    }),
    ...mapState('backups', {
      'backupTables': 'backupTables',
      'commandEnd': 'commandEnd',
      'failed': 'failed',
    }),
    ...mapState({
      'usedConfig': 'usedConfig',
      'supportedFeatures': 'supportedFeatures'
    }),
    includedTables() {
      if (!this.backupTables) {
        return 0;
      }
      return this.backupTables.filter((x) => x.included).length;
    },
    isSupported(): boolean {
      return this.isRestore ? this.supportedFeatures.restore : this.supportedFeatures.backups;
    },
    steps(): Step[] {
      return [
        this.backupFeatures.selectObjects ? {
          component: BackupObjects,
          title: 'Choose Entities',
          icon: 'data_object',
          nextButtonText: this.isRestore ? 'Configure Restore' : 'Configure Backup',
          nextButtonIcon: 'keyboard_arrow_right',
          completed: false,
        } : null,
        this.backupFeatures.settings ? {
          component: BackupSettings,
          title: this.isRestore ? 'Configure Restore' : 'Configure Backup',
          icon: 'settings',
          nextButtonText: 'Review',
          nextButtonIcon: 'keyboard_arrow_right',
          nextButtonDisabledTooltip: 'Please ensure that all required (*) fields are filled out.',
          completed: false,
        } : null,
        {
          component: BackupReview,
          title: 'Review & Execute',
          icon: 'preview',
          nextButtonText: this.isRestore ? 'Execute Restore' : 'Execute Backup',
          nextButtonIcon: 'start',
          completePrevious: true,
          completed: false,
        }
      ].filter((s) => !!s);
    }
  },
  methods: {
    runBackup() {
      this.backupRunning = true;
      this.tab.isRunning = true;
      this.$store.dispatch('backups/execute');
    },
    retry() {
      this.$store.dispatch('backups/reset', false);
      this.backupRunning = false;
    },
    close() {
      this.$emit('close', this.tab);
    },
    focusCloseTab() {
      if (!this.$refs['closeTab'] || this.$refs['closeTab'].length === 0) return;
      this.$refs['closeTab'].focus();
    },
    focusTryAgain() {
      if (!this.$refs['ok'] || this.$refs['ok'].length === 0) return;
      this.$refs['ok'].focus();
    },
    openLog() {
      this.$native.files.open(this.logFile);
    },
    showLog() {
      this.$native.files.showItemInFolder(this.logFile);
    }
  },
  mounted() {
    // we don't need to run any of this logic if backup isn't supported anyways
    if (this.isSupported) {
      this.$store.commit('backups/setMode', this.isRestore);
      this.$store.dispatch('backups/reset');
      this.$store.dispatch('backups/findDumpTool');
    }
    this.dataLoaded = true;
  },
  beforeDestroy() {
    if (this.isSupported) {
      // Ensure we are in the correct mode before deleting the file
      this.$store.commit('backups/setMode', this.isRestore);

      // Delete the temp log file
      this.$store.dispatch('backups/deleteLogFile');
    }
  }
});
</script>

<style lang="scss">
</style>
