<template>
  <div class="filter-container">
    <div class="select-wrap">
      <select
        name="Filter Field"
        class="form-control"
        v-model="filter.field"
      >
        <option
          v-for="column in columns"
          :key="column.columnName"
          :value="column.columnName"
        >
          {{ column.columnName }}
        </option>
      </select>
    </div>
    <div class="select-wrap">
      <select
        name="Filter Type"
        class="form-control"
        v-model="filter.type"
        @change="maybeClearValue()"
      >
        <option
          v-for="{ value, label } in filterTypes"
          :key="value"
          :value="value"
        >
          {{ label }}
        </option>
      </select>
    </div>
    <div class="expand filter">
      <div class="filter-wrap">
        <input
          class="form-control filter-value"
          :class="{ 'disabled-input': isNullFilter }"
          type="text"
          v-model="filter.value"
          @blur="$emit('blur')"
          :disabled="isNullFilter"
          :title="isNullFilter
            ? 'You cannot provide a comparison value when checking for NULL or NOT NULL'
            : ''"
          :placeholder="filter.type === 'in'
            ? 'Enter values separated by comma, eg: foo,bar'
            : 'Enter Value'"
          @contextmenu.stop.prevent="onContextMenu($event)"
        >
        <button
          v-if="!isNullFilter"
          type="button"
          class="clear btn-link"
          @click.prevent="$set(filter, 'value', '')"
        >
          <i class="material-icons">cancel</i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { TableFilterSymbols } from '@/lib/db/types';
import { getClipboardMenuOptions } from '@/lib/menu/clipboardMenuOptions.ts';

export default {
  props: ['filter', 'columns', 'index'],
  data() {
    return {
      filterTypes: TableFilterSymbols,
    };
  },
  computed: {
    isNullFilter() {
      const typeOptions = this.filterTypes.find(f => f.value === this.filter.type);
      return !!typeOptions.nullOnly;
    },
  },
  watch: {
    filter: {
      deep: true,
      handler() {
        this.$emit('changed', this.index, this.filter);
      },
    },
  },
  methods: {
    maybeClearValue() {
      if (this.isNullFilter) {
        this.$set(this.filter, 'value', null);
      }
    },
    onContextMenu(event) {
      event.preventDefault();
      const options = getClipboardMenuOptions(event, this.$native.clipboard);
      this.$bks.openMenu({
        options,
        event,
      });
    },
  },
};
</script>
