<template>
  <div class="connection-upsell-content">
    <div class="content">
      <p class="intro">
        <i class="material-icons">stars</i>
        <span>
          {{ $t('upsell.upgradeRequired') }}
        </span>
      </p>
      <p>{{ $t('upsell.getAccessToFeature') }}</p>
      <ul>
        <slot />
        <li class="flex flex-row">
          <span class="bullet">🥞</span>
          <span>
            {{ $t('upsell.features.connectTo') }}
          </span>
        </li>
        <li class="flex flex-row">
          <span class="bullet">🚀</span>
          <span>
            {{ $t('upsell.features.unlockFeatures') }}
          </span>
        </li>
        <li class="flex flex-row">
          <span class="bullet">📬</span>
          <span>{{ $t('upsell.features.supportStaff') }}</span>
        </li>
        <li class="flex flex-row">
          <span class="bullet">🤝</span>
          <span>
            {{ $t('upsell.features.syncData') }}
          </span>
        </li>
      </ul>
    </div>
    <UpsellButtons />
  </div>
</template>
<script>
import Vue from "vue";
import UpsellButtons from "./common/UpsellButtons.vue";
export default Vue.extend({
  components: { UpsellButtons }
});
</script>
