<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config"></common-server-inputs>
    <div class="form-group">
      <label for="Cluster ID">CockroachDB Cloud Cluster ID</label>
      <input type="text" class="form-control" v-model="config.options.cluster">
    </div>
    <common-advanced :config="config"></common-advanced>
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs'
  import CommonAdvanced from './CommonAdvanced'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config'],
    computed: {
      isCockroach() {
        return this.config.connectionType === 'cockroachdb'
      }
    }

  }
</script>
