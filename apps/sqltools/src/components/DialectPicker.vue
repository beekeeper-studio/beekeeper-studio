<template>
  <select name="dialect" v-model="selectedDialect" @change="setDialect" id="dialect-select">
    <option v-for="d in dialects" :key="d" :value="d">{{d}}</option>
  </select>
</template>
<script lang="ts">
import { Dialects } from '@shared/lib/dialects/models'
import Vue from 'vue'
import { mapState } from 'vuex'
export default Vue.extend({
  props: ['confirm', 'confirmMessage'],
  data() {
    return {
      dialects: Dialects,
      selectedDialect: null
    }
  },
  watch: {
    dialect() {
      this.selectedDialect = this.dialect
    }
  },
  computed: {
    ...mapState(['dialect'])
  },
  mounted() {
    this.selectedDialect = this.dialect
  },
  methods: {
    setDialect(_e: Event) {
      if (this.confirm) {
        const shouldContinue = window.confirm(this.confirmMessage)
        if (shouldContinue) {
          this.$store.commit('setDialect', this.selectedDialect)
        } else{
          this.selectedDialect = this.dialect
        }
      } else {
        this.$store.commit('setDialect', this.selectedDialect)
      }
    }
  }
})
</script>

<style lang="scss" scoped>
  select {
    width: 100%;
    max-width: 150px;
  }
</style>