<template>
  <div class="connection-upsell-content">
    <div class="content">
      <p class="intro">
        <i class="material-icons">stars</i>
        <span>
          {{ $t('Upgrade required') }}
        </span>
      </p>
      <p>{{ $t('Get access to this feature, plus:') }}</p>
      <ul>
        <slot />
        <li class="flex flex-row">
          <span class="bullet">🥞</span>
          <span>
            Connect to Cassandra, Oracle, LibSQL, ClickHouse, DuckDB, and Trino.
          </span>
        </li>
        <li class="flex flex-row">
          <span class="bullet">🚀</span>
          <span>
            {{ $t('Unlock JSON view, unlimited table filters, import/export, backup/restore, and more.') }}
          </span>
        </li>
        <li class="flex flex-row">
          <span class="bullet">📬</span>
          <span>{{ $t('Email real support staff, we\'re here whenever you have a problem.') }}</span>
        </li>
        <li class="flex flex-row">
          <span class="bullet">🤝</span>
          <span>
            {{ $t('Sync data across machines with cloud workspaces and team collaboration tools.') }}
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
