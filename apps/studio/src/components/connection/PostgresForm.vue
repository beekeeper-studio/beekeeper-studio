<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config" />
    <div class="form-group" v-if="isCockroach">
      <label for="Cluster ID">
        CockroachDB Cloud Cluster ID
        <i
          class="material-icons"
          v-tooltip="`Go to CockroachDB online -> Connect -> parameters only -> copy from 'options'`"
        >help_outlined</i>
      </label>
      <input
        type="text"
        class="form-control"
        v-model="config.options.cluster"
      />
    </div>
    <common-advanced :config="config" />

    <div class="advanced-connection-settings">
      <common-iam :config="config" />
    </div>
    <common-advanced :config="config" />
  </div>
</template>

<script>

  import CommonServerInputs from './CommonServerInputs.vue'
  import CommonAdvanced from './CommonAdvanced.vue'
  import CommonIam from './CommonIam.vue'

  export default {
    components: { CommonServerInputs, CommonAdvanced, CommonIam },
    props: ['config'],
    computed: {
      isCockroach() {
        return this.config.connectionType === 'cockroachdb'
      },
    }
  };
</script>
