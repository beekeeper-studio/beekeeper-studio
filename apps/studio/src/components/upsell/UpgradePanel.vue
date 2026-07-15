<template>
  <div class="upgrade-panel" :class="{ 'upgrade-panel--standalone': standalone }">
    <div class="upgrade-panel-scroll">
      <h3 class="title">
        <i v-if="featureName" class="material-icons">lock</i>
        <span>{{ featureName ? 'Upgrade required' : 'Upgrade Beekeeper Studio' }}</span>
      </h3>

      <p class="intro">
        <template v-if="featureName"><strong>{{ featureName }}</strong> is a paid feature. </template><a
          v-if="demoUrl"
          class="demo-link"
          href="#"
          @click.prevent="openDemo"
        >See how it works<i class="material-icons">open_in_new</i></a> Included with an upgrade:
      </p>

      <div class="feature-columns">
        <ul class="check-list">
          <li
            v-for="feature in leftColumn"
            :key="feature.label"
            :title="feature.title"
          >
            {{ feature.label }}
          </li>
        </ul>
        <ul class="check-list">
          <li
            v-for="feature in rightColumn"
            :key="feature.label"
            :title="feature.title"
          >
            {{ feature.label }}
          </li>
        </ul>
      </div>

      <div class="cta-row">
        <UpsellButtons @started-trial="$emit('started-trial')" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import UpsellButtons from './common/UpsellButtons.vue'

interface FeatureItem {
  label: string
  title?: string
}

const FEATURES: FeatureItem[] = [
  { label: 'AI Shell' },
  { label: 'JSON row viewer' },
  { label: 'Backup & restore' },
  { label: 'Import from file' },
  { label: 'Export multiple tables' },
  { label: 'Run queries directly to file' },
  { label: 'More database engines', title: 'Oracle, Cassandra, BigQuery, and more' },
  { label: 'Cloud sync' },
  { label: 'Read-only mode' },
  { label: 'Magic formatting' },
  { label: 'SQLite Extensions' },
  { label: 'More than 2 table filters' }
]

export default Vue.extend({
  components: { UpsellButtons },
  props: {
    featureName: {
      type: String,
      default: null
    },
    // Optional demo/video URL; renders a "See how it works" link.
    demoUrl: {
      type: String,
      default: null
    },
    // When true, panel adds its own card chrome (border, radius) for inline placement.
    // When false, it's bare so the wrapping modal can supply its own chrome.
    standalone: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    leftColumn(): FeatureItem[] {
      return FEATURES.slice(0, Math.ceil(FEATURES.length / 2))
    },
    rightColumn(): FeatureItem[] {
      return FEATURES.slice(Math.ceil(FEATURES.length / 2))
    }
  },
  methods: {
    openDemo() {
      this.$native.openLink(this.demoUrl)
    }
  }
})
</script>
