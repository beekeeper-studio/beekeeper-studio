<template>
  <div class="upgrade-content" :class="{ 'in-tab': inTab }">
    <header class="um-header">
      <img class="um-logo" src="@/assets/logo.svg" alt="Beekeeper Studio">
      <div class="um-header-text">
        <div class="um-eyebrow" :class="{ 'um-eyebrow-trigger': !!triggered || !!customTitle }">
          <template v-if="triggered || customTitle">
            <i class="material-icons">lock</i>
            Upgrade Required
          </template>
          <template v-else>
            Beekeeper Studio
          </template>
        </div>
        <h2 class="um-title">
          <template v-if="customTitle">{{ customTitle }}</template>
          <template v-else-if="triggered">Unlock {{ triggered.triggerTitle || triggered.title }}</template>
          <template v-else>Upgrade to unlock these awesome features</template>
        </h2>
        <p v-if="triggered || customTitle" class="um-subline">
          … plus a bunch of other intuitive and useful features.
        </p>
        <p v-else-if="message" class="um-subline">{{ message }}</p>
      </div>
      <span class="um-pill">
        <span class="um-pill-dot"></span>
        Independent · Open source
      </span>
      <a
        v-if="closable"
        class="um-close"
        href="#"
        aria-label="Close"
        @click.prevent="$emit('close')"
      >
        <i class="material-icons">close</i>
      </a>
    </header>

    <div class="um-body">
      <nav class="um-features" aria-label="Features">
        <button
          v-for="f in features"
          :key="f.id"
          type="button"
          class="um-feature-btn"
          :class="{ active: f.id === active }"
          :style="{ borderLeftColor: f.id === active ? f.color : 'transparent' }"
          @click="active = f.id"
        >
          <i class="material-icons" :style="{ color: f.color }">{{ f.icon }}</i>
          <span>{{ f.title }}</span>
        </button>
      </nav>

      <section class="um-hero">
        <div class="um-hero-head">
          <h3 class="um-hero-title">
            <i class="material-icons" :style="{ color: featured.color }">{{ featured.icon }}</i>
            {{ featured.title }}
          </h3>
          <p class="um-hero-desc">{{ featured.short }}</p>
        </div>

        <template v-if="featured.id === 'overview'">
          <div class="um-overview-grid">
            <button
              v-for="f in overviewFeatures"
              :key="f.id"
              type="button"
              class="um-overview-card"
              @click="active = f.id"
            >
              <i class="material-icons" :style="{ color: f.color }">{{ f.icon }}</i>
              <span class="t">{{ f.title }}</span>
              <i class="material-icons chev">chevron_right</i>
            </button>
          </div>
        </template>
        <template v-else>
          <ul v-if="featured.pills" class="um-pills">
            <li
              v-for="p in featured.pills"
              :key="p.label"
              class="pill-row"
              v-tooltip="p.tooltip"
            >
              <i class="material-icons">{{ p.icon }}</i>
              <span>{{ p.label }}</span>
            </li>
          </ul>
          <ul v-else-if="featured.bullets" class="um-bullets">
            <li v-for="b in featured.bullets" :key="b">
              <i class="material-icons">check</i>
              {{ b }}
            </li>
          </ul>

          <UpgradePreview :feature="featured" class="um-preview" />
        </template>

        <div v-if="featured.testimonial" class="um-testimonial">
          <span class="stars" aria-label="5 out of 5">★★★★★</span>
          <span class="quote">"{{ featured.testimonial.quote }}"</span>
          <span class="attr">— {{ featured.testimonial.author }}</span>
        </div>
      </section>
    </div>

    <footer class="um-footer">
      <UpsellButtons />
    </footer>

    <div class="um-lifetime">
      <i class="material-icons">all_inclusive</i>
      <span v-tooltip="'Pay for 12 months to get lifetime access to any version of Beekeeper Studio released during your subscription period.'"><strong>Lifetime license.</strong>&nbsp;Included as part of every subscription.*</span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import UpsellButtons from './common/UpsellButtons.vue'
import UpgradePreview from './UpgradePreview.vue'
import { FEATURES, Feature } from './upgrade-features'

export default Vue.extend({
  components: { UpsellButtons, UpgradePreview },
  props: {
    triggerFeature: { type: String as PropType<string | null>, default: null },
    customTitle: { type: String as PropType<string | null>, default: null },
    message: { type: String as PropType<string | null>, default: null },
    inTab: { type: Boolean, default: false },
    closable: { type: Boolean, default: false }
  },
  data() {
    return {
      features: FEATURES,
      active: this.initialActive(),
    }
  },
  computed: {
    featured(): Feature {
      return this.features.find((f) => f.id === this.active) || this.features[0]
    },
    triggered(): Feature | null {
      if (!this.triggerFeature) return null
      return this.features.find((f) => f.id === this.triggerFeature) || null
    },
    overviewFeatures(): Feature[] {
      return this.features.filter((f) => f.id !== 'overview')
    }
  },
  watch: {
    // When the parent flips the trigger (e.g. the modal is re-opened from a
    // different call site), jump to the matching feature.
    triggerFeature() {
      this.active = this.initialActive()
    }
  },
  methods: {
    initialActive(): string {
      if (this.triggerFeature && FEATURES.some((f) => f.id === this.triggerFeature)) {
        return this.triggerFeature
      }
      return 'overview'
    }
  }
})
</script>
