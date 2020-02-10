<template>
  <div>
    <nav class="list-group flex-col expand" v-if="history">
      <div class="list-group-item" v-for="item in history" v-bind:key="item.id">
        <span class="query-text-truncated">
          {{item.text}}
        </span>
        <span class="badge">{{item.database}}</span>
      </div>
    </nav>
  </div>
</template>
<script>

  import { mapState } from 'vuex'

  export default {
    computed: {

      ...mapState(['history'])
    },
    mounted() {
      this.$store.dispatch('updateHistory')
    }
  }

</script>