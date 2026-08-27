<template>
  <div
    class="upgrade-panel"
    :class="{ 'upgrade-panel--standalone': standalone, 'upgrade-panel--wide': wide }"
  >
    <div class="upgrade-modal-scroll">
      <!-- Header -->
      <div class="upgrade-modal-header">
        <img class="bk-badge" :src="logoUrl" alt="Beekeeper Studio">
        <div class="title-block" :class="{ triggered }">
          <div v-if="triggered" class="eyebrow">
            <i class="material-icons">lock</i>
            <span>UPGRADE REQUIRED</span>
          </div>
          <h2 class="title">
            {{ headingText }}
          </h2>
        </div>
      </div>
      <p v-if="triggered" class="subtitle">
        … plus a bunch of other intuitive and useful features.
      </p>

      <slot />

      <!-- What you unlock -->
      <div v-if="showFeatures" class="unlock-section">
        <div class="section-label">WHAT YOU UNLOCK BY UPGRADING</div>
        <ul class="unlock-list">
          <li
            v-for="item in unlockList"
            :key="item.id"
            class="unlock-item"
          >
            <i
              class="material-icons unlock-icon"
              :style="{ color: item.color }"
            >{{ item.icon }}</i>
            <div class="unlock-text">
              <strong class="unlock-title">{{ item.title }}</strong>
              <span v-if="item.blurb" class="unlock-blurb">{{ item.blurb }}</span>
            </div>
          </li>
          <li class="unlock-more">
            <span>…and much, much more</span>
            <a
              href="#"
              @click.prevent="learnMore"
            >
              see the full list <i class="material-icons">arrow_forward</i>
            </a>
          </li>
        </ul>
      </div>

      <!-- Testimonial -->
      <figure class="testimonial">
        <div class="avatar">MK</div>
        <div class="testimonial-body">
          <blockquote>
            “By far the most user-friendly DB GUI out there. Our whole team bought a license.”
          </blockquote>
          <figcaption>
            <span class="author">Matt K</span>
            <span class="sep">·</span>
            <span class="role">Engineering Lead, MinnHealth</span>
          </figcaption>
        </div>
      </figure>

      <!-- CTAs -->
      <div class="cta-row">
        <div class="actions">
          <button
            class="btn btn-flat"
            @click.prevent="startTrial"
          >Start Free Trial</button>
          <button
            class="btn btn-primary"
            @click.prevent="buyLicense"
          >Upgrade</button>
        </div>
      </div>
    </div>

    <!-- Lifetime license footer band -->
    <div class="lifetime-footer" v-tooltip="'Subscribe for 12+ months and get lifetime access to any version released within your subscription period.'">
      <i class="material-icons">all_inclusive</i>
      <span>
        <strong>Lifetime license</strong> - included as part of every subscription.*
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import logoUrl from '@/assets/logo.svg'
import { AppEvent } from '@/common/AppEvent'

const PRICING_URL = 'https://www.beekeeperstudio.io/pricing'
const UPGRADE_URL = 'https://www.beekeeperstudio.io/upgrade'

const CORE_FEATURES = [
  {
    id: 'ai',
    title: 'SQL AI Shell',
    blurb: 'Bring your own model; Claude, OpenAI, Gemini, or local.',
    icon: 'auto_awesome',
    color: '#ff78f7'
  },
  {
    id: 'json',
    title: 'JSON Sidebar',
    blurb: 'View any row as JSON and expand foreign keys inline.',
    icon: 'data_object',
    color: '#38bdf8'
  },
  {
    id: 'organize',
    title: 'Folders',
    blurb: 'Folders, drag-and-drop reordering, color coding.',
    icon: 'folder',
    color: '#94a3b8'
  },
  {
    id: 'workspaces',
    title: 'Cloud Workspaces',
    blurb: 'Sync connections across devices, share a Team folder.',
    icon: 'cloud',
    color: '#38bdf8'
  }
] as const

export default Vue.extend({
  props: {
    featureName: {
      type: String,
      default: null
    },
    title: {
      type: String,
      default: null
    },
    showFeatures: {
      type: Boolean,
      default: true
    },
    standalone: {
      type: Boolean,
      default: false
    },
    wide: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      logoUrl
    }
  },
  computed: {
    triggered(): boolean {
      return !!this.featureName || !!this.title
    },
    headingText(): string {
      if (this.title) return this.title
      if (this.featureName) return `Unlock ${this.featureName}`
      return 'Upgrade Beekeeper Studio'
    },
    unlockList(): Array<{ id: string, title: string, blurb?: string, icon: string, color: string }> {
      if (this.featureName) {
        const featureId = this.featureName.toLowerCase().replace(/[^a-z0-9]/g, '')
        const matchingCore = CORE_FEATURES.find(
          (f) => f.title.toLowerCase() === this.featureName!.toLowerCase()
        )

        const topItem = {
          id: matchingCore ? matchingCore.id : `featured-${featureId}`,
          title: this.featureName,
          blurb: matchingCore ? matchingCore.blurb : undefined,
          icon: 'workspace_premium',
          color: '#f5c518'
        }

        const rest = CORE_FEATURES.filter(
          (f) => f.title.toLowerCase() !== this.featureName!.toLowerCase()
        )

        return [topItem, ...rest]
      }

      return [...CORE_FEATURES]
    }
  },
  methods: {
    startTrial() {
      this.$store.dispatch('licenses/add', { trial: true })
      this.$emit('started-trial')
    },
    buyLicense() {
      this.$native.openLink(PRICING_URL)
      this.$root.$emit(AppEvent.enterLicense)
    },
    learnMore() {
      this.$native.openLink(UPGRADE_URL)
    }
  }
})
</script>
