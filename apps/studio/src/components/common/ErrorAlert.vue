<template>
  <div v-if="error" class="error-alert alert text-danger">
    <h3 v-if="title" class="error-title">{{title}}</h3>
    <div class="alert-body">
      <i class="material-icons">error_outline</i>
      <ul>
        <li class="error-item" v-for="(e, idx) in errors" :key="idx">
          <span class="message">
            {{e.message || e.toString()}}
          </span>
        </li>
      </ul>
    </div>
    <div class="alert-footer" v-if="error.helpLink">
      <span class="expand"></span>
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

    .alert-body {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      line-height: 18px;
      > i {
        padding-right: $gutter-w;
        line-height: 18px;
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