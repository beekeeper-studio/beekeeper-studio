<template>
  <div class="community-overlay">
    <button class="close-btn btn btn-fab" @click="$emit('close')">
      <i class="material-icons">close</i>
    </button>
    <span class="title">
      <i class="material-icons">stars</i> Upgrade Beekeeper Studio
    </span>
    <div class="body">
      <p>
        Upgrade required to use the JSON view.
      </p>
      <p>
        View any row as JSON. Super useful when working with wide tables or complex nested data.
      </p>
    </div>
    <upsell-buttons />
  </div>
</template>
<script lang="js">
import UpsellButtons from './common/UpsellButtons.vue';

  export default {
    components: { UpsellButtons },
    data: () => ({}),
    methods: {
      startTrial() {
        this.$store.dispatch('licenses/add', { trial: true })
      }
    }
  }

</script>
