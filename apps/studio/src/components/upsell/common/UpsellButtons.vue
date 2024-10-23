<template>
  <!-- This component is responsible for showing buttons based on user subscription status -->
  <!-- For example - can they start a trial? -->
  <div class="upsell-buttons">
    <div class="actions">
      <a v-if="trialAvailable" @click.prevent="startTrial">Free Trial</a>
      <a v-else :href="learnUrl" class="btn btn-flat">Learn more</a>
      <a :href="buyUrl" class="btn btn-primary">Buy License</a>
    </div>
    <p class="help text-right text-muted small">
      Your free trial ended on {{ trialEndDate }}
    </p>
  </div>
</template>
<style scoped >
  .actions {
    display: flex;
    flex-direction: row;
  }
  .help {
    text-align: right;
  }
  .btn {
    white-space: nowrap;
  }

</style>
<script lang="js">
export default {
  data: () => ({
    learnUrl: 'https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition',
    buyUrl: 'https://www.beekeeperstudio.io/pricing',
  }),
  computed: {
    trialLicense() {
      return this.$store.getters['licenses/trialLicense']
    },
    trialEndDate() {
      return this.trialLicense?.validUntil?.toDateString()
    },
    // if we've never started a trail, it's available!
    trailAvailable() {
      return !this.trialLicense
    }
  },
  methods: {
    startTrial() {
      this.$store.dispatch('licenses/add', { trial: true })
    }
  }
}

</script>
