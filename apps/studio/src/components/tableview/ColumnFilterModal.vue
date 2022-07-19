<template>
  <modal
    class="vue-dialog beekeeper-modal export-modal"
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
        <div class="flex flex-middle" style="gap: 0.5rem">
          <input type="checkbox" ref="mainCheckbox" @click="toggleSelectAllColumn()"/>
          <input type="text" placeholder="Search column" v-model="searchQuery" @click.stop/>
        </div>
        <div style="margin-top: 0.5rem; height: 12.75rem; overflow-y: scroll;">
          <div
            v-for="{columnName, dataType} in searchFilteredColumns"
            :key="columnName"
            class="flex flex-middle"
            style="padding: 0.25rem 0"
          >
            <input type="checkbox" @click.stop="toggleSelectColumn(columnName)" :checked="selectedColumnNames.includes(columnName)" />
            <span>
              {{columnName}}&nbsp;<span style="opacity: 0.5">{{dataType}}</span>
            </span>
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