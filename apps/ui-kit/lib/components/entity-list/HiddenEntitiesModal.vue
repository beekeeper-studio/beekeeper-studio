<template>
  <teleport to="body">
    <!-- TODO: Make sure one of the elements in this modal is focused so that the keyboard trap works -->
    <!-- FIXME v-kbd-trap is not implemented yet -->
    <!-- v-kbd-trap="true" -->
    <div class="BksEntityList-modal-container" @click.self="$emit('close')">
      <div class="dialog-content">
        <div class="dialog-c-title flex flex-middle">Hidden Entities</div>
        <a
          class="close-btn btn btn-fab"
          href="#"
          @click.prevent="$emit('close')"
        >
          <i class="material-icons">clear</i>
        </a>
        <div class="list-container">
          <div
            v-for="entity in hiddenEntities"
            :key="entity.name"
            class="hidden-list-item"
          >
            <div>
              <i
                v-if="entity.entityType === 'schema'"
                title="Schema"
                class="schema-icon item-icon material-icons"
              >folder</i>
              <table-icon
                v-else
                :table="entity"
              />
              <span>{{ entity.name }}</span>
            </div>
            <button
              type="button"
              @click="$emit('unhide-entity', entity)"
              class="btn btn-flat btn-small"
            >
              Unhide
            </button>
          </div>
          <span class="no-entities" v-show="hiddenEntities.length === 0">
            No hidden entities
          </span>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script lang="ts">
import Vue from "vue";
import TableIcon from "./TableIcon.vue";
import Teleport from "vue2-teleport";

export default Vue.extend({
  props: ["hiddenEntities"],
  components: { TableIcon, Teleport },
});
</script>
