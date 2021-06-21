<template>
<select name="dialect" @change="setDialect" id="dialect-select">
  <option v-for="d in dialects" :key="d" :value="d" :selected="d === dialect">{{d}}</option>
</select>
</template>
<script lang="ts">
import { Dialects } from '@shared/lib/dialects/models'
import Vue from 'vue'
import { mapState } from 'vuex'
export default Vue.extend({
  data() {
    return {
      dialects: Dialects
    }
  },
  computed: {
    ...mapState(['dialect'])
  },
  methods: {
    setDialect(e: Event) {
      const target = e.target as HTMLSelectElement
      this.$store.commit('setDialect', target.value)
    }
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  select {
    margin-bottom: 1.2rem;
  }
</style>