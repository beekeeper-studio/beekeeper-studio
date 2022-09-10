<template>
  <modal
    class="vue-dialog beekeeper-modal"
    @before-open="onBeforeOpened"
    :name="modalName"
  >
    <form @submit.prevent="onSubmit">
      <div class="dialog-content">
        <div class="dialog-c-title flex flex-middle">
          Hidden Entities
        </div>
        <span class="close-btn btn btn-fab">
          <i class="material-icons" @click.prevent="closeModal">clear</i>
        </span>
        <div class="modal-form">
          <div class="list-container">
            <template v-for="(schema, index) in schemas">
              <div
                v-if="!schema.unhide"
                :key="schema.name"
                class="hidden-list-item"
              >
                <div>
                  <i title="Schema" class="schema-icon item-icon material-icons">folder</i>
                  <span>{{schema.name}}</span>
                </div>
                <button type="button" @click="unhideSchema(index)" class="btn btn-flat btn-small">Unhide</button>
              </div>
            </template>
            <template v-for="(entity, index) in entities">
              <div
                v-if="!entity.unhide"
                :key="entity.name"
                class="hidden-list-item"
              >
                <div>
                  <table-icon :table="entity.value" />
                  <span>{{entity.name}}</span>
                </div>
                <button type="button" @click="unhideEntity(index)" class="btn btn-flat btn-small">Unhide</button>
              </div>
            </template>
            <span class="no-entities" v-show="noHidden">
              No hidden entities
            </span>
          </div>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="closeModal"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="noChanges"
        >
          Apply
        </button>
      </div>
    </form>
  </modal>
</template>

<style lang="scss" scoped>
  .modal-form {
    margin-top: 0.25rem;
  }

  .list-container {
    position: relative;
    height: 14.5rem;
    margin-top: 0.5rem;
    font-size: 13px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .no-entities {
    position: absolute;
    left: 0;
    right: 0;
    top: 1rem;
    text-align: center;
  }

  .hidden-list-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;

    button {
      visibility: hidden;
    }

    &:hover {
      background-color: rgba(0, 0, 0, 0.2);
    }

    &:hover > button {
      visibility: visible;
    }
  }

  .no-entities {
    opacity: 0.5;
  }
</style>

<script lang="ts">
  import _ from 'lodash'
  import { DatabaseEntity } from "@/lib/db/models"
  import TableIcon from '@/components/common/TableIcon.vue'

  export default {
    props: ['hiddenEntities', 'hiddenSchemas'],
    components: { TableIcon },
    data() {
      return {
        modalName: 'hidden-entities',
        entities: [],
        schemas: [],
      }
    },
    computed: {
      noChanges() {
        return this.entities.every((e) => !e.unhide) && this.schemas.every((s) => !s.unhide)
      },
      noHidden() {
        return this.entities.length + this.schemas.length === 0
          || (!this.entities.some((h) => !h.unhide) && !this.schemas.some((h) => !h.unhide))
      }
    },
    methods: {
      onBeforeOpened() {
        this.entities = this.hiddenEntities.map((e: DatabaseEntity) => ({
          name: e.name,
          unhide: false,
          value: e,
        }))

        this.schemas = this.hiddenSchemas.map((name: string) => ({
          name,
          unhide: false,
          value: name,
        }))
      },
      onSubmit() {
        const entities = this.entities.filter((e) => e.unhide).map((e) => e.value)
        const schemas = this.schemas.filter((s) => s.unhide).map((s) => s.value)
        this.$emit('unhide', { entities, schemas })
        this.closeModal()
      },
      unhideEntity(index: number) {
        this.entities[index].unhide = true
      },
      unhideSchema(index: number) {
        this.schemas[index].unhide = true
      },
      closeModal() {
        this.$modal.hide(this.modalName)
      },
    },
  }
</script>
