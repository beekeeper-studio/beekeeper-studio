<template>
  <modal
    class="vue-dialog beekeeper-modal"
    @before-open="onBeforeOpened"
    :name="modalName"
  >
    <!-- TODO: Make sure one of the elements in this modal is focused so that the keyboard trap works -->
    <form
      v-kbd-trap="true"
      @submit.prevent="onSubmit"
    >
      <div class="dialog-content">
        <div class="dialog-c-title flex flex-middle">
          Hidden Entities
        </div>
        <a
          class="close-btn btn btn-fab"
          href="#"
          @click.prevent="closeModal"
        >
          <i class="material-icons">clear</i>
        </a>
        <div class="modal-form">
          <div class="list-container">
            <div
              v-for="(schema, index) in schemas"
              :key="schema"
              class="hidden-list-item"
            >
              <div>
                <i
                  title="Schema"
                  class="schema-icon item-icon material-icons"
                >folder</i>
                <span>{{ schema }}</span>
              </div>
              <button
                type="button"
                @click="unhideSchema(index)"
                class="btn btn-flat btn-small"
              >
                Unhide
              </button>
            </div>
            <div
              v-for="(entity, index) in entities"
              :key="entity.name"
              class="hidden-list-item"
            >
              <div>
                <table-icon :table="entity" />
                <span>{{ entity.name }}</span>
              </div>
              <button
                type="button"
                @click="unhideEntity(index)"
                class="btn btn-flat btn-small"
              >
                Unhide
              </button>
            </div>
            <span
              class="no-entities"
              v-show="noHidden"
            >
              No hidden entities
            </span>
          </div>
        </div>
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

    > div {
      display: flex;
      gap: 0.5rem;
    }

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
  import TableIcon from '@/components/common/TableIcon.vue'
  import { AppEvent } from "@/common/AppEvent"

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
        this.entities = [...this.hiddenEntities]
        this.schemas = [...this.hiddenSchemas]
      },
      unhideSchema(index: number) {
        const [schema] = this.schemas.splice(index, 1)
        this.trigger(AppEvent.toggleHideSchema, schema, false)
      },
      unhideEntity(index: number) {
        const [entity] = this.entities.splice(index, 1)
        this.trigger(AppEvent.toggleHideEntity, entity, false)
      },
      closeModal() {
        this.$modal.hide(this.modalName)
      },
    },
  }
</script>
