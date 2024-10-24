<template>
  <div>
    <div class="file-status">
      <div class="file">
        {{ table.name }}
      </div>
      <div v-if="status === 'idle' || status === 'exporting'">
        {{ percentage }}%
      </div>
      <div
        class="complete status"
        v-else-if="status === 'completed'"
      >
        <i class="material-icons">check_circle</i>
        <div class="with-message">
          Completed
        </div>
      </div>
      <div
        class="status"
        v-else-if="exportsStarted"
      >
        <div class="failed status">
          <i class="material-icons">error</i>
          <div class="with-message">
            Failed
          </div>
        </div>
        <button
          class="warning status"
          @click="$emit('retry', table)"
        >
          Try Again
        </button>
      </div>
      <div
        v-else
        class="status"
      >
        <div class="pending status">
          <div class="with-message">
            Pending
          </div>
        </div>
      </div>
    </div>
    <div
      class="progress"
      v-if="status === 'idle' || status === 'exporting'"
    >
      <div class="progress-bg">
        <div
          class="progress-fill"
          :style="{'width': `${percentage}%`}"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
	props: ['table', 'export', 'exportsStarted'],
  computed: {
    status() {
      return this.export?.status;
    },
    percentage() {
      const perc = this.export ? this.export.percentComplete : 0;

      return window.isNaN(perc) ? 0 : perc;
    }
  }
})
</script>
