<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal upgrade-modal"
      name="upgrade-modal"
      height="auto"
      :width="modalWidth"
    >
      <div
        class="dialog-content upgrade-modal-content"
        v-kbd-trap="true"
      >
        <button
          class="close-btn btn btn-fab"
          @click.prevent="close"
          aria-label="Close"
          ref="closeButton"
        >
          <i class="material-icons">clear</i>
        </button>

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
                {{ triggered ? `Unlock ${featureName}` : 'Upgrade Beekeeper Studio' }}
              </h2>
            </div>
          </div>
          <p v-if="triggered" class="subtitle">
            … plus a bunch of other intuitive and useful features.
          </p>

          <!-- What you unlock -->
          <div class="unlock-section">
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
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
import logoUrl from '@/assets/logo.svg'

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
  data() {
    return {
      featureName: null as string | null,
      logoUrl,
      modalWidth: 620
    }
  },
  computed: {
    triggered(): boolean {
      return !!this.featureName
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
    showModal(featureName?: string | null) {
      if (this.$store.getters.isCommunity) {
        this.featureName = featureName || null
        this.$modal.show('upgrade-modal')
      }
    },
    close() {
      this.$modal.hide('upgrade-modal')
    },
    startTrial() {
      this.$store.dispatch('licenses/add', { trial: true })
      this.close()
    },
    buyLicense() {
      this.$native.openLink(PRICING_URL)
      this.$root.$emit(AppEvent.enterLicense)
      this.close()
    },
    learnMore() {
      this.$native.openLink(UPGRADE_URL)
    }
  },
  mounted() {
    this.$root.$on(AppEvent.upgradeModal, this.showModal)
  },
  beforeDestroy() {
    this.$root.$off(AppEvent.upgradeModal, this.showModal)
  }
})
</script>
