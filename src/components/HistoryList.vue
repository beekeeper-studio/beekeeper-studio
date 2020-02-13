<template>
  <nav class="list-group" v-if="history">
    <div class="list-group-item" v-for="item in history" v-bind:key="item.id">
      <a @click.prevent="click(item)">
        <span class="query-text expand truncate">
          {{nicelySized(item.text)}}
        </span>
        <span class="badge">{{item.database}}</span>
      </a>
    </div>
  </nav>
</template>
<script>

  import { mapState } from 'vuex'

  export default {
    computed: {

      ...mapState(['history'])
    },
    mounted() {
      this.$store.dispatch('updateHistory')
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
