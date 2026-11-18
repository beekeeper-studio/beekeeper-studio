<template>
  <div class="filter-container">
    <v-select
      v-model="filter.field"
      :options="columnNames"
      :clearable="false"
      :title="filter.field"
      class="select-wrap dropdown-search filter-column-select"
    >
      <template #search="{ attributes, events }">
        <input
          v-bind="attributes"
          v-on="events"
          class="vs__search"
          :aria-labelledby="null"
          aria-label="Filter column"
        >
      </template>
    </v-select>
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
          ref="filterInputs"
          v-model="filter.value"
          @blur="$emit('blur')"
          :disabled="isNullFilter"
          :title="isNullFilter ?
            'You cannot provide a comparison value when checking for NULL or NOT NULL' :
            ''"
          :placeholder="
            isListInput
              ? `Enter values separated by comma, eg: foo,bar`
              : 'Enter Value'
          "
        >
        <button
          v-if="!isNullFilter"
          type="button"
          class="clear"
          @click.prevent="$set(filter, 'value', '')"
        >
          <i class="material-icons">cancel</i>
        </button>
      </div>
    </div>
  </div>
</template>
<script lang="js">
import { TableFilterSymbols } from '@/lib/db/types';
import { isListFilter } from '@/common/utils';
import {mapState} from 'vuex'
import vSelect from 'vue-select'

export default {
  components: { vSelect },
  props: ['filter', 'columns', 'index'],
  data: () => ({}),
  watch: {
    filter: {
      deep: true,
      handler() {
        this.$emit('changed', this.index, this.filter)
      }
    }
  },
  computed: {
    ...mapState(['supportedFeatures']),
    columnNames() {
      return this.columns.map(column => column.columnName)
    },
    filterTypes() {
      const filterTypes = this.supportedFeatures.filterTypes ?? ['standard']
      
      return TableFilterSymbols.filter(tf => filterTypes.includes(tf.type))
    },
    isListInput() {
      return isListFilter(this.filter.type)
    },
    isNullFilter() {
      const typeOptions = this.filterTypes.find((f) => f.value === this.filter.type)
      return !!typeOptions.nullOnly
    }
  },
  methods: {
    maybeClearValue() {
      if (this.isNullFilter) {
        this.$set(this.filter, 'value', null)
      }
    },
  }
}

</script>
