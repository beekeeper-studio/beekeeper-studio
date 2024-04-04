<template>
  <div
    v-hotkey="keymap"
    class="table-filter"
  >
    <form
      @submit.prevent="submit"
      @scroll="
        $event.target.classList.toggle(
          'filter-outside-viewport',
          $event.target.scrollTop > 31
        )
      "
      ref="filterGroupWrapper"
    >
      <div
        v-if="filterMode === RAW"
        class="filter-group row gutter expand"
      >
        <div class="btn-wrap">
          <button
            class="btn btn-flat btn-fab"
            type="button"
            @click.stop="toggleFilterMode"
            title="Toggle Filter Type"
          >
            <i class="material-icons-outlined">filter_alt</i>
          </button>
        </div>
        <div class="expand filter filter-container">
          <div class="filter-wrap">
            <input
              class="form-control"
              type="text"
              v-model="filterRaw"
              ref="valueInput"
              placeholder="Enter condition, eg: name like 'Matthew%'"
            >
            <button
              type="button"
              class="clear btn-link"
              @click.prevent="filterRaw = ''"
            >
              <i class="material-icons">cancel</i>
            </button>
          </div>
        </div>
        <div class="btn-wrap">
          <button
            class="btn btn-primary btn-fab"
            type="submit"
            title="Filter"
          >
            <i class="material-icons">search</i>
          </button>
        </div>
      </div>
      <div
        v-else-if="filterMode === BUILDER"
        class="filter-group row gutter expand"
      >
        <div class="left-section">
          <div class="btn-wrap">
            <button
              class="btn btn-flat btn-fab"
              type="button"
              @click.stop="toggleFilterMode"
              title="Toggle Filter Type"
            >
              <i class="material-icons">code</i>
            </button>
          </div>
          <div
            class="btn-wrap"
            v-for="(filter, index) in additionalFilters"
            :key="index"
          >
            <button
              class="btn btn-flat btn-fab op-filter"
              type="button"
              :disabled="dialectData.disabledFeatures?.filterWithOR"
              @click.stop="filter.op = filter.op === 'AND' ? 'OR' : 'AND'"
              title="Toggle Filter AND / OR"
            >
              {{ filter.op }}
            </button>
          </div>
        </div>
        <div
          class="middle-section multiple-filter"
          ref="multipleFilters"
        >
          <div
            v-for="(filter, index) in filters"
            :key="index"
            class="filter-container"
          >
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
                @change="clearInput(filter)"
              >
                <option
                  v-for="(v, k) in filterTypes"
                  :key="k"
                  :value="v"
                >
                  {{ k }}
                </option>
              </select>
            </div>
            <div class="expand filter"
              v-tooltip="isNullFilter(filter) ? 
                'You cannot provide a comparison value when checking for NULL or NOT NULL' : 
                ''"
              >
              <div class="filter-wrap">
                <input
                  class="form-control filter-value"
                  type="text"
                  v-model="filter.value"
                  :disabled="isNullFilter(filter)"
                  :placeholder="
                    filter.type === 'in'
                      ? `Enter values separated by comma, eg: foo,bar`
                      : 'Enter Value'
                  "
                >
                <button
                  type="button"
                  class="clear btn-link"
                  @click.prevent="filter.value = ''"
                >
                  <i class="material-icons">cancel</i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="right-section">
          <div class="ghost-add-apply">
            <div class="btn-wrap">
              <button class="btn btn-flat btn-fab">
                <i class="material-icons">add</i>
              </button>
            </div>
            <div class="btn-wrap">
              <button class="btn btn-primary btn-fab">
                <i class="material-icons">search</i>
              </button>
            </div>
          </div>
          <div class="filter-add-apply">
            <div class="row fixed">
              <div class="btn-wrap add-filter">
                <button
                  class="btn btn-flat btn-fab"
                  type="button"
                  title="Add filter"
                  @click="addFilter"
                >
                  <i class="material-icons">add</i>
                </button>
              </div>
              <div
                class="btn-wrap"
                ref="filterButtonWrapper"
              >
                <button
                  class="btn btn-primary btn-fab"
                  type="submit"
                  title="Apply filter"
                >
                  <i class="material-icons">search</i>
                </button>
              </div>
            </div>
          </div>
          <div
            class="btn-wrap"
            v-for="(filter, index) in additionalFilters"
            :key="index"
          >
            <button
              class="btn btn-flat btn-fab remove-filter"
              type="button"
              title="Remove filter"
              @click="removeFilter(index)"
            >
              <i class="material-icons">remove</i>
            </button>
          </div>
        </div>
      </div>
    </form>
    <div class="filter-drag-icon">
      <i class="material-icons">drag_handle</i>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { TableFilter } from "@/lib/db/models";
