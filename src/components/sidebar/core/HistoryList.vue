<template>
  <div class="sidebar-history flex-col expand">
    <div class="sidebar-list">
      <nav class="list-group" v-if="history.length > 0">
        <div class="list-item" :title="item.text" v-for="item in history" v-bind:key="item.id">
          <a class="list-item-btn" @click.prevent="click(item)">
            <i class="item-icon query material-icons">code</i>
            <!-- <input @click.stop="" type="checkbox" :value="item" class="form-control delete-checkbox" v-model="checkedHistoryQueries" v-bind:class="{ shown: checkedHistoryQueries.length > 0 }"> -->
            <div class="list-title flex-col">
              <span class="item-text expand truncate">{{nicelySized(item.text)}}</span>
              <span class="subtitle"><span>{{item.database}}</span></span>
            </div>
            <x-contextmenu>
              <x-menu style="--target-align: right; --v-target-align: top;">
                <x-menuitem @click="remove(item)">
                  <x-label class="text-danger">Remove</x-label>
                </x-menuitem>
              </x-menu>
            </x-contextmenu>
          </a>
        </div>
      </nav>
      <div class="empty" v-if="history.length === 0">
        <span>No Recent Queries</span>
      </div>
    </div>
    <!-- <div class="toolbar btn-group row flex-right" v-show="checkedHistoryQueries.length > 0">
      <a class="btn btn-link" @click="discardCheckedHistoryQueries">Cancel</a>
      <a class="btn btn-primary" :title="removeTitle" @click="removeCheckedHistoryQueries">Remove</a>
    </div> -->
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
