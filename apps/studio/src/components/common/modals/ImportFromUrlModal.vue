<template>
  <base-modal
    class="vue-dialog beekeeper-modal import-modal"
    :name="name"
    form-based
    @opened="handleOpened"
    @submit="importFromUrl"
  >
    <template #title>Import from URL</template>
    <div v-if="importError" class="alert alert-danger">{{ importError }}</div>
    <div class="form-group">
      <label for="url">Paste URL</label>
      <input
        class="form-control"
        ref="importInput"
        type="text"
        v-model="url"
      >
    </div>
    <template #footer>
      <button
        class="btn btn-flat"
        type="button"
        @click.prevent="hide"
      >
        Cancel
      </button>
      <button class="btn btn-primary" type="submit">Import</button>
    </template>
  </base-modal>
</template>
<script>
import BaseModal from "@/components/common/modals/BaseModal.vue";
export default {
    components: { BaseModal },
    props: {
      config: Object,
      name: {
        type: String,
        default: "import-modal",
      },
    },
    data() {
      return {
        importError: null,
        url: null
      }
    },
    methods: {
      hide() {
        this.$modal.hide(this.name);
      },
      async handleOpened() {
        await this.$nextTick();
        this.$refs.importInput?.select()
      },
      async importFromUrl() {
        try {
          const conf = await this.$util.send('appdb/saved/parseUrl', { url: this.url });
          Object.assign(this.config, conf);
          if (!this.config.connectionType) {
            this.importError = "Unable to determine database type from the URL";
          } else {
            this.url = null;
            this.hide()
          }
        } catch {
          this.importError = "Unable to parse url"
        }
      },
    }
}
</script>
