<template>
  <div
    class="upgrade-panel vue-dialog"
    :class="{ 'upgrade-panel--standalone': standalone, 'upgrade-panel--wide': wide }"
  >
    <div class="dialog-content">
      <h3 class="dialog-c-title">
        {{ headingText }}
      </h3>
      <p class="dialog-c-subtitle">
        {{ descriptionText }}
      </p>
      <slot />
      <ul
        v-if="showFeatures"
        class="upgrade-feature-list"
      >
        <li
          v-for="feature in features"
          :key="feature.label"
          v-tooltip="feature.tooltip || false"
        >
          <i class="material-icons">check</i>
          <span>{{ feature.label }}</span>
        </li>
      </ul>
      <p class="upgrade-panel-links">
        <a
          href="#"
          @click.prevent="learnMore"
        >
          <i class="material-icons">open_in_new</i>
          <span>Full list of paid features</span>
        </a>
      </p>
    </div>
    <upsell-buttons @started-trial="$emit('started-trial')" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import UpsellButtons from './common/UpsellButtons.vue'

const UPGRADE_URL = 'https://www.beekeeperstudio.io/upgrade'

const LIFETIME_TOOLTIP =
  'Subscribe for 12+ months and get lifetime access to any version released within your subscription period.'

interface Feature {
  label: string
  tooltip?: string
}

const PAID_FEATURES: Feature[] = [
  { label: 'Lifetime access', tooltip: LIFETIME_TOOLTIP },
  { label: 'Import from file' },
  { label: 'Export multiple tables' },
  { label: 'Unlimited table filters' },
  { label: 'JSON row view' },
  { label: 'Read-only connections' },
  { label: 'Cloud sync' },
  { label: 'SQL AI shell' },
  { label: 'Connection folders' },
  { label: '10 more databases' },
]

export default Vue.extend({
  components: { UpsellButtons },
  props: {
    // Name of the feature the user just tried to use, e.g. "Backup & Restore".
    // Drives the heading; leave null for a generic prompt.
    featureName: {
      type: String,
      default: null
    },
    // Full heading override, for surfaces that need their own wording.
    title: {
      type: String,
      default: null
    },
    // Body copy override, shown in place of the community-edition sentence.
    description: {
      type: String,
      default: null
    },
    showFeatures: {
      type: Boolean,
      default: true
    },
    // When true, the panel adds its own card chrome (surface, radius, shadow)
    // for inline placement. When false it's bare, so a modal supplies chrome.
    standalone: {
      type: Boolean,
      default: false
    },
    // Wider card, for panels with a preview in the default slot.
    wide: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    features(): Feature[] {
      return PAID_FEATURES
    },
    headingText(): string {
      if (this.title) return this.title
      if (this.featureName) return `${this.featureName} needs a paid license`
      return 'Upgrade Beekeeper Studio'
    },
    descriptionText(): string {
      if (this.description) return this.description
      if (!this.showFeatures) return 'Not included in the Community Edition.'
      return this.featureName
        ? 'Not included in the Community Edition. A paid license also includes:'
        : 'A paid license includes:'
    }
  },
  methods: {
    learnMore() {
      this.$native.openLink(UPGRADE_URL)
    }
  }
})
</script>
