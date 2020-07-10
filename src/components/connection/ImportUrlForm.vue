<template>
  <form @submit.prevent="parseUrl(connectionUrl)">
    <div class="dialog-content">
      <div class="dialog-c-title">Import from URL</div>
      <div class="alert alert-danger" v-show="errors">
        <i class="material-icons">warning</i>
        <strong>Please fix the following errors:</strong>
        <ul>
          <li v-for="(e, i) in errors" :key="i">{{e}}</li>
        </ul>
      </div>
      <div class="form-group">
        <label for="connectionUrl">Connection URL</label>
        <input type="text" name="connectionUrl" id="connectionUrl" class="form-control" v-model="connectionUrl">
      </div>
    </div>
    <div class="vue-dialog-buttons">
      <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('importUrlModal')">Cancel</button>
      <button class="btn btn-primary" type="submit" :disabled="!connectionUrl">Import</button>
    </div>
  </form>
</template>
<script>
  export default {
    name: 'ImportUrlForm',
    props: {
      config: Object
    },
    data() {
      return {
        connectionUrl: null,
      };
    },
    watch: {
      config: {
        handler: function(config) {
          if (config.host.includes('://')){
            this.parseUrl(config.host)
          }
        },
        deep: true
      }
    },
    methods: {
      parseUrl(connectionUrl) {
        try {
          let url = new URL(connectionUrl);
          this.config.connectionType = this.protocol(url.protocol);
          // set https as the protocol so URL interface can
          // correctly parse all necessary information
          url.protocol = 'https';
          this.config.host = url.hostname;
          this.config.port = url.port;
          this.config.defaultDatabase = url.pathname.slice(1, -1);
          this.config.username = url.username;
          this.config.password = url.password;
          this.config.ssl = url.search.includes('sslmode=require') || url.search.includes('sslmode=prefer');
          this.$emit('handleErrorMessage', null)
        } catch (e) {
          this.$emit('handleErrorMessage', e.message)
        }
      },
      protocol(protocol){
        // Set MySQL as default when dealing with a http/s connections.
        if (protocol.startsWith('http')){
          return 'mysql';
        }
        if (protocol.startsWith('postgres')){
          return 'postgresql';
        }
        return protocol;
      }
    },
  };
</script>
