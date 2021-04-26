<template>
    <div class="global-items">
      <a
        href=""
        @click.prevent="click('tables')"
        class="nav-item"
        :class="{ active: activeItem === 'tables'}"
        title="Database"
      >
        <span class="bk-database"></span>
      </a>
      <a
        href=""
        @click.prevent="click('queries')"
        class="nav-item"
        :class="{ active: activeItem === 'queries'}"
        title="Run History"
      >
        <span class="material-icons">star</span>
      </a>
      <a
        href=""
        @click.prevent="click('history')"
        class="nav-item"
        :class="{ active: activeItem === 'history'}"
        title="Saved Queries"
      >
        <span class="material-icons">history</span>
      </a>
    </div>
</template>

<script>
  import { mapGetters } from 'vuex'

  export default {
    props: ['activeItem'],
    computed: {
      ...mapGetters({'runningExports': 'exports/runningExports'})
    },
    methods: {
      click(item) {
        if( this.activeItem === item ){
          this.$emit('toggleSidebar')
        } else {
          this.$emit('selected', item)
        }
      }
    }
  }
</script>
