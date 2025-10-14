<template>
  <div class="import-button">
    <a
      class="btn btn-link btn-small"
      @click.prevent="$modal.show('import-modal')"
      href="#"
    ><slot /></a>
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal import-modal"
        name="import-modal"
        height="auto"
        :scrollable="true"
        @opened="$refs.importInput.select()"
      >
        <form
          v-kbd-trap="true"
          @submit.prevent="importFromUrl"
        >
          <div class="dialog-content">
            <div class="dialog-c-title">
              Import from URL
            </div>
            <div
              v-if="importError"
              class="alert alert-danger"
            >
              {{ importError }}
            </div>
            <div class="form-group">
              <label for="url">Paste URL</label>
              <input
                class="form-control"
                ref="importInput"
                type="text"
                v-model="url"
              >
            </div>
          </div>
          <div class="vue-dialog-buttons">
            <button
              class="btn btn-flat"
              type="button"
              @click.prevent="$modal.hide('import-modal')"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              type="submit"
              @click.prevent="importFromUrl"
            >
              Import
            </button>
          </div>
        </form>
      </modal>
    </portal>
  </div>
</template>
<script>
export default {
    props: ['config'],
    data() {
      return {
        importError: null,
        url: null
      }
    },
    methods: {
      async importFromUrl() {
        try {
          const conf = await this.$util.send('appdb/saved/parseUrl', { url: this.url });
          Object.assign(this.config, conf);
          if (!this.config.connectionType) {
            this.importError = "Unable to determine database type from the URL";
          } else {
            this.url = null;
            this.$modal.hide('import-modal')
          }
        } catch {
          this.importError = "Unable to parse url"
        }
      },
    }
}
</script>
