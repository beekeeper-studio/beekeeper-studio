<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="authenticationType">Authentication Method</label>
      <select name="" v-model="authenticator" id="">
        <option :key="`${t.value}`" v-for="t in authTypes" :value="t.value" :selected="authenticator === t.value">
          {{ t.name }}
        </option>
      </select>
    </div>
    
    <!-- Snowflake-specific fields -->
    <div class="form-group col">
      <label for="account">Account</label>
      <input type="text" id="account" v-model="config.snowflakeOptions.account" 
        placeholder="e.g., xy12345.us-east-1" />
      <small>Your Snowflake account identifier</small>
    </div>

    <common-server-inputs :config="config" v-if="!isBrowserFlow" />
    
    <div class="form-group col">
      <label for="warehouse">Warehouse</label>
      <input type="text" id="warehouse" v-model="config.snowflakeOptions.warehouse" />
      <small>The warehouse to use for queries</small>
    </div>

    <div class="form-group col">
      <label for="role">Role</label>
      <input type="text" id="role" v-model="config.snowflakeOptions.role" />
      <small>The role to use (leave empty for default)</small>
    </div>

    <common-advanced :config="config" />
  </div>
</template>

<script>
import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'
import { AppEvent } from "@/common/AppEvent";

export default {
  components: { CommonServerInputs, CommonAdvanced },
  props: ['config'],
  data() {
    return {
      authenticator: this.config.snowflakeOptions?.authenticator || 'snowflake',
      authTypes: [
        { name: 'Username / Password', value: 'snowflake' },
        { name: 'Browser OAuth', value: 'browser' },
        { name: 'Key Pair', value: 'keypair' }
      ]
    }
  },
  created() {
    if (!this.config.snowflakeOptions) {
      this.config.snowflakeOptions = {
        account: '',
        warehouse: '',
        role: '',
        authenticator: 'snowflake',
        browserFlow: false
      }
    }
  },
  computed: {
    isBrowserFlow() {
      return this.authenticator === 'browser';
    }
  },
  watch: {
    authenticator() {
      this.config.snowflakeOptions.authenticator = this.authenticator;
      this.config.snowflakeOptions.browserFlow = this.authenticator === 'browser';
      
      // If browser flow, we don't need username/password
      if (this.isBrowserFlow) {
        this.config.user = null;
        this.config.password = null;
      }
    }
  }
}
</script>