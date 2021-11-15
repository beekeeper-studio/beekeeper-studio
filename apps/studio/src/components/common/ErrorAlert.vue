<template>
  <div v-if="error" class="error-alert alert text-danger">
    <i class="material-icons">error</i>
    <ul class="error-list">
      <li
        class="error-item"
        v-on:click="click(e)"
        v-for="(e, idx) in errors" :key="idx"
        v-b-tooltip.hover title="Click to copy"
      >
        {{e.message || e.toString()}}
      </li>
    </ul>
    <div class="help-links" v-if="error.helpLink">
      <a :href="error.helpLink">Learn more about this error</a>
    </div>
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import { clipboard } from 'electron'
export default Vue.extend({
  props: ['error'],
  computed: {
    errors() {
      const result = _.isArray(this.error) ? this.error : [this.error]
      return result.map((e) => {
        return e.message ? e : { message: e.toString()}
      })
    }
  },
  methods: {
    click(e) {
      clipboard.writeText(e.message || e.toString())
    }
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .alert.error-alert {
    display: flex;
    flex-direction: row;
    > i {
      padding-top: 4px;
    }
    ul {
      padding-left: 0;
    }
    li {
      list-style-type: none;
    }
    a {
      font-weight: 600;
      margin-top: $gutter-h / 2;
      padding-left: $gutter-w * 1.8;
    }
    &:hover{
      cursor: pointer;
    }
  }
</style>
