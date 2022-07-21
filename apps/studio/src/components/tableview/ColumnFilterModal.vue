<template>
  <modal
    class="vue-dialog beekeeper-modal"
    name="column-filter-modal"
    @before-open="onBeforeOpen"
    @opened="onOpened"
    @closed="onClosed"
  >
    <form @submit.prevent="onSubmit">
      <div class="dialog-content">
        <div class="dialog-c-title flex flex-middle">
          Filter Columns
        </div>
        <span class="close-btn btn btn-fab">
          <i class="material-icons" @click.prevent="closeModal">clear</i>
        </span>
        <div class="modal-form">
          <input type="text" placeholder="Search column" v-model="searchQuery"/>
          <div class="list-wrapper">
            <div
              v-show="searchQuery.length === 0"
              class="flex flex-middle list-item basis-0"
            >
              <input type="checkbox" ref="mainCheckbox" @click="toggleSelectAllColumn()" />
              <span
                class="inline-flex flex-between expand all-label"
              >
                All
              </span>
            </div>
            <div class="list-container">
              <div
                v-for="{columnName, dataType} in searchFilteredColumns"
                :key="columnName"
                class="flex flex-middle list-item"
              >
                <input type="checkbox" @click.stop="toggleSelectColumn(columnName)" :checked="selectedColumnNames.includes(columnName)" />
                <span class="inline-flex flex-between expand">
                  <span>{{columnName}}</span>
                  <span style="opacity: 0.5">{{dataType}}</span>
                </span>
              </div>
            </div>
            <span class="no-matching-results" v-show="searchFilteredColumns.length === 0">No matching results</span>
          </div>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="closeModal"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary"
          type="submit"
          :disabled="noneSelected"
        >
          Apply
        </button>
      </div>
    </form>
  </modal>
</template>

<style>
  .modal-form {
    margin-top: 0.25rem;
  }

  .list-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 14.5rem;
    margin-top: 0.5rem;
    font-size: 13px;
  }

  .list-container {
    flex-grow: 0;
    overflow-y: scroll;
    padding-right: 0.5rem;
  }

  .no-matching-results {
    position: absolute;
    left: 0;
    right: 0;
    top: 1rem;
    text-align: center;
  }

  .list-item {
    padding: 0.5rem 0;
  }

  .basis-0 {
    flex-basis: 0;
  }

  .all-label {
    font-style: italic
  }

  .no-matching-results, .all-label {
    opacity: 0.5;
  }
</style>

<script lang="ts">
  export default {
    data() {
      return {
        searchQuery: '',
        allColumns: [],
        selectedColumnNames: [],
        applyHandler: () => {},
      }
    },
    computed: {
      allSelected() {
        return this.selectedColumnNames.length === this.allColumns.length
      },
      someSelected() {
        return this.selectedColumnNames?.length > 0 && this.selectedColumnNames?.length < this.allColumns.length
      },
      noneSelected() {
        return this.selectedColumnNames.length === 0
      },
      searchFilteredColumns() {
        return this.allColumns.filter(
          ({columnName}) => columnName.toLowerCase().includes(this.searchQuery)
        )
      },
    },
    methods: {
      toggleSelectColumn(name) {
        if(this.selectedColumnNames.includes(name)) {
          this.selectedColumnNames = this.selectedColumnNames.filter(columnName => columnName !== name)
        } else {
          this.selectedColumnNames.push(name)
        }
        this.handleMainCheckbox()
      },
      toggleSelectAllColumn() {
        this.selectedColumnNames = this.allSelected ? [] : this.allColumns.map(({columnName}) => columnName)
        this.handleMainCheckbox()
      },
      handleMainCheckbox() {
        this.$refs.mainCheckbox.checked = this.allSelected
        this.$refs.mainCheckbox.indeterminate = this.someSelected
      },
      closeModal() {
        this.$modal.hide('column-filter-modal')
      },
      onBeforeOpen(event) {
        this.allColumns = event.params.allColumns
        this.selectedColumnNames = event.params.selectedColumnNames
        this.applyHandler = event.params.onApply
      },
      onOpened() {
        this.handleMainCheckbox()
      },
      onSubmit() {
        this.applyHandler(this.selectedColumnNames)
        this.closeModal()
      },
      onClosed() {
        this.allColumns = []
        this.selectedColumnNames = []
        this.applyHandler = () => {}
      },
    },
  }
</script>