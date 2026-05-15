<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal upgrade-modal"
      name="upgrade-modal"
      height="auto"
      :width="modalWidth"
      @opened="onOpened"
      @closed="onClosed"
    >
      <div
        class="dialog-content upgrade-modal-redesign"
        v-kbd-trap="true"
      >
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
            class="um-close"
            href="#"
            aria-label="Close"
            @click.prevent="$modal.hide('upgrade-modal')"
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

              <component
                :is="previewComponent"
                :feature="featured"
                class="um-preview"
              />
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
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
import UpsellButtons from '../upsell/common/UpsellButtons.vue'
import UpgradePreview from './UpgradePreview.vue'

interface Testimonial { quote: string; author: string }
interface Pill { icon: string; label: string; tooltip?: string }
interface Feature {
  id: string
  icon: string
  color: string
  title: string
  triggerTitle?: string
  short: string
  bullets?: string[]
  pills?: Pill[]
  testimonial?: Testimonial
}

const FEATURES: Feature[] = [
  {
    id: 'overview',
    icon: 'workspace_premium',
    color: 'var(--theme-primary)',
    title: 'Why Upgrade',
    triggerTitle: 'Beekeeper Studio Ultimate',
    short: 'Unlock a suite of intuitive powertools that are super fun to use and will save you a bunch of time and effort. Did we mention every purchase comes with a *lifetime usage* license?',
    testimonial: {
      quote: 'By far the most user-friendly DB GUI out there. Our whole team bought a license.',
      author: 'Matt K · MinnHealth'
    }
  },
  {
    id: 'workspaces',
    icon: 'cloud',
    color: 'var(--theme-secondary)',
    title: 'Cloud Workspaces',
    triggerTitle: 'Cloud Workspaces',
    short: 'Sync connections & saved queries across devices. Share a Team folder with the rest of your team.',
    bullets: ['Personal & Team folders', 'Sync across all your machines', 'Encrypted at rest & in transit'],
    testimonial: {
      quote: "Cloud workspaces let me save connections per team — almost no competitor has it.",
      author: 'Craig'
    }
  },
  {
    id: 'enterprise',
    icon: 'verified_user',
    color: 'var(--brand-success)',
    title: 'Enterprise connectivity',
    triggerTitle: 'Enterprise Connectivity',
    short: 'Passwordless cloud auth — AWS IAM, Azure Entra ID, AWS/Azure CLI — plus paid-edition databases including MongoDB, Oracle, Cassandra, ClickHouse, DuckDB, DynamoDB, Snowflake, Trino, and more.',
    bullets: [
      'AWS IAM & Azure Entra ID web SSO',
      'AWS CLI & Azure CLI generated credentials',
      'Oracle, Cassandra, ClickHouse, DuckDB, Firebird, LibSQL, ScyllaDB'
    ],
    testimonial: {
      quote: 'Beekeeper handles everything in one clean workspace.',
      author: 'Saqib Hussain, Devinspect'
    }
  },
  {
    id: 'ai',
    icon: 'auto_awesome',
    color: 'var(--brand-pink)',
    title: 'SQL AI Shell',
    triggerTitle: 'SQL AI Shell',
    short: 'Explore data with the AI agent you already use. Bring your own model — no usage fees, no middlemen, runs on your machine.',
    testimonial: {
      quote: 'The AI feature is highly beneficial.',
      author: 'Özer Özdaş, Nuvo Code'
    }
  },
  {
    id: 'json',
    icon: 'data_object',
    color: 'var(--brand-secondary)',
    title: 'JSON Sidebar',
    triggerTitle: 'JSON Sidebar',
    short: 'View any row as structured JSON, expand foreign keys inline, and follow relationships across tables without leaving the row.',
    bullets: ['Nested FK expansion', 'Regex search across rows', 'Auto-formats JSON stored as text'],
    testimonial: {
      quote: 'JSON view solved my biggest problem of rows being hard to read.',
      author: 'Pixeluted, Pixeluted LLC'
    }
  },
  {
    id: 'editable',
    icon: 'edit_note',
    color: 'var(--theme-primary)',
    title: 'Editable query results',
    triggerTitle: 'Editable Query Results',
    short: "Fix a value straight from a SELECT — Beekeeper checks the SQL and maps each column back to its source table, so edits land in the right place.",
    bullets: ['Stage & review before commit', 'Works with manual commit mode', 'Same controls as table edits'],
    testimonial: {
      quote: 'Hands down one of the best SQL clients I’ve used.',
      author: 'Caio Mendes'
    }
  },
  {
    id: 'io',
    icon: 'sync_alt',
    color: 'var(--brand-warning)',
    title: 'Import, export, backup',
    triggerTitle: 'Import, Export & Backup',
    short: 'Multi-table export, streamed query exports for giant results, CSV import with smart column mapping, and native backup & restore.',
    bullets: ['Multi-table export', 'Stream query results to file', 'CSV import & native backup'],
    testimonial: {
      quote: 'Imports and exports work flawlessly. No fuss at all.',
      author: 'Nahabi Wandera, The TG Foundry'
    }
  },
  {
    id: 'organize',
    icon: 'folder',
    color: 'var(--brand-purple)',
    title: 'Stay organized',
    triggerTitle: 'Folders & Organization',
    short: 'Folders & subfolders for connections and saved queries, drag-and-drop reordering, and pinned items that stick across restarts.',
    bullets: ['Nested folders', 'Drag-and-drop reordering', 'Persistent pinned items'],
    testimonial: {
      quote: 'Beekeeper Studio just works — fast, focused, no fuss.',
      author: 'Porya Ras, Careberry'
    }
  },
  {
    id: 'erd',
    icon: 'schema',
    color: 'var(--brand-info)',
    title: 'ER Diagrams',
    triggerTitle: 'Entity Relationship Diagrams',
    short: 'Visualize your schema as an interactive diagram. See how tables connect — even across schemas — then export the layout as an image.',
    bullets: ['Cross-schema relationships', 'Open from sidebar or Tools menu', 'Export or copy as image'],
    testimonial: {
      quote: 'I can finally see how the whole schema fits together at a glance.',
      author: 'Joe S, DBA'
    }
  }
]

