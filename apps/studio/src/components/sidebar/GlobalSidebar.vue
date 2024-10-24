<template>
  <div class="global-items">
    <a
      href=""
      @click.prevent="click('tables')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'tables'}"
      title="Database"
    >
      <span class="bk-database" />
    </a>
    <a
      href=""
      @click.prevent="click('queries')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'queries'}"
      title="Saved Queries"
    >
      <span class="material-icons">code</span>
    </a>
    <a
      href=""
      @click.prevent="click('history')"
      class="nav-item selectable"
      :class="{ active: activeItem === 'history'}"
      title="Run History"
    >
      <span class="material-icons">history</span>
    </a>
    <span class="expand" />
    <core-account-button v-if="$store.state.workspaceId > 0" />
  </div>
</template>

<script>
  import CoreAccountButton from './core/CoreAccountButton.vue'
  export default {
    props: ['activeItem'],
    components: { CoreAccountButton },
    computed: {
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
