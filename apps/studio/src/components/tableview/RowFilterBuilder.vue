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
        <div class="btn-wrap" v-if="canBuilderFilter">
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
              @blur="updateMinimalModeByFilterRaw"
              ref="valueInput"
              :placeholder="dialectData?.rawFilterPlaceholder || `Enter condition, eg: name like 'Matthew%'`"
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
            v-if="!minimalMode"
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
          <div class="btn-wrap" v-if="canRawFilter">
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
              :disabled="dialectData.disabledFeatures && dialectData.disabledFeatures.filterWithOR"
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
          <!-- <div
            v-for="(filter, index) in filters"
            :key="index"
            class="filter-container"
          >

          </div> -->
          <builder-filter
            v-for="(filter, index) in filters"
            :key="index"
            :filter="filter"
            :index="index"
            :columns="columns"
            @changed="singleFilterChanged"
            @blur="updateMinimalModeByFilters"
          />
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
            <div
              v-if="!minimalMode"
              class="row fixed"
            >
              <button
                v-if="filters.length > 1"
                class="btn btn-flat btn-fab remove-filter"
                type="button"
                title="Remove filter"
                @click="removeFilter(-1)"
              >
                <i class="material-icons">remove</i>
              </button>
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
import { joinFilters, normalizeFilters, createTableFilter, checkEmptyFilters } from "@/common/utils";
import { mapGetters, mapState } from "vuex";
import { AppEvent } from "@/common/AppEvent";
import _ from 'lodash';
import BuilderFilter from "./filter/BuilderFilter.vue";

const BUILDER = "builder";
const RAW = "raw";

export default Vue.extend({
  components: { BuilderFilter },
  props: ["columns", "reactiveFilters"],
  data() {
    return {
      hideInMinimalMode: true,
      filters: this.reactiveFilters,
      filterRaw: "",
      filterMode: BUILDER, // Will be changed in mounted()
      submittedWithEmptyValue: false,
      RAW,
      BUILDER,
    };
  },
  computed: {
    ...mapGetters(["dialectData", "minimalMode"]),
    ...mapGetters({
      isCommunity: "licenses/isCommunity",
    }),
    ...mapState(['connection']),
    additionalFilters() {
      const [_, ...additional] = this.filters;
      return additional;
    },
    keymap() {
      return this.$vHotkeyKeymap({
        'tableTable.focusOnFilterInput': this.focusOnInput,
      });
    },
    externalFilters() {
      return this.reactiveFilters;
    },
    canRawFilter() {
      return !this.dialectData?.disabledFeatures?.rawFilters;
    },
    canBuilderFilter() {
      return !this.dialectData?.disabledFeatures?.builderFilters;
    }
  },
  methods: {
    singleFilterChanged(index, filter) {
      const updated = [...this.filters]
      updated[index] = filter
      this.filters = updated
    },

    focusOnInput() {
      if (this.filterMode === RAW) this.$refs.valueInput.focus();
      else this.$refs.multipleFilters.querySelector('.filter-value')?.focus();
    },
    async toggleFilterMode() {
      const filters: TableFilter[] = normalizeFilters(this.filters);
      const filterMode = this.filterMode === BUILDER ? RAW : BUILDER;

      // Populate raw filter query with existing filter if raw filter is empty
      if (filterMode === RAW && filters.length && !this.filterRaw) {
        const allFilters = []
        for (const filter of filters) {
          allFilters.push(await this.connection.getQueryForFilter(filter))
        }
        const filterString = joinFilters(allFilters, filters);
        this.filterRaw = filterString;
      }

      this.filterMode = filterMode;
      this.$nextTick(this.focusOnInput);
    },
    addFilter() {
      if (this.isCommunity) {
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
    clearFilter() {
      this.filters = [createTableFilter(this.filters[0].field)]
    },
    submit() {
      let filters: TableFilter[] | string | null
      if (this.filterMode === RAW) {
        filters = this.filterRaw || null
      } else {
        filters = normalizeFilters(this.filters)
        this.submittedWithEmptyValue = checkEmptyFilters(filters)
      }
      this.$emit("submit", filters);
    },
    updateMinimalModeByFilters() {
      this.hideInMinimalMode = checkEmptyFilters(this.filters)
    },
    updateMinimalModeByFilterRaw() {
      this.hideInMinimalMode = this.filterRaw === ''
    },
  },
  watch: {
    filters: {
      deep: true,
      handler(filters: TableFilter[]) {
        this.$emit("input", filters);

        const inputs = _.isArray(this.$refs.filterInputs) ? this.$refs.filterInputs : [this.$refs.filterInputs]
        const focusIsOnInput = inputs.some((input: HTMLInputElement) => document.activeElement.isSameNode(input))
        if (!focusIsOnInput) {
          this.updateMinimalModeByFilters()
        }

        // Submit when it's only one filter and it's empty
        if (
          filters.length === 1 &&
          filters[0].value === "" &&
          !this.submittedWithEmptyValue
        ) {
          this.submit();
        }
      },
    },
    filterMode() {
      this.submit();
    },
    externalFilters() {
      this.hideInMinimalMode = checkEmptyFilters(this.externalFilters)
      if (this.isCommunity) {
        this.filters = this.externalFilters?.slice(0, 2) || [];
      } else {
        this.filters = this.externalFilters || [];
      }
      this.submittedWithEmptyValue = false
    },
  },
  mounted() {
    // Set initial filter mode based on disabled features
    if (this.dialectData?.disabledFeatures?.builderFilters) {
      this.filterMode = RAW;
    }
  },
});
</script>
