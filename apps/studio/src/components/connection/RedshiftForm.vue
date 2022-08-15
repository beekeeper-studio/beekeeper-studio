<template>
  <div class="with-connection-type">
    <common-server-inputs :config="config"></common-server-inputs>

    <div class="advanced-connection-settings">
      <h4 class="advanced-heading flex" :class="{enabled: config.options.useIAM}">
        <span class="expand">IAM Authentication</span>
        <x-switch @click.prevent="config.options.useIAM = !config.options.useIAM" :toggled="config.options.useIAM"></x-switch>
      </h4>
      <div class="advanced-body" v-show="config.options.useIAM">
        <div class="row gutter">
          <div class="alert alert-info">
            <i class="material-icons-outlined">info</i>
            <div>Use AWS IAM authentication to connect with temporary cluster credentials. <a href="https://docs.aws.amazon.com/redshift/latest/mgmt/generating-user-credentials.html">Read More</a></div>
          </div>
        </div>

        <div class="form-group">
          <label for="AWS Region">
            AWS Region
          </label>
          <input type="text" class="form-control" v-model="config.options.awsRegion"/>
        </div>
        <div class="form-group">
          <label for="Access Key ID">
            Access Key ID
          </label>
          <input type="text" class="form-control" v-model="config.options.awsAccessKeyId"/>
        </div>
        <div class="form-group">
          <label for="Secret Access Key">
            Secret Access Key
          </label>
          <input type="password" class="form-control" v-model="config.options.awsSecretAccessKey"/>
        </div>
        <div class="form-group">
          <label for="Cluster Identifier">Cluster Identifier</label>
          <input type="text" class="form-control" v-model="config.options.clusterIdentifier"/>
        </div>
        <div class="form-group">
          <label for="Database Group">Database Group <span class="hint">(optional)</span></label>
          <input type="text" class="form-control" v-model="config.options.databaseGroup"/>
        </div>
        <div class="form-group">
          <label for="Token Duration">Token Duration <span class="hint">(optional, in seconds)</span></label>
          <input type="text" class="form-control" v-model="config.options.tokenDurationSeconds"/>
        </div>
      </div>
    </div>

    <common-advanced :config="config"></common-advanced>
  </div>
</template>
<script>

  import CommonServerInputs from './CommonServerInputs'
  import CommonAdvanced from './CommonAdvanced'

  export default {
    components: { CommonServerInputs, CommonAdvanced },
    props: ['config']
  }
</script>