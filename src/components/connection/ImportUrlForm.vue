<template>
    <form :class="{hide: hide}" @submit.prevent="parseUrl(connectionUrl)">
        <div class="row gutter">
            <div class="col s9 form-group">
                <label for="connectionUrl">Connection URL</label>
                <input type="text" name="connectionUrl" id="connectionUrl"
                       class="form-control" v-model="connectionUrl">
            </div>
            <div class="col s3 form-group">
                <div class="flex flex-bottom">
                    <button class="btn btn-primary btn-block" type="submit" :disabled="!connectionUrl">Import</button>
                </div>
            </div>
        </div>
    </form>
</template>
<script>
  export default {
    name: 'ImportUrlForm',
    props: {
      config: Object,
      hide: {
        type: Boolean,
        default: false
      }
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
<style scoped>
    .hide {
        display: none;
    }
</style>