// Keyword map: lets existing call sites (which only pass a string) still
// surface the most relevant feature. Order matters — first match wins.
const MESSAGE_FEATURE_MATCHERS: { match: RegExp; feature: string }[] = [
  { match: /authentication/i, feature: 'enterprise' },
  { match: /folder|organize/i, feature: 'organize' },
  { match: /edit query result/i, feature: 'editable' },
  { match: /workspace|cloud/i, feature: 'workspaces' },
  { match: /export|import|backup/i, feature: 'io' },
  { match: /ai|llm/i, feature: 'ai' },
  { match: /json/i, feature: 'json' },
  { match: /erd|diagram|entity relationship/i, feature: 'erd' }
]

function inferFeature(message?: string | null): string | null {
  if (!message) return null
  for (const m of MESSAGE_FEATURE_MATCHERS) {
    if (m.match.test(message)) return m.feature
  }
  return null
}

export default Vue.extend({
  components: { UpsellButtons, UpgradePreview },
  data() {
    return {
      features: FEATURES,
      message: null as string | null,
      customTitle: null as string | null,
      triggerFeature: null as string | null,
      active: 'overview',
      isOpen: false,
      modalWidth: 820,
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
    },
    previewComponent() {
      return UpgradePreview
    }
  },
  methods: {
    showModal(payload?: string | { message?: string; feature?: string; title?: string }) {
      if (!this.$store.getters.isCommunity) return

      let message: string | null = null
      let feature: string | null = null
      let title: string | null = null
      if (typeof payload === 'string') {
        message = payload
        feature = inferFeature(payload)
      } else if (payload && typeof payload === 'object') {
        message = payload.message ?? null
        feature = payload.feature ?? inferFeature(message)
        title = payload.title ?? null
      }

      this.message = message
      this.customTitle = title
      this.triggerFeature = feature
      this.active = feature || 'overview'
      this.$modal.show('upgrade-modal')
    },
    onOpened() {
      this.isOpen = true
      this.$root.$emit('upgradeModalOpened')
    },
    onClosed() {
      this.isOpen = false
      this.$root.$emit('upgradeModalClosed')
    },
    trapShortcuts(e: KeyboardEvent) {
      // Only trap while the modal is actually visible. The listener stays
      // attached for the lifetime of the component, so the open/closed flag
      // is what gates capture — much safer than adding/removing listeners
      // and risking a stuck listener if a close event ever doesn't fire.
      if (!this.isOpen) return
      // Escape is handled by vue-js-modal to close. Everything else with a
      // modifier (Ctrl/Cmd) gets swallowed so global tab shortcuts (Ctrl+Tab,
      // Ctrl+W, Ctrl+T, Ctrl+1..9, etc.) don't fire underneath the modal.
      if (e.key === 'Escape') return
      if (e.ctrlKey || e.metaKey) {
        e.stopImmediatePropagation()
      }
    }
  },
  mounted() {
    this.$root.$on(AppEvent.upgradeModal, this.showModal)
    document.addEventListener('keydown', this.trapShortcuts, true)
  },
  beforeDestroy() {
    this.$root.$off(AppEvent.upgradeModal, this.showModal)
    document.removeEventListener('keydown', this.trapShortcuts, true)
  }
})
</script>
