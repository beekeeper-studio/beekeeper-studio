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
    </div>
</template>

<script>
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
        }
      }
    },
    methods: {
      click(item) {
        this.$emit('click', item)
      }
    }
  }

</script>
