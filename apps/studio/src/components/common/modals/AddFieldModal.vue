<template>
  <portal to="modals">
    <modal :name="modalName" class="vue-dialog beekeeper-modal">
      <form v-kbd-trap="true" @submit.prevent="submit">
        <div class="dialog-content">
          <div class="dialog-c-title">
            Add Field
            <a
              class="close-btn btn btn-fab"
              href="#"
              @click.prevent="close"
            >
              <i class="material-icons">clear</i>
            </a>
          </div >
          <div class="form-group">
            <label for="field-name">Field Name</label>
            <input type="text" id="field-name" name="field-name" ref="fieldInput" v-model="fieldName">
          </div>
          <div class="form-group">
            <label for="type-hint">Type Hint</label>
            <div class="data-select-wrap">
              <v-select
                :title="'Type Hint: ' + typeHint"
                v-model="typeHint"
                :options="columnTypes"
                :components="{OpenIndicator}"
                placeholder="Select a type hint..."
                class="dropdown-search"
              />
            </div>
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
            type="submit"
            :disabled="!canSubmit"
          >
            Add
          </button>
        </div>
      </form>
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import vSelect from 'vue-select'
import Vue from 'vue'
import { mapGetters } from 'vuex'

export default Vue.extend({
  components: {
    vSelect,
  },
  data() {
    return {
      modalName: 'add-field-modal',
      fieldName: "",
      typeHint: "",
      OpenIndicator: {
        render: createElement => createElement('i', {class: {'material-icons': true}}, 'arrow_drop_down')
      }
    }
  },
  computed: {
    ...mapGetters(['dialectData']),
    columnTypes() {
      return this.dialectData.columnTypes.map((t) => t.pretty);
    },
    rootBindings() {
      return [{ event: AppEvent.openAddFieldModal, handler: this.open }]
    },
    canSubmit() {
      return this.fieldName.length > 0 && this.typeHint.length > 0;
    }
  },
  methods: {
    open() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.fieldName = "";
      this.typeHint = "";
      this.$modal.hide(this.modalName);
    },
    async submit() {
      if (!this.canSubmit) return;

      this.$emit('done', { fieldName: this.fieldName, typeHint: this.typeHint});
      this.$noty.success(`${this.fieldName} added`);
      this.close();
    }
  },
  mounted() {
    this.registerHandlers(this.rootBindings)
  }
})
</script>

<style lang="scss">
@import '../../../shared/assets/styles/_variables';
.data-select-wrap {
  display: flex;
  align-items: center;
  height: $input-height;
  min-height: $input-height;
  padding: 0 $gutter-h 0 0;
  margin-top: ($gutter-w * 0.25);
  margin-bottom: $gutter-h;
  background: rgba($theme-base, 0.08);
  transition: background 0.15s ease-in-out;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: rgba($theme-base, 0.1);
  }
  .select-wrap {
    border: 0;
    box-shadow: none;
  }
  select {
    color: $text-dark;
    padding-right: 1.5rem;
    cursor: pointer;
  }
}

.v--modal-box.v--modal {
  overflow: visible !important;
}
</style>
