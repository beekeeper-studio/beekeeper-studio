<template>
  <div v-if="error" class="error-alert alert text-danger">
    <h3 v-if="title" class="error-title">{{title}}</h3>
    <div class="error-wrapper">
      <i class="material-icons">error</i>
      <ul class="error-list">
        <li class="error-item" v-for="(e, idx) in errors" :key="idx">
          <span class="message">
            {{e.message || e.toString()}}
          </span>
          <hr v-if="dev">
          <span v-if="dev">DEV STACK TRACE:{{e.stack}}</span>
        </li>
      </ul>

    </div>
    <div class="help-links" v-if="error.helpLink">
      <a :href="error.helpLink">Learn more about this error</a>
    </div>
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
    flex-direction: column;

    .error-wrapper {
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
    }


    a {
      font-weight: 600;
      margin-top: $gutter-h / 2;
      padding-left: $gutter-w * 1.8;
    }
  }
</style>