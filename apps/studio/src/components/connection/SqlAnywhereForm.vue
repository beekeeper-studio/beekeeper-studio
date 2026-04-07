<template>
  <div class="with-connection-type">
    <div class="form-group col">
      <label for="connectionMethod">Connection Method</label>
      <select name="connectionMethod" id="" v-model="config.sqlAnywhereOptions.mode">
        <option value="server">Server</option>
        <option value="file">File</option>
      </select>
    </div>
    <common-server-inputs :supportComplexSSL="false" :config="config" v-show="isServer">
      <div class="form-group expand">
        <label for="serverName">Server Name</label>
        <masked-input
          :value="config.sqlAnywhereOptions.serverName"
          @input="val => config.sqlAnywhereOptions.serverName = val"
        />
      </div>
    </common-server-inputs>
    <div v-show="!isServer" class="">
      <div class="row gutter">
        <div class="col s6 form-group">
          <label for="user">User</label>
          <masked-input
            :value="config.username"
            @input="val => config.username = val"
          />
        </div>
        <div class="col s6 form-group">
          <label for="password">Password</label>
          <password-input v-model="config.password" />
        </div>
      </div>
      <div class="form-group expand">
        <label for="serverName">Server Name</label>
        <masked-input
          :value="config.sqlAnywhereOptions.serverName"
          @input="val => config.sqlAnywhereOptions.serverName = val"
        />
      </div>
      <div class="form-group expand">
        <label for="databaseName">Database Name</label>
        <input type="text" class="form-control" v-model="config.defaultDatabase">
      </div>
      <div class="form-group col">
        <div class="form-group">
          <label for="filepath">Filepath</label>
          <file-picker
            v-model="config.sqlAnywhereOptions.databaseFile"
            input-id="filepath"
            editable
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import CommonServerInputs from './CommonServerInputs.vue'
import FilePicker from "@/components/common/form/FilePicker.vue"
import MaskedInput from '@/components/MaskedInput.vue'
import PasswordInput from '@/components/common/form/PasswordInput.vue'

export default {
  components: { CommonServerInputs, FilePicker, MaskedInput, PasswordInput },
  props: ['config'],
  computed: {
    isServer() {
      return this.config.sqlAnywhereOptions.mode === 'server';
    },
  }
}
</script>

<style>

</style>
