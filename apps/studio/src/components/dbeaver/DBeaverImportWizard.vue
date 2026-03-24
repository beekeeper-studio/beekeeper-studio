<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal dbeaver-import-modal"
      name="dbeaver-import"
      height="auto"
      :scrollable="true"
      :pivotY="0.3"
      @before-open="reset"
    >
      <div class="dialog-content">
        <div class="dialog-c-title flex flex-between">
          <span>Import from DBeaver</span>
          <button
            class="btn btn-flat btn-icon"
            @click="$modal.hide('dbeaver-import')"
          >
            <i class="material-icons">close</i>
          </button>
        </div>
        <stepper
          :steps="steps"
          @finished="close"
        />
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from 'vue'
import Stepper from '@/components/stepper/Stepper.vue'
import { Step } from '@/components/stepper/models'
import DBeaverSourceSelect from './DBeaverSourceSelect.vue'
import DBeaverImportPreview from './DBeaverImportPreview.vue'
import DBeaverImportResult from './DBeaverImportResult.vue'

export default Vue.extend({
  components: { Stepper },
  data() {
    return {
      steps: [] as Step[],
    }
  },
  methods: {
    reset() {
      this.steps = [
        {
          component: DBeaverSourceSelect,
          title: 'Source',
          icon: 'search',
          completed: false,
          stepperProps: {},
        },
        {
          component: DBeaverImportPreview,
          title: 'Select',
          icon: 'checklist',
          completed: false,
          completePrevious: true,
          stepperProps: {},
        },
        {
          component: DBeaverImportResult,
          title: 'Import',
          icon: 'download',
          completed: false,
          completePrevious: true,
          nextButtonText: 'Done',
          stepperProps: {},
        },
      ] as Step[]
    },
    close() {
      this.$modal.hide('dbeaver-import')
    },
  },
  mounted() {
    this.reset()
  },
})
</script>

<style lang="scss" scoped>
.dbeaver-import-modal {
  .dialog-content {
    padding: 0;
    min-height: 400px;
  }
  .dialog-c-title {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-color);
    align-items: center;
  }
}
</style>
