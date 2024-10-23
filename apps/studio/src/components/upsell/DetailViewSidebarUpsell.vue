<template>
  <div class="community-overlay">
    <button class="close-btn btn btn-fab" @click="$emit('close')">
      <i class="material-icons">close</i>
    </button>
    <span class="title">
      <i class="material-icons">stars</i> JSON Viewer
    </span>
    <div class="body">
      <p>
        View rows as JSON, with in-line expanded foreign key data.
      </p>
      <p>
        Super useful when working with wide tables or complex nested data.
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
