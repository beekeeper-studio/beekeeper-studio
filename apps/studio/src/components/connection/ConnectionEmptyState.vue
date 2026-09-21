<template>
  <div class="connection-empty-state">
    <div class="welcome">
      <img
        class="welcome-logo"
        src="@/assets/logo.svg"
        alt=""
      >
      <h3>Welcome to Beekeeper Studio</h3>
      <p class="welcome-subtitle">
        Add a connection to get started, or import one from a URL.
      </p>
      <div class="actions">
        <button
          class="btn btn-primary"
          @click="$emit('create')"
        >
          <i class="material-icons">add</i>
          New Connection
        </button>
        <ImportButton
          :config="config"
          variant="flat"
        >
          Import from URL
        </ImportButton>
      </div>
    </div>

    <div
      class="info-card"
      v-if="showUpdate"
    >
      <i class="material-icons info-icon update">system_update_alt</i>
      <div class="info-body">
        <div class="info-label">
          {{ update.label }}
        </div>
        <div class="info-title">
          {{ update.title }}
        </div>
        <div class="info-text">
          {{ update.body }}
        </div>
        <div class="info-actions">
          <button
            v-if="update.action"
            class="btn btn-primary btn-small"
            @click="update.action.run"
          >
            {{ update.action.label }}
          </button>
          <a
            class="info-link"
            :href="releasesUrl"
          >What's new</a>
        </div>
      </div>
      <span
        class="info-btn dismiss"
        title="Dismiss"
        @click="dismissUpdate"
      >
        <i class="material-icons">clear</i>
      </span>
    </div>

    <div
      class="info-card"
      v-else-if="showTip"
    >
      <i class="material-icons-outlined info-icon">lightbulb</i>
      <div class="info-body">
        <div class="info-label">
          Have you tried
        </div>
        <div class="info-title">
          {{ tip.title }}
        </div>
        <div class="info-text">
          {{ tip.body }}
        </div>
        <a
          class="info-link learn-more"
          :href="tip.href"
        >Learn more</a>
      </div>
      <div class="info-btns">
        <span
          class="info-btn"
          title="Previous tip"
          @click="previousTip"
        >
          <i class="material-icons">chevron_left</i>
        </span>
        <span
          class="info-btn"
          title="Next tip"
          @click="nextTip"
        >
          <i class="material-icons">chevron_right</i>
        </span>
        <span
          class="info-btn dismiss"
          title="Hide tips"
          @click="hideTips"
        >
          <i class="material-icons">clear</i>
        </span>
      </div>
    </div>

    <div
      class="trial-warning"
      v-if="showTrialWarning"
    >
      <i class="material-icons">schedule</i>
      <span>
        <strong>Trial expires {{ trialExpiry }}.</strong>
        <a href="https://beekeeperstudio.io/pricing">Upgrade</a> to keep paid features.
      </span>
    </div>

    <div
      class="brand-fact"
      v-else-if="fact"
    >
      <span>{{ fact.text }} </span>
      <a :href="fact.href">{{ fact.link }}</a>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import ImportButton from './ImportButton.vue'
import { SmartLocalStorage } from '@/common/LocalStorage'
import { WelcomeTip, WelcomeTips } from '@/common/welcomeTips'

const TIPS_HIDDEN_KEY = 'connectionTipsHidden'
/** How close to the end of a trial before the fact makes way for a warning. */
const TRIAL_WARNING_DAYS = 7
const ONE_DAY = 24 * 60 * 60 * 1000

