<template>
  <div>
    <p class="small text-muted card padding flex flex-middle">
      <span class="expand flex flex-middle">
        <i class="material-icons me-2">stars</i>
        <span v-html="message" />
      </span>
    </p>
    <UpsellButtons v-if="upsell" />
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import type { DisableReason } from '@/services/plugin/types'
import UpsellButtons from "@/components/upsell/common/UpsellButtons.vue";

export default Vue.extend({
  name: 'DisabledPluginAlert',
  components: { UpsellButtons },
  props: {
    pluginName: {
      type: String,
      required: true,
    },
    reason: {
      type: Object as PropType<DisableReason>,
      required: true,
    },
  },
  computed: {
    message() {
      const reason: DisableReason = this.reason;
      switch (reason.source) {
        case "config":
          return `${this.pluginName} disabled via configuration`;
        case "license":
          switch (this.reason.cause) {
            case "max-plugins-reached":
              return `${this.pluginName} disabled: you have reached the maximum of 5 plugins allowed in your license.`;
            case "max-community-plugins-reached":
              return `${this.pluginName} disabled: you have reached the maximum of 2 community plugins allowed.`;
            case "valid-license-required":
              return `Upgrade to access <b>${this.pluginName}</b> and other core plugins.`;
          }
      }
    },
    upsell() {
      return (this.reason as DisableReason).source === "license";
    },
  },
});
</script>
