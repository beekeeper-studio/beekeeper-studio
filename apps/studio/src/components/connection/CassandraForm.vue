<template>
  <div class="with-connection-type">
    <div class="form-group">
      <label for="dataCenter">
        Local Data Center
      </label>
      <BaseInput
        type="text"
        name="dataCenter"
        class="form-control"
        v-model="config.cassandraOptions.localDataCenter"
      />
    </div>
    <common-server-inputs :config="config" />
  </div>
</template>
<script>
  // https://docs.datastax.com/en/developer/nodejs-driver/4.6/api/type.ClientOptions/
  import CommonServerInputs from './CommonServerInputs.vue'
  import BaseInput from '@/components/common/form/BaseInput.vue'

  export default {
    components: { CommonServerInputs, BaseInput },
    data() {
      return {}
    },
    methods: {
    },
    props: ['config'],
  }
</script>
