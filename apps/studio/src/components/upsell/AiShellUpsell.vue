<template>
  <upgrade-panel
    class="ai-shell-upsell"
    title="The SQL AI shell needs a paid license"
    :description="description"
    :show-features="false"
    standalone
    wide
  >
    <ai-shell-preview />
  </upgrade-panel>
</template>

<script lang="ts">
import Vue from "vue";
import UpgradePanel from "./UpgradePanel.vue";
import AiShellPreview from "./AiShellPreview.vue";

export default Vue.extend({
  components: { UpgradePanel, AiShellPreview },
  data() {
    return {
      description:
        "Ask a question in plain English. The shell reads the schema, writes the SQL, asks before it runs anything, and uses your own model key — no proxy, no usage fees.",
    };
  },
});
</script>