import { joinFilters, normalizeFilters } from "@/common/utils";
import { mapGetters, mapState } from "vuex";
import platformInfo from "@/common/platform_info";
import { AppEvent } from "@/common/AppEvent";

const BUILDER = "builder";
const RAW = "raw";

export default Vue.extend({
  props: ["columns", "reactiveFilters"],
  data() {
    return {
      filterTypes: {
        equals: "=",
        "does not equal": "!=",
        like: "like",
        "less than": "<",
        "less than or equal": "<=",
        "greater than": ">",
        "greater than or equal": ">=",
        in: "in",
        // TODO (@day): check which databases don't support these
        "is null": "is",
        "is not null": "is not"
      },
      filters: this.reactiveFilters,
      filterRaw: "",
      filterMode: BUILDER,
      RAW,
      BUILDER,
    };
  },
  computed: {
    ...mapGetters(["dialectData"]),
    ...mapState(['connection']),
    additionalFilters() {
      const [_, ...additional] = this.filters;
      return additional;
    },
    keymap() {
      return {
        [this.ctrlOrCmd('f')]: this.focusOnInput,
      }
    },
    externalFilters() {
      return this.reactiveFilters;
    },
  },
  methods: {
    clearInput(filter: any) {
      if (filter.type.includes('is')) {
        filter.value = null
      }
    },
    isNullFilter(filter) {
      return filter.type.includes('is')
    },
    focusOnInput() {
      if (this.filterMode === RAW) this.$refs.valueInput.focus();
      else this.$refs.multipleFilters.querySelector('.filter-value')?.focus();
    },
    toggleFilterMode() {
      const filters: TableFilter[] = normalizeFilters(this.filters);
      const filterMode = this.filterMode === BUILDER ? RAW : BUILDER;

      // Populate raw filter query with existing filter if raw filter is empty
      if (filterMode === RAW && filters.length && !this.filterRaw) {
        const allFilters = filters.map((filter) => {
          let where;
          if (filter.type == 'is') {
            where = this.connectection.knex
              .whereNull(filter.field);
          } else if (filter.type == 'is not') {
            where = this.connectection.knex
              .whereNotNull(filter.field);
          } else {
            where = this.connection.knex
              .where(filter.field, filter.type, filter.value);
          }
          return where.toString()
            .split("where")[1]
            .trim();
        });
        const filterString = joinFilters(allFilters, filters);
        this.filterRaw = filterString;
      }

      this.filterMode = filterMode;
      this.$nextTick(this.focusOnInput);
    },
    addFilter() {
      if (platformInfo.isCommunity) {
        if (this.filters.length >= 2) {
          this.$root.$emit(AppEvent.upgradeModal, "Upgrade required to use more than 2 filters")
          return;
        }
      }
      const lastFilter = this.filters[this.filters.length - 1];
      const cloned = _.clone(lastFilter)
      if (!cloned.op) cloned.op = "AND"
      this.filters.push(cloned);
      this.$nextTick(() => {
        const filters = this.$refs.multipleFilters.children;
        filters[filters.length - 1].scrollIntoView();
      });
    },
    removeFilter(shiftedIdx: number) {
      this.filters.splice(shiftedIdx + 1, 1);
    },
    submit() {
      this.$emit(
        "submit",
        this.filterMode === RAW
          ? this.filterRaw || null
          : normalizeFilters(this.filters)
      );
    },
  },
  watch: {
    filters: {
      deep: true,
      handler(nextFilters: TableFilter[], oldFilters: TableFilter[]) {
        this.$emit("input", nextFilters);
        // Submit when it's only one filter and it's empty
        if (
          nextFilters.length === 1 &&
          oldFilters[0].value !== "" &&
          nextFilters[0].value === ""
        ) {
          this.submit();
        }
      },
    },
    filterMode() {
      this.submit();
    },
    filterRaw() {
      if (this.filterRaw === "") this.submit();
    },
    externalFilters() {
      if (platformInfo.isCommunity) {
        this.filters = this.externalFilters?.slice(0, 2) || [];
      } else {
        this.filters = this.externalFilters || [];
      }
    },
  },
});
</script>
