<template>
  <div class="sidebar-favorites">
    <nav class="list-group" v-if="favorites">
      <div class="list-item" v-for="item in favorites" v-bind:key="item.id">
        <a class="list-item-btn" @click.prevent="click(item)">
          <span class="item-text title truncate">{{item.title}}</span>
          <span class="badge database">{{item.database}}</span>
        </a>
      </div>
    </nav>
    <div class="empty" v-if="favorites.length == 0">
      <span>No Saved Queries</span>
    </div>
  </div>
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
