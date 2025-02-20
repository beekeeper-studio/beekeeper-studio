<template>
  <div class="with-connection-type oracledb-form">
    <div class="advanced-connection-settings">
      <div class="flex flex-middle">
        <span
          class="btn-link btn-fab"
          @click.prevent="oracleExpanded = !oracleExpanded"
        >
          <i
            v-if="!oracleExpanded"
            class="material-icons"
          >keyboard_arrow_right</i>
          <i
            v-if="oracleExpanded"
            class="material-icons"
          >keyboard_arrow_down</i>
        </span>
        <h4 class="advanced-heading">
          Global Oracle Configuration (optional)
        </h4>
      </div>
      <div
        v-if="oracleExpanded"
        class="advanced-body"
      >
        <!-- 5.1 - disabling instant client, keeping the driver in 'thin' mode -->
        <!-- <settings-input
          setting-key="oracleInstantClient"
          input-type="directory"
          @changed="restart"
          title="Instant Client Location"
          :help="help"
        /> -->
        <settings-input
          setting-key="oracleConfigLocation"
          input-type="directory"
          title="TNS_ADMIN override"
          help="The directory containing tnsnames.ora, sqlnet.ora, and wallets"
        />
      </div>
    </div>

    <div class="form-group">
      <label for="connectionType">Connection Method</label>
      <select v-model="connectionMethod">
        <option value="manual">
          Manual Host and Port
        </option>
        <option value="connectionString">
          Connection String or Alias
        </option>
      </select>
    </div>

    <div
      class="oracle-manual"
      v-if="connectionMethod === 'manual'"
    >
      <common-server-inputs
        :support-complex-s-s-l="false"
        ssl-help="Requires your wallet to be already set up in TNS_ADMIN"
        :config="config"
      />
      <div class="form-group">
        <label for="serviceName">Service Name</label>
        <input
          type="text"
          class="form-control"
          v-model="config.serviceName"
        >
      </div>
      <common-advanced :config="config" />
    </div>
    <div v-if="connectionMethod === 'connectionString'">
      <div class="form-group gutter">
        <label for="connectionString">Connection String or TNS alias</label>
        <textarea
          v-model="config.options.connectionString"
          name="connectionString"
          class="form-control"
          id=""
          cols="30"
          rows="5"
        />
      </div>
      <div class="row gutter">
        <div class="col s6 form-group">
          <label for="user">User (optional)</label>
          <input
            type="text"
            name="user"
            v-model="config.username"
            class="form-control"
          >
        </div>
        <div class="col s6 form-group">
          <label for="password">Password (optional)</label>
          <input
            type="password"
            v-model="config.password"
            class="form-control"
          >
        </div>
      </div>
      <br>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
import Noty from 'noty'
import CommonServerInputs from './CommonServerInputs.vue'
import CommonAdvanced from './CommonAdvanced.vue'
import SettingsInput from '../common/SettingsInput.vue'
import { mapState } from 'vuex'

export default Vue.extend({
  components: { CommonServerInputs, CommonAdvanced, SettingsInput },
  props: ['config'],
  data: () => ({
    help: null,
    oracleExpanded: true,
  }),
  computed: {
    ...mapState('settings', { 'settings': 'settings'}),
    connectionMethod: {
      set(value: string) {
        this.config.options = {...this.config.options, connectionMethod: value}
      },
      get() {
        return this.config.options.connectionMethod
      }
    },
    connectionString: {
      set(value: string) {
        this.config.options = { ...this.config.options, connectionString: value }
      },
      get() {
        return this.config.options.connectionString
      }
    },
    restartNotification() {
      return new Noty({
        text: "You must restart Beekeeper Studio for this change to take effect",
        layout: 'bottomRight',
        closeWith: ['button'],
        buttons: [
          Noty.button("Not now", 'btn btn-flat', () => this.restartNotification.close()),
          Noty.button("Restart", 'btn btn-primary', () => this.$native.app.restart())
        ]
      })
    }
  },
  methods: {
    restart() {
      if(this.$config.isLinux) {
        this.restartNotification.show()
      }
    }
  },
  beforeMount() {

    this.help = this.$config.isLinux ? "Restart Beekeeper Studio after setting this value for Oracle connections to work" : null
    if (this.config.host && this.config.id && !this.config.options.connectionMethod) {
      this.connectionMethod = 'manual'
    } else if (!this.connectionMethod) {
      this.connectionMethod = 'connectionString'
    }
    if (this.settings.oracleInstantClient) this.oracleExpanded = false
  }

})
</script>
