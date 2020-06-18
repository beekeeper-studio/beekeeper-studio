<template>
  <div class="import-url-form">
    <a @click.prevent="openModal">Import from URL</a>
    <modal
      class="vue-dialog beekeeper-modal"
      name="import-modal"
      @opened="selectInput"
      height="auto"
      :scrollable="true"
    >
        <form :class="{hide: hide}" @submit.prevent="submit">
          <div class="dialog-content">
              <div class="dialog-c-title">Enter Database URL</div>
              <div class="alert alert-danger" v-show="errors">
                <i class="material-icons">warning</i>
                <div>
                  <span>Please fix the following errors:</span>
                  <ul>
                    <li v-for="(e, i) in errors" :key="i">{{e}}</li>
                  </ul>
                </div>
              </div>
              <div class="form-group">
                <label for="connectionUrl">Connection URL</label>
                <input ref="input" placeholder="eg postgres://user:password@server:port/database" type="text" name="connectionUrl" id="connectionUrl" class="form-control" v-model="connectionUrl" />
              </div>
          </div>
          <div class="vue-dialog-buttons">
            <button class="btn btn-flat" type="button" @click.prevent="closeModal">Cancel</button>
            <button
              class="btn btn-primary"
              type="submit"
              :disabled="!connectionUrl"
            >Submit</button>
          </div>
        </form>


    </modal>
  </div>
</template>
<script>
import _ from 'lodash'
import { parseConnectionUrl } from '../../lib/db/sql_tools';

export default {
  name: "ImportUrlForm",
  props: {
    config: Object,
    hide: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      connectionUrl: null,
      errors: null
    };
  },
  watch: {
  },
  methods: {
    selectInput() {
      this.$refs.input.select()
    },
    openModal() {
      this.$modal.show('import-modal')
    },
    closeModal() {
      this.$modal.hide('import-modal')
    },
    submit() {
      this.errors = null
      try {
        const result = parseConnectionUrl(this.connectionUrl)
        console.log(result)
        this.config.connectionType = result.connectionType
        Object.assign(this.config, _.pick(result, ['host', 'port', 'defaultDatabase', 'username', 'password', 'ssl']))
        this.closeModal()
      } catch (ex) {
        this.errors = [ex.message]
      }
    }
  }
};
</script>
<style scoped>
.hide {
  display: none;
}
</style>
