<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal"
      :name="modalName"
      @opened="$refs.nameInput.focus()"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          Rename {{ elementType.toLowerCase() }}
        </div>
        <error-alert
          :error="errors"
          :title="`Failed to rename ${elementType.toLowerCase()}`"
        />
        <div class="form-group">
          <label for="element-name">Name</label>
          <input id="element-name" name="name" v-model="elementNewName" type="text" ref="nameInput">
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
import { DatabaseElement } from '@/lib/db/types'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

export default Vue.extend({
  components: {
    ErrorAlert,
  },
  data() {
    return {
      modalName: 'rename-element-modal',
      elementType: "",
      elementName: "",
      elementNewName: "",
      elementSchema: "",
      loading: false,
      errors: null,
    };
  },
  computed: {
    ...mapState(['connection']),
    rootBindings() {
      return [
        { event: AppEvent.setDatabaseElementName, handler: this.open },
      ]
    },
  },
  methods: {
    open(options: { type: DatabaseElement, item: TableOrView | Routine | string }) {
      this.loading = false
      this.errors = null
      this.elementType = options.type
      if (typeof options.item === 'string') {
        this.elementName = options.item
      } else {
        this.elementName = options.item.name
      }
      this.elementNewName = this.elementName
      this.$modal.show(this.modalName)
    },
    close() {
      this.$modal.hide(this.modalName)
    },
    async rename() {
      if (!await this.$confirm(`Are you sure you want to rename the ${this.elementType.toLowerCase()}?`, "", { confirmLabel: "Rename" })) {
        return
      }

      this.loading = true

      try {
        await this.connection.setElementName(this.elementName, this.elementNewName, this.elementType, this.elementSchema)
      } catch (e) {
        this.errors = [e]
        return
      } finally {
        this.loading = false
      }

      this.close()

      this.$store.dispatch('updateTables')
      this.$store.dispatch('updateRoutines')
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
