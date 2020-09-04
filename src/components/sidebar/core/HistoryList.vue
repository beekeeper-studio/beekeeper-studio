<template>
  <div class="sidebar-history">
    <nav class="list-group" v-if="history.length > 0">
      <div class="list-item" v-for="item in history" v-bind:key="item.id">
        <a class="list-item-btn" @click.prevent="click(item)">
          <input @click.stop="" type="checkbox" :value="item" class="form-control delete-checkbox" v-model="checkedHistoryQueries" v-bind:class="{ shown: checkedHistoryQueries.length > 0 }">
          <div class="list-title flex-col">
            <span class="item-text expand truncate">{{nicelySized(item.text)}}</span>
            <span class="subtitle"><span>{{item.database}}</span></span>
          </div>
          <x-button class="btn-fab" skin="iconic">
            <i class="material-icons">more_horiz</i>
            <x-menu style="--target-align: right; --v-target-align: top;">
              <x-menuitem @click="remove(item)">
                <x-label class="text-danger">Remove</x-label>
              </x-menuitem>
            </x-menu>
          </x-button>
        </a>
      </div>
      <div class="toolbar" v-show="checkedHistoryQueries.length > 0">
        <div class="flex flex-right">
          <a class="btn btn-link" @click="discardCheckedHistoryQueries">Discard</a>
          <a :title="removeTitle" class="btn btn-primary" @click="removeCheckedHistoryQueries">Remove</a>
        </div>
      </div>
    </nav>
    <div class="empty" v-if="history.length === 0">
      <span>No Recent Queries</span>
    </div>
  </div>
</template>

<script>
  import { mapState } from 'vuex'

  export default {
    data: function () {
      return {
        checkedHistoryQueries: []
      }
    },
    computed: {
      ...mapState(['history']),
      removeTitle() {
        return `Remove ${this.checkedHistoryQueries.length} saved history queries`;
      }
    },
    methods: {
      click(item) {
        this.$root.$emit("historyClick", item)
      },
      nicelySized(text) {
        if (text.length >= 128) {
          return `${text.substring(0, 128)}...`
        } else {
          return text
        }
      },
      async remove(historyQuery) {
        await this.$store.dispatch('removeHistoryQuery', historyQuery)
      },
      async removeCheckedHistoryQueries() {
        for(let i = 0; i < this.checkedHistoryQueries.length; i++) {
          await this.remove(this.checkedHistoryQueries[i])
        }
        this.checkedHistoryQueries = [];
      },
      discardCheckedHistoryQueries() {
        this.checkedHistoryQueries = [];
      }
    },
  }
</script>
