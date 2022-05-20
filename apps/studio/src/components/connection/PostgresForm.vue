<template>
  <div class="with-connection-type">
    <div class="alert alert-info" v-if="isCockroach">
      <i class="material-icons">info_outlined</i>
      <span class="">For CockroachDB Cloud your database name should be [cluster].[database]</span>
    </div>
    <common-server-inputs :config="config"></common-server-inputs>
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
