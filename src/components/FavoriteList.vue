<template>
  <nav class="list-group" v-if="favorites">
    <div class="list-group-item" v-for="item in favorites" v-bind:key="item.id">
      <a @click.prevent="click(item)">
        <span class="title">{{item.title}}</span>
        <span class="database">{{item.database}}</span>
      </a>
    </div>
  </nav>
</template>

<script>
  import { mapState } from 'vuex'
  export default {
    computed: {
      ...mapState(['favorites'])
    },
    methods: {
      click(item) {
        this.$root.$emit('favoriteClick', item)
      }
    }

  }
</script>