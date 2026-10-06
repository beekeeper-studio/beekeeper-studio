<template>
  <div class="alert upgrade-alert">
    <i class="material-icons">info_outline</i>
    <div class="alert-body">{{ featureName }} needs a paid license</div>
    <div class="actions">
      <button
        v-if="trialAvailable"
        class="btn btn-flat"
        type="button"
        @click.prevent="startTrial"
      >
        Start free trial
      </button>
      <a v-else :href="learnUrl">Learn more</a>
      <button
        class="btn btn-primary"
        type="button"
        v-tooltip="'Get lifetime app access with any purchase'"
        @click.prevent="buyLicense"
      >
        Buy License
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";

export default Vue.extend({
  props: {
    // Name of the feature that needs a license, e.g. "Oracle".
    featureName: {
      type: String,
      required: true,
    },
  },
  data: () => ({
    learnUrl: "https://www.beekeeperstudio.io/upgrade",
    buyUrl: "https://www.beekeeperstudio.io/pricing",
  }),
  computed: {
    trialAvailable(): boolean {
      return this.$store.getters["licenses/noLicensesFound"];
    },
  },
  methods: {
    startTrial() {
      this.$store.dispatch("licenses/add", { trial: true });
      this.$emit("started-trial");
    },
    learnMore() {
      this.$native.openLink(this.learnUrl);
    },
    buyLicense() {
      this.$native.openLink(this.buyUrl);
      this.$root.$emit(AppEvent.enterLicense);
    },
  },
});
</script>

<style lang="scss" scoped>
.alert.upgrade-alert {
  align-items: center;
}

.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .btn {
    white-space: nowrap;
    margin: 0;
    flex: 0 0 auto;
  }

  a {
    margin-right: 0.25rem;
  }
}
</style>
