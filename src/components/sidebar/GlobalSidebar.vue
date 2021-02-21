<template>
    <div class="global-items">
      <a
        href=""
        @click.prevent="click('tables')"
        class="nav-item"
        :class="{ active: activeItem === 'tables'}"
        v-tooltip="tablesTooltip"
      >
        <span class="bk-database"></span>
      </a>
      <a
        href=""
        @click.prevent="click('queries')"
        class="nav-item"
        :class="{ active: activeItem === 'queries'}"
        v-tooltip="queriesTooltip"
      >
        <span class="material-icons">star</span>
      </a>
      <a
        href=""
        @click.prevent="click('history')"
        class="nav-item"
        :class="{ active: activeItem === 'history'}"
        v-tooltip="historyTooltip"
      >
        <span class="material-icons">history</span>
      </a>
      <a
        href=""
        @click.prevent="click('exports')"
        class="nav-item"
        :class="{ active: activeItem === 'exports', 'text-primary': runningExports.length}"
        v-tooltip="exportsTooltip"
      >
        <span class="material-icons">file_download</span>
      </a>
    </div>
</template>

<script>
  import { mapGetters } from 'vuex'

  export default {
    props: ['activeItem'],
    data() {
      return {
        tablesTooltip: {
          placement: 'right',
          content: "Database"
        },
        historyTooltip: {
          placement: 'right',
          content: 'Run History'
        },
        queriesTooltip: {
          placement: 'right',
          content: "Saved Queries"
        },
        exportsTooltip: {
          placement: 'right',
          content: "Exports"
        }
      }
    },
    computed: {
      ...mapGetters({'runningExports': 'exports/runningExports'})
    },
    methods: {
      click(item) {
        this.$emit('click', item)
      }
    }
  }

</script>
