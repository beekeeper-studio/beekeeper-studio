<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal"
      @before-open="onBeforeOpened"
      :name="modalName"
    >
      <form
        v-kbd-trap="true"
        @submit.prevent="onSubmit"
      >
        <div class="dialog-content filter-modal">
          <div class="dialog-c-title flex flex-middle">
            Choose Columns To Display
          </div>
          <a
            class="close-btn btn btn-fab"
            href="#"
            @click.prevent="closeModal"
          >
            <i class="material-icons">clear</i>
          </a>
          <div class="modal-form">
            <div class="search-wrapper">
              <input
                type="text"
                placeholder="Filter"
                v-model="searchQuery"
              >
              <span
                class="clear"
                @click="searchQuery = ''"
              >
                <i class="material-icons">cancel</i>
              </span>
            </div>
            <div class="list-wrapper">
              <div
                v-show="searchQuery.length === 0"
                class="list-item"
              >
                <label class="checkbox-group flex-between expand">
                  <span class="input-wrapper">
                    <input
                      type="checkbox"
                      ref="mainCheckbox"
                      @click.stop="toggleSelectAllColumn"
                      :checked="allSelected"
                    >
                    All

                  </span>
                </label>
                <!-- <span @click.prevent="toggleSelectAllColumn"
                  class="inline-flex flex-between expand all-label"
                >
                  All
                </span> -->
              </div>
              <div class="list-container">
                <div
                  v-for="column in searchedColumns"
                  :key="column.name"
                  class="list-item"
                >
                  <label class="checkbox-group flex-between expand">
                    <span class="input-wrapper">
                      <input
                        type="checkbox"
                        @click.stop="toggleSelectColumn(column)"
                        :checked="column.filter"
                      >
                      {{ column.name }}

                    </span>
                    <span class="datatype ">{{ column.dataType }}</span>

                  </label>
                </div>
              </div>
              <div
                class="no-matching-results"
                v-show="searchedColumns.length === 0"
              >
                No matching results
              </div>
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
          <x-button
            class="btn btn-primary btn-icon"
            @click.prevent="onSubmit"
            v-tooltip="hasPendingChanges && anyChanges ? 'Heads up: This will discard pending data changes' : null"
            :disabled="noneSelected"
          >
            <i
              v-if="hasPendingChanges && anyChanges"
              class="material-icons"
            >error_outline</i>
            <span> Apply</span>
          </x-button>
        </div>
      </form>
    </modal>
  </portal>
</template>

<style lang="scss">

</style>

<script lang="ts">
  import _ from 'lodash'

  export default {
    props: ['modalName', 'columnsWithFilterAndOrder', 'hasPendingChanges'],
    data() {
      return {
        searchQuery: '',
        columns: [],
      }
    },
    computed: {
      anyChanges() {
        return !_.isEqual(this.columns, this.columnsWithFilterAndOrder)
      },
      allSelected() {
        return this.columns.every((column) => column.filter)
      },
      noneSelected() {
        return this.columns.every((column) => !column.filter)
      },
      searchedColumns() {
        return this.columns.filter(({name}) => name.toLowerCase().includes(this.searchQuery))
      },
    },
    methods: {
      toggleSelectColumn(column) {
        column.filter = !column.filter
      },
      toggleSelectAllColumn() {
        const mustSelect = !this.allSelected
        this.columns.forEach((column) => column.filter = mustSelect)
      },
      onBeforeOpened() {
        this.columns = _.cloneDeep(this.columnsWithFilterAndOrder)
      },
      onSubmit() {
        const changed = !_.isEqual(this.columns, this.columnsWithFilterAndOrder)
        this.closeModal();
        setTimeout(() => {
          if(changed) this.$emit('changed', this.columns)
        }, 200)
      },
      closeModal() {
        this.$modal.hide(this.modalName)
      },
    },
  }
</script>
