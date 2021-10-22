<template>
  <div v-if="error" class="error-alert alert alert-danger">
    <i class="material-icons">error_outline</i>
    <div class="alert-body">
      <b v-if="title" class="error-title">{{title}}</b>
      <ul>
        <li class="error-item" v-for="(e, idx) in errors" :key="idx">
          <span class="message">
            {{e.message || e.toString()}}
          </span>
        </li>
      </ul>
    </div>
    <a :href="error.helpLink">Learn more</a>
  </div>
</template>
<script lang="ts">
import platformInfo from '@/common/platform_info'
import _ from 'lodash'
import Vue from 'vue'
export default Vue.extend({
  props: ['error', 'title'],
  computed: {
    dev() {
      return platformInfo.isDevelopment
    },
    errors() {
      const result = _.isArray(this.error) ? this.error : [this.error]
      return result.map((e) => {
        return e.message ? e : { message: e.toString()}
      })
    }
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .alert.error-alert {
    display: flex;
    min-width: 280px;
    .alert-body {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      flex-direction: column;
      flex-grow: 1;
      line-height: 18px;
      padding-top: 6px;
      ul {
        padding-left: 0;
        margin: 0;
      }
      li {
        list-style-type: none;
      }
      i {
        line-height: 28px;
      }
    }

    a {
      font-weight: 600;
      margin-top: $gutter-h / 2;
      padding-left: $gutter-w;
    }
  }
</style>