<template>
  <div class="tables-pane">
    <!-- Filter -->
    <div class="fixed">
      <div class="filter">
        <div class="filter-wrap">
          <input type="text" placeholder="Filter" v-model="filterQuery">
          <!-- TODO (matthew): clear icon needs to hide when input has no value also. ie. Type then delete characters and still shows currently -->
          <i class="clear material-icons" @click="clearFilter" v-if="filterQuery">cancel</i>
        </div>
      </div>
    </div>
    <!-- Different Lists -->
    <div class="split">
      <pinned-list ref="pinned"></pinned-list>
      <table-list ref="tables"></table-list>
      <!-- TODO - Build these lists -->
      <function-list ref="functions"></function-list>
    </div>
  </div>
</template>
<script>
import Split from 'split.js'
import TableList from './TableList'
import PinnedList from './PinnedList'
import FunctionList from './FunctionList'

export default {
  components: {
    TableList, PinnedList, FunctionList
  },
  data() {
    return {
      split: null,
      splitComponents: [
        this.$refs.pinned,
        this.$refs.tables,
        this.$refs.functions,
      ],
      sizes: [25,50,25]
    }
  },
  methods: {
    updateSplits() {
      this.$nextTick(() => {
      })
    }
  },
  mounted() {
    this.split = Split(this.splitComponents, {
      elementStyle: (dimension, size) => ({
        'flex-basis': `calc(${size}%)`
      }),
      direction: 'vertical',
      sizes: this.sizes
    })
  }
}
</script>