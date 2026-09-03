<template>
  <base-modal
    :name="modalName"
    height="32rem"
    @submit="handleSubmit"
    @closed="handleClosed"
  >
    <template #title>Select Connection Type</template>

    <template #default="{ submit }">
      <div class="toolbar">
        <div class="filter-wrap">
          <input
            class="filter-input"
            type="text"
            placeholder="Search connection types"
            v-model="filter"
          />
          <x-buttons class="filter-actions">
            <x-button v-if="filter" @click="filter = ''">
              <i class="clear material-icons">cancel</i>
            </x-button>
          </x-buttons>
        </div>
      </div>

      <div class="connection-types" v-if="filteredTypes.length">
        <label
          class="connection-type"
          :class="{ selected: value === type.value }"
          v-for="type in filteredTypes"
          :key="type.value"
          @dblclick="submit"
        >
          <input
            type="radio"
            name="connection-type"
            :value="type.value"
            v-model="value"
          />
          <database-icon :type="type.value" />
          <span class="name">{{ type.name }}</span>
          <i v-if="type.lockedByLicense" class="material-icons ultimate-icon">
            stars
          </i>
        </label>
      </div>
      <div class="empty-state" v-else>
        No connection types match "{{ filter }}"
      </div>
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
 *   console.log("User clicked cancel");
 * } else {
 *   console.log(`User selected ${type}`);
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
      console.log("this is community: ", this.isCommunity);
      return this.$config.defaults.connectionTypes.map((type) => ({
        ...type,
        lockedByLicense: this.isCommunity && isUltimateType(type.value),
      }));
    },
    filteredTypes(): Type[] {
      const filter = this.filter.trim().toLowerCase();
      return !filter
        ? this.types
        : this.types.filter((type) => type.name.toLowerCase().includes(filter));
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
      console.log(this.types);
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

  .ultimate-icon {
    font-size: 1rem;
  }

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
