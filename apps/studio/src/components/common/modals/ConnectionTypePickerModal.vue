<template>
  <base-modal
    :name="modalName"
    height="32rem"
    @submit="handleSubmit"
    @closed="handleClosed"
  >
    <template #title>
      Select Connection Type
    </template>

    <template #default="{ submit }">
      <search class="toolbar">
        <div class="filter-wrap">
          <label class="visually-hidden" for="connection-type-filter">
            Search connection types
          </label>
          <input
            id="connection-type-filter"
            class="filter-input"
            type="search"
            placeholder="Search connection types"
            v-model="filter"
            @keydown.down.prevent="focusList"
          >
          <button
            v-if="filter"
            class="filter-clear"
            type="button"
            title="Clear search"
            @click="filter = ''"
          >
            <i class="material-icons" aria-hidden="true">cancel</i>
            <span class="visually-hidden">Clear search</span>
          </button>
        </div>
      </search>

      <fieldset class="connection-types" ref="list" v-if="filteredTypes.length">
        <legend class="visually-hidden">
          Connection type
        </legend>
        <label
          class="connection-type"
          v-for="type in filteredTypes"
          :key="type.value"
          :data-testid="`connection-type-${type.value}`"
          @dblclick="submit"
        >
          <input
            type="radio"
            name="connection-type"
            :value="type.value"
            :tabindex="type.value === tabStopValue ? 0 : -1"
            v-model="value"
          >
          <database-icon :type="type.value" aria-hidden="true" />
          <span class="name">{{ type.name }}</span>
          <template v-if="type.lockedByLicense">
            <i
              class="material-icons ultimate-icon"
              title="Requires Ultimate"
              aria-hidden="true"
            >
              stars
            </i>
            <span class="visually-hidden">(requires Ultimate)</span>
          </template>
        </label>
      </fieldset>
      <output class="empty-state" v-else>
        No connection types match "{{ filter }}"
      </output>
    </template>

    <template #footer="{ close }">
      <div class="footer-wrapper">
        <upgrade-alert
          v-if="selectedType?.lockedByLicense"
          :feature-name="selectedType.name"
        />
        <div class="actions">
          <button class="btn btn-flat" type="button" @click.prevent="close">
            Cancel
          </button>
          <button
            class="btn btn-primary"
            type="submit"
            data-testid="connection-type-picker-next"
            :disabled="!value || selectedType?.lockedByLicense"
          >
            Next
          </button>
        </div>
      </div>
    </template>
  </base-modal>
</template>

<script lang="ts">
/**
 * How to use this component:

 * @example

 * const type = await this.$promptConnectionType();
 * if (!type) {
 *   log.info("User clicked cancel");
 * } else {
 *   log.info(`User selected ${type}`);
 * }
 */
import Vue from "vue";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import DatabaseIcon from "@/components/common/DatabaseIcon.vue";
import { AppEvent, RootBinding } from "@/common/AppEvent";
import { ConnectionType, ConnectionTypes } from "@/lib/db/types";
import { isUltimateType } from "@/common/interfaces/IConnection";
import UpgradeAlert from "@/components/upsell/UpgradeAlert.vue";
import { mapGetters } from "vuex";

type Type = (typeof ConnectionTypes)[number] & {
  isCommunity: boolean;
  lockedByLicense: boolean;
};

type OpenOptions = {
  onConfirm: (type: ConnectionType) => void;
  onCancel: () => void;
};

export default Vue.extend({
  components: { BaseModal, DatabaseIcon, UpgradeAlert },
  data() {
    return {
      modalName: "connection-type-picker-modal",
      filter: "",
      value: null as ConnectionType | null,
      openOptions: null as OpenOptions | null,
      confirmedValue: null as ConnectionType | null,
    };
  },
  computed: {
    ...mapGetters(["isCommunity"]),
    rootBindings(): RootBinding[] {
      return [
        { event: AppEvent.openConnectionTypePickerModal, handler: this.open },
      ];
    },
    types(): Type[] {
      return this.$config.defaults.connectionTypes
        .map((type) => ({
          ...type,
          isCommunity: !isUltimateType(type.value),
          lockedByLicense: this.isCommunity && isUltimateType(type.value),
        }))
        .sort((a, b) => Number(b.isCommunity) - Number(a.isCommunity));
    },
    filteredTypes(): Type[] {
      const filter = this.filter.trim().toLowerCase();
      return !filter
        ? this.types
        : this.types.filter((type) => type.name.toLowerCase().includes(filter));
    },
    tabStopValue(): ConnectionType | undefined {
      const selectedIsVisible = this.filteredTypes.some(
        (type) => type.value === this.value
      );
      return selectedIsVisible ? this.value : this.filteredTypes[0]?.value;
    },
    selectedType(): Type | undefined {
      return this.types.find((option) => option.value === this.value);
    },
  },
  methods: {
    open(options: OpenOptions) {
      this.filter = "";
      this.value = null;
      this.openOptions = options;
      this.$modal.show(this.modalName);
    },
    focusList() {
      if (!this.tabStopValue) {
        return;
      }
      this.value = this.tabStopValue;
      const list = this.$refs.list as HTMLElement | undefined;
      list?.querySelector<HTMLInputElement>('input[tabindex="0"]')?.focus();
    },
    handleSubmit(_event: Event, close: Function) {
      if (!this.selectedType) {
        return;
      }
      if (this.selectedType.lockedByLicense) {
        return;
      }
      this.confirmedValue = this.value;
      close();
    },
    handleClosed() {
      if (this.confirmedValue) {
        this.openOptions?.onConfirm(this.confirmedValue);
        this.confirmedValue = null;
      }
      this.openOptions = null;
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
  background: var(--panel-bg);
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

.filter-clear {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  padding: 0 0.4rem;
  border: none;
  background: transparent;
  cursor: pointer;

  .material-icons {
    font-size: 1rem;
    color: var(--text-muted);
  }
}

.toolbar,
.connection-types {
  margin-right: -0.5rem;
}

.connection-types {
  min-width: 0;
  margin-left: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding: 0;
  border: none;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.connection-type {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 1.8rem;
  line-height: 1.8rem;
  border-radius: 4px;

  .ultimate-icon {
    font-size: 1rem;
  }

  &:hover {
    background: var(--bg-hover-a);
  }

  &:has(input:checked) {
    background: var(--bg-a);
  }

  &:has(input:focus-visible) {
    outline: var(--focus-ring);
    outline-offset: -2px;
  }

  input[type="radio"] {
    position: absolute;
    opacity: 0;
  }

  ::v-deep .database-icon {
    display: inline-flex;
    justify-content: center;
    width: 1.25rem;
    font-weight: 700;
    font-size: 1.25rem;
    margin-right: 0.5rem;
    margin-left: 0.75rem;
  }
}

.footer-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--base-modal-footer-gap);
}
</style>
