<template>
  <div v-if="snapshot?.disableState.disabled" class="alert">
    <i class="material-icons-outlined">info</i>
    <div class="alert-body">
      {{ message }}
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { PluginSnapshot } from "@/services/plugin";
import { disabledStateMessage } from "@/services/plugin/availability";
import { mapGetters } from "vuex";

export default Vue.extend({
  name: "DisableStateAlert",
  props: {
    pluginId: {
      type: String,
      required: true,
    },
  },
  computed: {
    ...mapGetters("plugins/snapshots", ["snapshotsById"]),
    snapshot(): PluginSnapshot | undefined {
      return this.snapshotsById[this.pluginId];
    },
    message(): string {
      return this.snapshot ? disabledStateMessage(this.snapshot) : "";
    },
  },
});
</script>

<style scoped></style>