export default Vue.extend({
  name: 'ConnectionEmptyState',
  components: { ImportButton },
  props: {
    config: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      // One tip per launch: where the rotation starts is random, and the
      // arrows take it from there.
      tipIndex: Math.floor(Math.random() * WelcomeTips.length),
      tipsHidden: SmartLocalStorage.getBool(TIPS_HIDDEN_KEY),
      releasesUrl: 'https://www.beekeeperstudio.io/releases/latest',
    }
  },
  computed: {
    ...mapGetters(['isUltimate']),
    ...mapGetters('licenses', ['isTrial', 'trialLicense']),
    ...mapGetters('updates', { updatePending: 'pending' }),
    ...mapState('updates', { updateStage: 'stage', updateVersion: 'version' }),

    showUpdate(): boolean {
      return this.updatePending
    },
    showTip(): boolean {
      // An update is the more useful thing to say, so it takes the slot.
      return !this.showUpdate && !this.tipsHidden
    },
    tip(): WelcomeTip {
      return WelcomeTips[this.tipIndex % WelcomeTips.length]
    },
    versionName(): string {
      return this.updateVersion ? `Version ${this.updateVersion}` : 'A new version'
    },
    update(): { label: string; title: string; body: string; action?: { label: string; run: () => void } } {
      switch (this.updateStage) {
        case 'manual':
          return {
            label: 'Update available',
            title: `${this.versionName} is available`,
            body: "This build can't update itself. Download the new version from the website.",
            action: { label: 'Download', run: this.openDownloadPage },
          }
        case 'downloading':
          return {
            label: 'Update available',
            title: `${this.versionName} is downloading`,
            body: 'It installs the next time Beekeeper Studio restarts.',
          }
        case 'downloaded':
          return {
            label: 'Update ready',
            title: `${this.versionName} is ready to install`,
            body: 'Restart Beekeeper Studio to finish installing.',
            action: { label: 'Restart now', run: this.installUpdate },
          }
        default:
          return {
            label: 'Update available',
            title: `${this.versionName} is available`,
            body: 'Download it now, install it whenever you restart.',
            action: { label: 'Download update', run: this.downloadUpdate },
          }
      }
    },

    isLicensed(): boolean {
      return this.isUltimate && !this.isTrial
    },
    trialDaysLeft(): number | null {
      const validUntil = this.trialLicense?.validUntil
      if (!validUntil) return null
      return Math.round((new Date(validUntil).getTime() - Date.now()) / ONE_DAY)
    },
    trialExpiry(): string | null {
      const validUntil = this.trialLicense?.validUntil
      if (!validUntil) return null
      return this.$bks.timeAgo(new Date(validUntil))
    },
    showTrialWarning(): boolean {
      return this.isTrial && this.trialDaysLeft !== null && this.trialDaysLeft <= TRIAL_WARNING_DAYS
    },
    fact(): { text: string; link: string; href: string } | null {
      if (this.isLicensed) return null
      if (this.isTrial) {
        const ends = this.trialExpiry ? `Trial ends ${this.trialExpiry}. ` : ''
        return {
          text: `${ends}Licenses fund a small bootstrapped team, no investors.`,
          link: 'See what a license covers',
          href: 'https://beekeeperstudio.io/pricing',
        }
      }
      return {
        text: 'The free Community Edition is supported entirely by purchases of the paid editions.',
        link: 'Buy a license today',
        href: 'https://beekeeperstudio.io/pricing',
      }
    },
  },
  methods: {
    nextTip() {
      this.tipIndex = (this.tipIndex + 1) % WelcomeTips.length
    },
    previousTip() {
      this.tipIndex = (this.tipIndex - 1 + WelcomeTips.length) % WelcomeTips.length
    },
    hideTips() {
      this.tipsHidden = true
      SmartLocalStorage.setBool(TIPS_HIDDEN_KEY, true)
    },
    downloadUpdate() {
      this.$store.dispatch('updates/download')
    },
    installUpdate() {
      this.$store.dispatch('updates/install')
    },
    dismissUpdate() {
      this.$store.dispatch('updates/dismiss')
    },
    openDownloadPage() {
      window.main.openExternally('https://beekeeperstudio.io/get')
    },
  },
})
</script>

<style scoped lang="scss">
// Theme colors come through CSS custom properties, not the Sass variables:
// those are compiled per theme, so a scoped block would freeze one theme's
// values and break the others.
.connection-empty-state {
  // An explicit width, not a max-width: the column that holds this shrinks to
  // fit its content, so the cards would otherwise be as wide as their longest
  // line of copy.
  width: 440px;
  max-width: 100%;
  margin: 0 auto;
  padding: 2rem 0;
}

.welcome {
  text-align: center;

  h3 {
    font-weight: 600;
    color: var(--text-dark);
    margin: 0 0 0.4rem;
  }

  .welcome-subtitle {
    margin: 0 0 1.2rem;
    font-size: 13px;
    color: var(--text);
  }

  .actions {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
  }
}

.welcome-logo {
  display: block;
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
}

.info-card {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  margin-top: 1.6rem;
  padding: 0.8rem 0.9rem;
  border-radius: 8px;
  background: rgb(from var(--theme-base) r g b / 3.5%);
  box-shadow: inset 0 0 0 1px var(--border-color);
  text-align: left;

  .info-icon {
    font-size: 18px;
    line-height: 1;
    margin-top: 2px;
    color: var(--text-lighter);

    &.update {
      color: var(--theme-primary);
    }
  }

  .info-body {
    flex-grow: 1;
    min-width: 0;
  }

  .info-label {
    font-weight: bold;
    text-transform: uppercase;
    font-size: 0.7rem;
    color: var(--text-dark);
    margin-bottom: 0.2rem;
  }

  .info-title {
    font-size: 13px;
    line-height: 1.4;
    color: var(--text-dark);
  }

  .info-text {
    font-size: 0.85rem;
    line-height: 1.35;
    margin-top: 0.1rem;
    color: var(--text);
  }

  .info-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.7rem;

    .btn {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }

  .info-link {
    font-size: 0.85rem;
    white-space: nowrap;
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: var(--text-dark);
    }

    &.learn-more {
      display: inline-block;
      margin-top: 0.5rem;
    }
  }

  .info-btns {
    display: flex;
    align-items: center;
    gap: 0.1rem;
    flex-shrink: 0;
  }

  .info-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    width: 22px;
    min-width: 22px;
    border-radius: 22px;
    cursor: pointer;
    transition: background 0.15s ease-in-out;

    .material-icons {
      font-size: 18px;
      color: var(--text-lighter);
    }

    // A cross reads heavier than a chevron, so it sits a size smaller
    &.dismiss .material-icons {
      font-size: 14px;
    }

    &:hover {
      background: rgb(from var(--theme-base) r g b / 10%);
    }
  }
}

.trial-warning {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 1.2rem;
  font-size: 0.85rem;
  line-height: 1.4;
  color: var(--text);

  .material-icons {
    font-size: 16px;
    color: var(--brand-warning);
  }

  strong {
    font-weight: 600;
    color: var(--text-dark);
  }

  a {
    color: var(--theme-primary);

    &:hover {
      text-decoration: underline;
    }
  }
}

.brand-fact {
  margin-top: 1.2rem;
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text);
  text-wrap: pretty;

  a {
    color: var(--text-dark);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}
</style>
