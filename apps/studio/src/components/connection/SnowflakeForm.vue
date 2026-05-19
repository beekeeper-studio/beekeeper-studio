<template>
  <div class="with-connection-type snowflake-form">
    <div class="form-group">
      <label for="accountId">
        Account ID
        <i
          class="material-icons"
          v-tooltip="{
            content: `Your account identifier, found in Snowsight`,
            html: true,
          }"
        >
          help_outlined
        </i>
      </label>
      <input
        type="text"
        class="form-control"
        placeholder="eg: <org_name>-<account_name>"
        v-model="config.snowflakeOptions.accountId"
      >
    </div>
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
      <label
        for="defaultDatabase"
      >Default Database</label>
      <input
        type="text"
        class="form-control"
        v-model="config.defaultDatabase"
      >
    </div>
    <div class="form-group expand">
      <label
        for="defaultWarehouse"
      >Default Warehouse</label>
      <input
        type="text"
        class="form-control"
        v-model="config.snowflakeOptions.defaultWarehouse"
      >
    </div>
  </div>
</template>

<script lang="ts">
import MaskedInput from '@/components/MaskedInput.vue'
import PasswordInput from '@/components/common/form/PasswordInput.vue'

export default {
  components: { MaskedInput, PasswordInput },
  props: {
    config: {
      type: Object,
      required: true,
    },
    testing: {
      type: Boolean,
      default: false,
    },
  },
}
</script>

<style>

</style>
