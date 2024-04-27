<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal"
      :name="name"
      @opened="$refs.nameInput.focus()"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          Rename {{ entityType }}
        </div>
        <div class="form-group">
          <label for="entity-name">Name</label>
          <input id="entity-name" name="name" v-model="entityName" type="text" ref="nameInput">
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="close"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click.prevent="rename"
          :disabled="loading"
        >
          Confirm
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from '@/common/AppEvent';
import { TableOrView, Routine } from "@/lib/db/models";
import { mapState } from 'vuex'

export default Vue.extend({
  data() {
    return {
      name: 'rename-entity-modal',
      entityType: "",
      entityName: "",
      loading: false,
    };
  },
  computed: {
    ...mapState(['connection']),
    rootBindings() {
      return [
        { event: AppEvent.renameEntity, handler: this.open },
      ]
    },
  },
  methods: {
    open(options: { type: 'schema' | 'table' | 'view' | 'routine', item: TableOrView | Routine | string }) {
      this.loading = false
      this.entityType = options.type
      if (typeof options.item === 'string') {
        this.entityName = options.item
      } else {
        this.entityName = options.item.name
      }
      this.$modal.show(this.name)
      console.log('momo', options)
    },
    close() {
      this.$modal.hide(this.name)
    },
    async rename() {
      await this.connection.renameEntity(this.entityType, this.entityName)
      this.close();
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings)
  },
});
</script>
