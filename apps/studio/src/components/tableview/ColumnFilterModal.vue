<template>
  <modal
    class="vue-dialog beekeeper-modal"
    @before-open="onBeforeOpened"
    :name="modalName"
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
          <div class="search-wrapper">
            <input type="text" placeholder="Search column" v-model="searchQuery"/>
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
              <input
                type="checkbox"
                ref="mainCheckbox"
                @click="toggleSelectAllColumn()"
                :checked="allSelected"
              />
              <span
                class="inline-flex flex-between expand all-label"
              >
                All
              </span>
            </div>
            <div class="list-container">
              <div
                v-for="column in searchedColumns"
                :key="column.name"
                class="list-item"
              >
                <input type="checkbox" @click.stop="toggleSelectColumn(column)" :checked="column.filter" />
                <span class="inline-flex flex-between expand">
                  <span>{{column.name}}</span>
                  <span style="opacity: 0.5">{{column.dataType}}</span>
                </span>
              </div>
            </div>
            <span class="no-matching-results" v-show="searchedColumns.length === 0">No matching results</span>
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

<style lang="scss">
  .modal-form {
    margin-top: 0.25rem;
  }

  .search-wrapper {
    position: relative;

    input {
      padding-right: 26px !important;
    }

    .clear {
      position: absolute;
      right: 0;
      top: 56%;
      transform: translate(0, -50%);
      opacity: 0.5;
      outline: none;
      border: 0;
      padding: 0;
      cursor: pointer;

      i {
        font-size: 16px;
        width: 26px;
      }
    }
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
    display: flex;
    align-items: center;
    padding: 0.5rem 0;
  }

  .all-label {
    font-style: italic
  }

  .no-matching-results, .all-label {
    opacity: 0.5;
  }
</style>

<script lang="ts">
  import _ from 'lodash'

  export default {
    props: ['modalName', 'columnsWithFilterAndOrder'],
    data() {
      return {
        searchQuery: '',
        columns: [],
      }
    },
    computed: {
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
        if(changed) this.$emit('changed', this.columns)
        this.closeModal()
      },
      closeModal() {
        this.$modal.hide(this.modalName)
      },
    },
  }
</script>