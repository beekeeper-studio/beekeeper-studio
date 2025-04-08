<template>
  <div class="community-overlay">
    <span class="title">
      <i class="material-icons">stars</i> {{ $t('JSON Row Viewer') }}
    </span>
    <div class="body">
      <p>
        {{ $t('Upgrade required to use the JSON Row Viewer.') }}
      </p>
      <p>
        {{ $t('View any row as JSON. Super useful when working with wide tables or complex nested data.') }}
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
