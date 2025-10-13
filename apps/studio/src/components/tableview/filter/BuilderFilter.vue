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
        :value="filter.type"
        @change="$emit('changed', index, {
          ...filter,
          type: $event.target.value,
        })"
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
        <BaseInput
          class="form-control filter-value"
          :class="{ 'disabled-input': isNullFilter }"
          type="text"
          ref="filterInputs"
          :value="filter.value"
          @input="$emit('changed', index, {
            ...filter,
            value: $event,
          })"
          @blur="$emit('blur')"
          :disabled="isNullFilter"
          :title="isNullFilter ?
            'You cannot provide a comparison value when checking for NULL or NOT NULL' :
            ''"
          :placeholder="
            filter.type === 'in'
              ? `Enter values separated by comma, eg: foo,bar`
              : 'Enter Value'
          "
        />
        <button
          v-if="!isNullFilter"
          type="button"
          class="clear btn-link"
          @click.prevent="$emit('changed', index, {
            ...filter,
            value: '',
          })"
        >
          <i class="material-icons">cancel</i>
        </button>
      </div>
    </div>
  </div>

</template>
<script lang="js">
import { TableFilterSymbols } from '@/lib/db/types';
import BaseInput from '@/components/common/form/BaseInput.vue';

export default {
  components: { BaseInput },
  props: ['filter', 'columns', 'index'],
  data: () => ({
    filterTypes: TableFilterSymbols
  }),
  computed: {
    isNullFilter() {
      const typeOptions = this.filterTypes.find((f) => f.value === this.filter.type)
      return !!typeOptions.nullOnly
    }
  },
  watch: {
    isNullFilter() {
      if (this.isNullFilter) {
        this.$emit('changed', this.index, {
          ...this.filter,
          value: '',
        })
      }
    },
  }
}

</script>
