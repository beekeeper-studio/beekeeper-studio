<template>
  <base-modal
    :name="modalName"
    class="connection-type-picker-modal"
    height="32rem"
    @submit="next"
    @closed="cancel"
  >
    <template #title>Select Connection Type</template>

    <div class="toolbar">
      <div class="filter-wrap">
        <input
          class="filter-input"
          type="text"
          placeholder="Search connection types"
          v-model="filter"
        />
        <x-buttons class="filter-actions">
          <x-button
            v-if="filter"
            @click="filter = ''"
          >
            <i class="clear material-icons">cancel</i>
          </x-button>
        </x-buttons>
      </div>
    </div>

    <div class="connection-types" v-if="filteredTypes.length">
      <label
        class="connection-type"
        :class="{ selected: selectedType === type.value }"
        v-for="type in filteredTypes"
        :key="type.value"
        @dblclick="next"
      >
        <input
          type="radio"
          name="connection-type"
          :value="type.value"
          v-model="selectedType"
        />
        <database-icon :type="type.value" />
        <span class="name">{{ type.name }}</span>
      </label>
    </div>
    <div class="empty-state" v-else>
      No connection types match "{{ filter }}"
    </div>

    <template #footer="{ close }">
      <button class="btn btn-flat" type="button" @click.prevent="close">
        Cancel
      </button>
      <button class="btn btn-primary" type="submit" :disabled="!selectedType">
        Next
      </button>
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import DatabaseIcon from "@/components/common/DatabaseIcon.vue";
import { AppEvent } from "@/common/AppEvent";
import { ConnectionType } from "@/lib/db/types";

export default Vue.extend({
  components: { BaseModal, DatabaseIcon },
  data() {
    return {
      modalName: "connection-type-picker-modal",
      onSelect: null as ((type: ConnectionType) => void) | null,
      onCancel: null as (() => void) | null,
      filter: "",
      selectedType: null as string | null,
    };
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openConnectionTypePicker, handler: this.open }];
    },
    filteredTypes() {
      const types = this.$config.defaults.connectionTypes;
      const filter = this.filter.trim().toLowerCase();
      if (!filter) {
        return types;
      }
      return types.filter((type) => type.name.toLowerCase().includes(filter));
    },
  },
  methods: {
    open({ onSelect, onCancel }) {
      this.filter = "";
      this.selectedType = null;
      this.onSelect = onSelect;
      this.onCancel = onCancel;
      this.$modal.show(this.modalName);
    },
    next() {
      if (!this.selectedType) {
        return;
      }
      const onSelect = this.onSelect;
      this.onSelect = null;
      this.onCancel = null;
      this.$modal.hide(this.modalName);
      onSelect?.(this.selectedType);
    },
    cancel() {
      const onCancel = this.onCancel;
      this.onSelect = null;
      this.onCancel = null;
      onCancel?.();
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

<style lang="scss" scoped>
.toolbar {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: hsl(from var(--theme-bg) h s calc(l + 1));
  margin-bottom: 0.75rem;
}

.filter-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-input {
  flex: 1;
  padding-right: 1.8rem;
}

.filter-actions {
  position: absolute;
  right: 0;

  x-button {
    padding: 0 0.4rem;
    background: transparent;
    box-shadow: none;
    cursor: pointer;
    --trigger-effect: none;

    &:before {
      display: none !important;
    }

    .material-icons {
      font-size: 1rem;
      color: var(--text-light);
    }
  }
}

.toolbar,
.connection-types {
  margin-right: -0.5rem;
}

.connection-type {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 1.8rem;
  line-height: 1.8rem;
  border-radius: 4px;

  &:hover,
  &:focus-within {
    background: rgb(from var(--theme-base) r g b / 3.5%);
  }

  &.selected {
    background: rgb(from var(--theme-base) r g b / 6%);
  }

  ::v-deep .database-icon {
    display: inline-flex;
    justify-content: center;
    width: 1.25rem;
    font-weight: 700;
    font-size: 1.25rem;
    margin-right: 0.5rem;
  }

  input[type="radio"] {
    position: absolute;
    opacity: 0;
  }
}
</style>
