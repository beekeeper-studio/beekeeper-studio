<template>
  <div
    v-if="error"
    class="error-alert alert text-danger"
  >
    <a
      @click.prevent="$emit('close')"
      v-if="closable"
      class="close-button"
    >
      <i class="material-icons">close</i>
    </a>
    <div class="alert-title">
      <i class="material-icons">error_outline</i>
      <b class="error-title">{{ title || "There was a problem" }}</b>
    </div>
    <div class="alert-body">
      <ul class="error-list">
        <li
          class="error-item"
          @click="click(e)"
          v-for="(e, idx) in errors"
          :key="idx"
          title="Click to copy"
        >
          {{ e.message || e.toString() }}
          {{ e.marker ? ` - line ${e.marker.line}, ch ${e.marker.ch}` : '' }}
          {{ helpText ? ` - ${helpText}` : '' }}
        </li>
      </ul>
      <div
        class="help-links"
        v-if="helpLink"
      >
        <a
          :href="helpLink"
          title="Read about this error on the Beekeeper Studio docs"
        >Learn more about this error</a>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import platformInfo from '@/common/platform_info'
import _ from 'lodash'
import Vue from 'vue'
export default Vue.extend({
  props: ['error', 'title', 'closable', 'helpText'],
  computed: {
    dev() {
      return platformInfo.isDevelopment
    },
    errors() {
      const result = _.isArray(this.error) ? this.error : [this.error]
      return result.map((e) => {
        return e.message ? e : { message: e.toString()}
      })
    },
    helpLink() {
      return this.errors.map((e) => e.helpLink).find((e) => e)
    }
  },
  methods: {
    click(e) {
      this.$native.clipboard.writeText(e.message || e.toString())
    }
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .alert.error-alert {
    display: flex;
    min-width: 200px;
    flex-direction: column;
    position:relative;
    .close-button {
      position: absolute;
      top: 5px;
      right: 5px;
    }
    .alert-title {
      display: flex;
      flex-direction: row;
      align-items: center;
      i {
        margin-right: 5px;
      }
    }
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
      .help-links {
        margin-top: 1rem;
        a {
          padding-left: 0;
        }
      }
    }

    a {
      font-weight: 600;
      margin-top: calc($gutter-h / 2);
      padding-left: $gutter-w;
    }
    &:hover{
      cursor: pointer;
    }
  }
</style>
