<template>
  <loading-spinner v-if="isRunning && !forceIcon" />
  <table-icon
    v-else-if="tab.tabType === 'table'"
    :table="tab"
  />
  <i
    v-else-if="tab.tabType === 'view'"
    class="material-icons item-icon view-icon"
  >grid_on</i>
  <i
    v-else-if="tab.tabType === 'query'"
    class="material-icons item-icon query"
  >code</i>
  <i
    v-else-if="tab.tabType === 'import-table'"
    class="material-icons-outlined item-icon table-properties"
    :class="iconClass"
  >import_export</i>
  <i
    v-else-if="tab.tabType === 'table-properties'"
    class="material-icons-outlined item-icon icon-table-properties"
    :class="iconClass"
  >construction</i>
  <i
    v-else-if="tab.tabType === 'settings'"
    class="material-icons item-icon settings"
  >settings</i>
  <i
    v-else-if="tab.tabType === 'table-builder'"
    class="material-icons item-icon table-builder-icon"
  >add</i>
  <i
    v-else-if="tab.tabType === 'backup'"
    class="bk-backup item-icon"
  />
  <i
    v-else-if="tab.tabType === 'restore'"
    class="material-icons item-icon"
  >settings_backup_restore</i>
  <i
    v-else-if="tab.tabType === 'import-export-database'"
    class="material-icons item-icon"
  >import_export</i>
  <i
    v-else-if="tab.tabType === 'shell'"
    class="material-icons item-icon query"
  >terminal</i>
  <i
    v-else
    class="material-icons item-icon"
  >{{ tabTypeConfig?.icon || 'new_releases' }}</i>
</template>
<script lang="ts">
import Vue, { PropType } from 'vue'
import TableIcon from '../common/TableIcon.vue'
import LoadingSpinner from '../common/loading/LoadingSpinner.vue'
import { mapGetters } from 'vuex'
import { TransportOpenTab } from '@/common/transport/TransportOpenTab'

export default Vue.extend({
  components: { TableIcon, LoadingSpinner },
  props: {
    tab: {
      type: Object as PropType<TransportOpenTab>
    },
    forceIcon: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isRunning: false,
    }
  },
  watch: {
    tab: {
      deep: true,
      handler(value) {
        this.isRunning = value.isRunning;
      }
    }
  },
  computed: {
    ...mapGetters({
      'tabTypeConfigs': 'tabs/tabTypeConfigs',
    }),
    iconClass() {
      const result = {}
      result[`${this.tab.entityType}-icon`] = true
      return result
    },
    tabTypeConfig() {
      return this.tabTypeConfigs.find((config) => {
        return (
          config.type === this.tab.tabType &&
          config.pluginId === this.tab.context.pluginId
        );
      });
    },
  }
})
</script>
