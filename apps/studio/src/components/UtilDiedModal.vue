<template>
  <portal to="modals">
    <common-modal id="util-died-modal">
      <template v-slot:title>
        Utility Process Crashed
      </template>
      <template v-slot:content>
        Looks like the utility process has crashed! We've automatically restarted it, but you may need to reconnect to your database if you were previously connected. If this persists, please report it on our <a class="text-primary" href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">issue tracker</a>.
      </template>
      <template v-slot:action>
        <button
          class="btn btn-flat"
          style="margin-right: 0.5rem;"
          type="button"
          @click.prevent="close"
        >
          Close
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click.prevent="disconnect"
          autofocus
        >
          Disconnect
        </button>
      </template>
    </common-modal>
  </portal>
</template>

<script lang="ts">
import CommonModal from '@/components/common/modals/CommonModal.vue'

export default {
  components: { CommonModal },
  methods: {
    disconnect() {
      this.$store.dispatch('disconnect');
      this.$modal.hide('util-died-modal');
    },
    close() {
      this.$modal.hide('util-died-modal');
    }
  },
  mounted() {
    window.main.onUtilDied((_event) => {
      this.$modal.show('util-died-modal');
    });
  }
}
</script>
