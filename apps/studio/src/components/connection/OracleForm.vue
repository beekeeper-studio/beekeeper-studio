<template>
  <div class="with-connection-type oracledb-form">
    <template v-if="$config.oracleSupported">
      <div class="advanced-connection-settings">
        <div class="flex flex-middle">
          <span class="btn-link btn-fab" @click.prevent="oracleExpanded = !oracleExpanded">
            <i v-if="!oracleExpanded" class="material-icons">keyboard_arrow_right</i>
            <i v-if="oracleExpanded" class="material-icons">keyboard_arrow_down</i>
          </span>
          <h4 class="advanced-heading">
            {{ $t('Global Oracle Configuration') }}
          </h4>
        </div>
        <div v-if="oracleExpanded" class="advanced-body">
          <settings-input setting-key="oracleInstantClient" input-type="directory" @changed="restart"
                          :title="String($t('Instant Client Location'))" :help="help"
          />
          <settings-input setting-key="oracleConfigLocation" input-type="directory" :title="String($t('TNS_ADMIN override'))"
                          :help="String($t('The directory containing tnsnames.ora, sqlnet.ora, and wallets'))"
          />
        </div>
      </div>

      <div class="form-group">
        <label for="connectionType">{{ $t('Connection Method') }}</label>
        <select v-model="connectionMethod">
          <option value="manual">
            {{ $t('Manual Host and Port') }}
          </option>
          <option value="connectionString">
            {{ $t('Connection String or Alias') }}
          </option>
        </select>
      </div>

      <div class="oracle-manual" v-if="connectionMethod === 'manual'">
        <common-server-inputs :support-complex-s-s-l="false"
                              :ssl-help="String($t('Requires your wallet to be already set up in TNS_ADMIN'))" :config="config"
        />
        <div class="form-group">
          <label for="serviceName">{{ $t('Service Name') }}</label>
          <input type="text" class="form-control" v-model="config.serviceName">
        </div>
        <common-advanced :config="config" />
      </div>
      <div v-if="connectionMethod === 'connectionString'">
        <div class="form-group gutter">
          <label for="connectionString">{{ $t('Connection String or TNS alias') }}</label>
          <textarea v-model="config.options.connectionString" name="connectionString" class="form-control" id=""
                    cols="30" rows="5"
          />
        </div>
        <div class="row gutter">
          <div class="col s6 form-group">
            <label for="user">{{ $t('User') }} ({{ $t('optional') }})</label>
            <input type="text" name="user" v-model="config.username" class="form-control">
          </div>
          <div class="col s6 form-group">
            <label for="password">{{ $t('Password') }} ({{ $t('optional') }})</label>
            <input type="password" v-model="config.password" class="form-control">
          </div>
        </div>
        <br>
      </div>
    </template>
    <template v-else>
      <div class="alert alert-warning">
        <i class="material-icons-outlined">warning</i>
        <div>{{ $t('Oracle does not currently support MacOS devices running Apple silicon.') }}</div>
      </div>
      <div>
        <p>{{ $t('Unfortunately, Oracle does not publish a version of the \'Oracle Instant Client\' for your device type.') }}</p>
        <p class="">
          {{ $t('Read more:') }}
          <a href="https://www.oracle.com/database/technologies/instant-client.html" class="">{{ $t('Oracle Instant Client docs') }}</a>
        </p>
      </div>
    </template>
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
  props: {
    config: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      help: this.$t("Optional, but required for advanced functionality like Native Network Encryption."),
      oracleExpanded: true,
    }
  },
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
    },
  },

})
</script>
