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
        :class="{ 'upgrade-feature-list--used': showUsedFeatures }"
      >
        <li
          v-for="feature in features"
          :key="feature.label"
          v-tooltip="feature.tooltip || false"
          :class="{ current: feature.current }"
        >
          <i class="material-icons">{{ showUsedFeatures ? 'lock' : 'check' }}</i>
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
    <upsell-buttons
      @started-trial="$emit('started-trial')"
      @request-license="$emit('request-license')"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters } from 'vuex'
import UpsellButtons from './common/UpsellButtons.vue'
import { UsedPaidFeature, paidFeatureIdForName } from '@/lib/paidFeatures'

const UPGRADE_URL = 'https://www.beekeeperstudio.io/upgrade'

const LIFETIME_TOOLTIP =
  'Subscribe for 12+ months and get lifetime access to any version released within your subscription period.'

interface Feature {
  label: string
  tooltip?: string
  /** The feature the user just tried to use, when it appears in the list. */
  current?: boolean
}

// Ordered by demand: the middle of the list follows visitor counts for the
// matching /features page on the website (90 days to 2026-08-25), highest
// first. Features with no feature page follow, and the two ends are fixed —
// lifetime access leads, the catch-all closes.
const PAID_FEATURES: Feature[] = [
  { label: 'Lifetime access', tooltip: LIFETIME_TOOLTIP },
  { label: 'SQL AI shell' },
  { label: 'Import from file' },
  { label: 'Export multiple tables' },
  { label: 'Unlimited table filters' },
  { label: 'JSON row view' },
  { label: 'Cloud sync' },
  { label: 'Connection folders' },
  { label: '10 more databases' },
  { label: '…and much more' },
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
    ...mapGetters('paidFeatureUsage', ['usedFeatures']),
    // After a trial, the user's own history beats a generic list: show the
    // paid features this install actually used, and mark the one they just
    // tried to reach.
    showUsedFeatures(): boolean {
      return this.$store.getters.isCommunity && (this.usedFeatures as UsedPaidFeature[]).length > 0
    },
    features(): Feature[] {
      if (!this.showUsedFeatures) return PAID_FEATURES
      const currentId = paidFeatureIdForName(this.featureName)
      return (this.usedFeatures as UsedPaidFeature[]).map((f) => ({
        label: f.displayLabel,
        current: f.id === currentId,
      }))
    },
    headingText(): string {
      if (this.title) return this.title
      if (this.featureName) return `${this.featureName} needs a paid license`
      return 'Upgrade Beekeeper Studio'
    },
    descriptionText(): string {
      if (this.description) return this.description
      if (!this.showFeatures) return 'Not included in the Community Edition.'
      if (this.showUsedFeatures) {
        return this.featureName
          ? 'Not included in the Community Edition. Paid features used during your trial:'
          : 'Paid features used during your trial:'
      }
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
