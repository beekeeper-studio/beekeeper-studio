<template>
  <div class="sidebar-history">
    <nav class="list-group" v-if="history">
      <div class="list-item" v-for="item in history" v-bind:key="item.id">
        <a class="list-item-btn" @click.prevent="click(item)">
          <span class="item-text expand truncate">
            {{nicelySized(item.text)}}
          </span>
          <span class="badge"><span>{{item.database}}</span></span>
        </a>
      </div>
    </nav>
    <div class="empty" v-if="history.length == 0">
      <span>No Recent Queries</span>
    </div>
  </div>
</template>
<script>

  import { mapState } from 'vuex'

  export default {
    computed: {

      ...mapState(['history'])
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
      }
    }
  }

</script>
