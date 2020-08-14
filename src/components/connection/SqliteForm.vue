<template>
  <div class="sqlite-form">
    <div class="host-port-user-password">
      <div class="row gutter">
        <div class="col form-group">
          <label for="Database" required>Database File</label>
          <file-picker v-model="config.defaultDatabase"></file-picker>
          <div class="alert alert-warning" v-if="$config.isSnap">
            <i class="material-icons">warning</i>
            <p>
              Hey snap user! If you want to use a sqlite database on an external drive you'll need to give Beekeeper some extra permissions
              <external-link :href="snap">Read more</external-link>
            </p>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import FilePicker from '@/components/common/form/FilePicker'
  export default {
    props: ['config'],
    components: {
      FilePicker
    },
    data() {
      return {
        snap: "http://docs.beekeeperstudio.io/troubleshooting/#i-get-permission-denied-when-trying-to-access-a-database-on-an-external-drive"
      }
    }
  }
</script>
