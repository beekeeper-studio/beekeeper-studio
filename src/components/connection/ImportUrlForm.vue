<template>
    <form @submit.prevent="parseUrl">
        <div class="row gutter">
            <div class="col s9 form-group">
                <label for="connectionUrl">Connection URL</label>
                <input type="text" name="connectionUrl" id="connectionUrl"
                       class="form-control" v-model="connectionUrl">
            </div>
            <div class="col s3 form-group">
                <div class="flex flex-bottom">
                    <button class="btn btn-primary btn-block" type="submit">Import</button>
                </div>
            </div>
        </div>
    </form>
</template>
<script>
  export default {
    name: 'ImportUrlForm',
    props: ['config'],
    data() {
      return {
        connectionUrl: null,
      };
    },
    methods: {
      parseUrl() {
        if (this.connectionUrl.indexOf('://') < 0){
          this.connectionUrl = 'https://' + this.connectionUrl
        }
        let url = new URL(this.connectionUrl);
        this.config.connectionType = this.protocol(url.protocol)
        // set https as the protocol so URL interface can
        // correctly parse all necessary information
        url.protocol = 'https'
        this.config.host = url.hostname
        this.config.port = url.port
        this.config.defaultDatabase = url.pathname.slice(1, -1)
        this.config.username = url.username
        this.config.password = url.password
      },
      protocol(protocol){
        // Set MySQL as default when dealing with a http connection.
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
