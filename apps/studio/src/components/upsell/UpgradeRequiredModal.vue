<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal upgrade-modal"
      name="upgrade-modal"
      height="auto"
      :width="modalWidth"
    >
      <div
        class="dialog-content upgrade-modal-redesign"
        v-kbd-trap="true"
      >
        <header class="um-header">
          <img class="um-logo" src="@/assets/logo.svg" alt="Beekeeper Studio">
          <div class="um-header-text">
            <div class="um-eyebrow" :class="{ 'um-eyebrow-trigger': !!triggered }">
              <template v-if="triggered">
                <i class="material-icons">lock</i>
                Ultimate feature
              </template>
              <template v-else>
                Beekeeper Studio
              </template>
            </div>
            <h2 class="um-title">
              <template v-if="triggered">Unlock {{ triggered.triggerTitle || triggered.title }}</template>
              <template v-else>Upgrade to unlock these awesome features</template>
            </h2>
            <p v-if="triggered" class="um-subline">
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

            <ul class="um-bullets">
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

            <figure v-if="featured.testimonial" class="um-quote">
              <span aria-hidden="true" class="um-quote-mark" :style="{ color: featured.color }">“</span>
              <blockquote>{{ featured.testimonial.quote }}</blockquote>
              <figcaption>— <span>{{ featured.testimonial.author }}</span></figcaption>
            </figure>
          </section>
        </div>

        <footer class="um-footer">
          <UpsellButtons />
        </footer>
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
interface Feature {
  id: string
  icon: string
  color: string
  title: string
  triggerTitle?: string
  short: string
  bullets: string[]
  testimonial?: Testimonial
}

const FEATURES: Feature[] = [
  {
    id: 'workspaces',
    icon: 'cloud',
    color: 'var(--theme-secondary)',
    title: 'Cloud Workspaces',
    triggerTitle: 'Cloud Workspaces',
    short: 'Sync connections & saved queries across devices. Share a Team folder with the rest of your team.',
    bullets: ['Personal & Team folders', 'Sync across all your machines', 'Encrypted at rest & in transit'],
    testimonial: {
      quote: "The cloud workspace feature that lets me save my connections in different 'Teams' is actually huge — something almost no competitor has.",
      author: 'Craig'
    }
  },
  {
    id: 'enterprise',
    icon: 'verified_user',
    color: 'var(--brand-success)',
    title: 'Enterprise connectivity',
    triggerTitle: 'Enterprise Connectivity',
    short: 'Passwordless cloud auth — AWS IAM, Azure Entra ID, AWS/Azure CLI — plus 7 extra databases including Oracle, Cassandra, ClickHouse, DuckDB, Firebird, LibSQL, and ScyllaDB.',
    bullets: [
      'AWS IAM & Azure Entra ID web SSO',
      'AWS CLI & Azure CLI generated credentials',
      'Oracle, Cassandra, ClickHouse, DuckDB, Firebird, LibSQL, ScyllaDB'
    ],
    testimonial: {
      quote: 'Beekeeper Studio feels like it was built by developers who actually use database tools. I used to juggle between DBeaver and Prisma Studio — now Beekeeper handles everything in one clean workspace.',
      author: 'Saqib Hussain, Founder, Devinspect'
    }
  },
  {
    id: 'ai',
    icon: 'auto_awesome',
    color: 'var(--brand-pink)',
    title: 'SQL AI Shell',
    triggerTitle: 'SQL AI Shell',
    short: 'Explore data with the AI agent you already use. Bring your own model — no usage fees, no middlemen, runs on your machine.',
    bullets: ['Claude, OpenAI, Gemini, or local', 'Asks before running SQL', 'Source code on GitHub'],
    testimonial: {
      quote: 'The user interface is exceptionally clear and user-friendly. The AI feature is highly beneficial. Overall, I am thoroughly satisfied with the application.',
      author: 'Özer Özdaş, Founder, Nuvo Code'
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
      quote: "The recently added 'JSON view' feature solved my biggest problem of rows being hard to read — with this, it is a simple JSON to look at.",
      author: 'Pixeluted, Self Employed @ Pixeluted LLC'
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
      quote: 'Beekeeper Studio is hands down one of the best SQL clients I’ve used. The tabbed interface, autocomplete, and instant results preview save so much time in daily tasks.',
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
      quote: 'It just works, no fuss at all. Imports and exports, especially, work flawlessly.',
      author: 'Nahabi Wandera, Technologist, The TG Foundry'
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
      quote: "It's a small detail, but it saves so much time and keeps your workflow fast and focused. Beekeeper Studio just works.",
      author: 'Porya Ras, Backend Dev at Careberry'
    }
  }
]

// Keyword map: lets existing call sites (which only pass a string) still
// surface the most relevant feature. Order matters — first match wins.
const MESSAGE_FEATURE_MATCHERS: { match: RegExp; feature: string }[] = [
  { match: /authentication/i, feature: 'enterprise' },
  { match: /folder|organize/i, feature: 'organize' },
  { match: /edit query result/i, feature: 'editable' },
  { match: /filter/i, feature: 'editable' },
  { match: /workspace|cloud/i, feature: 'workspaces' },
  { match: /export|import|backup/i, feature: 'io' },
  { match: /ai|llm/i, feature: 'ai' },
  { match: /json/i, feature: 'json' }
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
      triggerFeature: null as string | null,
      active: 'workspaces',
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
    previewComponent() {
      return UpgradePreview
    }
  },
  methods: {
    showModal(payload?: string | { message?: string; feature?: string }) {
      if (!this.$store.getters.isCommunity) return

      let message: string | null = null
      let feature: string | null = null
      if (typeof payload === 'string') {
        message = payload
        feature = inferFeature(payload)
      } else if (payload && typeof payload === 'object') {
        message = payload.message ?? null
        feature = payload.feature ?? inferFeature(message)
      }

      this.message = message
      this.triggerFeature = feature
      this.active = feature || 'workspaces'
      this.$modal.show('upgrade-modal')
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
