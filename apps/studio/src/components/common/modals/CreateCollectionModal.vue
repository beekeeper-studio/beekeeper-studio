<template>
  <portal to="modals">
    <modal :name="modalName" class="vue-dialog beekeeper-modal">
      <div v-kbd-trap="true">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Create Collection
            <a
              class="close-btn btn btn-fab"
              href="#"
              @click.prevent="close"
            >
              <i class="material-icons">clear</i>
            </a>
          </div >
          <div class="form-group">
            <label for="collection-name">Collection Name</label>
            <input type="text" id="collection-name" name="collection-name" ref="collectionInput" v-model="collectionName">
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat btn-cancel"
            type="button"
            ref="cancelBtn"
            @click.prevent="close"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click="submit"
          >
            Create
          </button>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
import { mapState } from 'vuex'

export default Vue.extend({
  data() {
    return {
      modalName: 'create-collection-modal',
      collectionName: ""
    }
  },
  computed: {
    ...mapState(['connection']),
    rootBindings() {
      return [{ event: AppEvent.openCreateCollectionModal, handler: this.open }]
    }
  },
  methods: {
    open() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.collectionName = "";
      this.$modal.hide(this.modalName);
    },
    async submit() {
      await this.connection.createTable({ table: this.collectionName });
      await this.$store.dispatch('updateTables');
      this.$noty.success(`${this.collectionName} created`);
      this.close();
    }
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  }
})
</script>
