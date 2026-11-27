<template>
  <div class="config-page-content">
    <p>
      Command-line tools and other apps can read from Beekeeper Studio
      through a local socket.
    </p>
    <h3>Authorized Clients</h3>
    <control-row
      v-for="client in clients"
      :key="client.name"
      :title="client.name"
    />
    <p
      v-if="!clients.length"
      class="text-muted"
    >
      No authorized clients
    </p>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapState } from "vuex";
import ControlRow from "@/components/common/ControlRow.vue";

export default Vue.extend({
  components: {
    ControlRow,
  },
  computed: {
    ...mapState("cli", ["clients"]),
  },
});
</script>
