<template>
  <div class="fixed">
    <div class="data-select-wrap" :class="{'disabled-db-dropdown': isRefreshing}">
      <p
        v-if="!supportsListingNamespaces"
        class="no-list-namespace"
        :title="selectedNamespace"
      >
        {{ selectedNamespace }}
      </p>
      <v-select
        v-else
        class="dropdown-search"
        :title="'Namespace: ' + selectedNamespace"
        v-model="selectedNamespace"
        :options="availableNamespaces"
        :components="{OpenIndicator}"
        placeholder="Select a namespace..."
      />
      <a
        v-if="supportsListingNamespaces"
        class="refresh"
        @click.prevent="refreshNamespaces"
        title="Refresh Namespaces"
      >
        <i class="material-icons" :class="{'refreshing-db-icon': isRefreshing}">
          {{ isRefreshing ? 'sync' : 'refresh' }}
        </i>
      </a>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import _ from 'lodash';
import vSelect from 'vue-select';
import { mapActions, mapState } from "vuex";
import { SurrealAuthType } from "@/lib/db/types";

export default Vue.extend({
  components: {
    vSelect,
  },
  data() {
    return {
      selectedNamespace: null,
      isRefreshing: false,
      OpenIndicator: {
        render: createElement => createElement('i', { class: {'material-icons': true}}, 'arrow_drop_down')
      }
    }
  },
  methods: {
    ...mapActions({ updateNamespaceList: 'updateNamespaceList' }),
    async refreshNamespaces() {
      if (this.isRefreshing) {
        return;
      }

      this.isRefreshing = true;
      try {
        await this.updateNamespaceList();
      } finally {
        this.isRefreshing = false;
      }
    }
  },
  async mounted() {
    this.selectedNamespace = this.currentNamespace;
  },
  computed: {
    supportsListingNamespaces() {
      return this.usedConfig?.surrealDbOptions?.authType === SurrealAuthType.Root || false;
    },
    availableNamespaces() {
      return _.without(this.nss, this.selectedNamespace);
    },
    ...mapState({ currentNamespace: 'namespace', nss: 'namespaceList', usedConfig: 'usedConfig'})
  },
  watch: {
    currentNamespace(newValue) {
      if (this.selectedNamespace !== newValue) {
        this.selectedNamespace = newValue;
      }
    },
    selectedNamespace() {
      this.$emit('namespaceSelected', this.selectedNamespace)
    }
  }
})
</script>

<style lang="scss" scoped>
  .disabled-ns-dropdown {
    pointer-events: none;

    .refreshing-ns-icon {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  }

  .no-list-namespace {
    width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-left: 0.75;
  }
</style>
