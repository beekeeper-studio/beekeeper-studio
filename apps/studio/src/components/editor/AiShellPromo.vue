<template>
  <div class="ai-shell-promo" v-if="visible">
    <i class="material-icons ai-shell-icon">auto_awesome</i>
    <span class="promo-text">Have AI write SQL for you using the AI Shell</span>
    <a
      class="btn btn-flat btn-small promo-open"
      @click.prevent="open"
    >Open</a>
    <a
      class="promo-dismiss"
      title="Dismiss"
      aria-label="Dismiss"
      @click.prevent="dismiss"
    ><i class="material-icons">close</i></a>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { mapGetters } from "vuex";
import aiShell from "@/mixins/aiShell";

export default Vue.extend({
  name: "AiShellPromo",
  mixins: [aiShell],
  computed: {
    ...mapGetters(["aiShellPromoDismissed"]),
    visible(): boolean {
      // A promo for something that can't be used is just noise, so this hides
      // rather than greying out. Community users do see it — the AI Shell tab
      // renders the upsell for them, so `Open` still lands somewhere sensible.
      return !this.aiShellPromoDismissed && this.aiShellEnabled;
    },
  },
  methods: {
    open() {
      this.openAiShell();
    },
    dismiss() {
      this.$store.dispatch("dismissAiShellPromo");
    },
  },
});
</script>
