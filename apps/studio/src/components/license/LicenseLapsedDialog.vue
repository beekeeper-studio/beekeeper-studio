<template>
  <div class="license-lapsed">
    <div class="dialog-content">
      <div class="dialog-c-title">
        {{ title }}
      </div>
      <p class="dialog-c-subtitle">
        <slot name="intro" />
      </p>
      <template v-if="usedFeatures.length">
        <p class="license-lapsed-heading">
          {{ featuresHeading }}
        </p>
        <ul class="license-lapsed-features">
          <li
            v-for="feature in visibleFeatures"
            :key="feature.id"
          >
            <i class="material-icons">lock</i>
            <span>{{ feature.displayLabel }}</span>
          </li>
          <li
            v-if="hiddenCount > 0"
            class="license-lapsed-more"
          >
            <i class="material-icons">more_horiz</i>
            <span>and {{ hiddenCount }} more</span>
          </li>
        </ul>
      </template>
      <p class="license-lapsed-fact">
        <i class="material-icons">info_outline</i>
        <span>
          Any plan paid for 12 months includes lifetime access to the versions released in that period.
          <a
            href="#"
            @click.prevent="openLifetimeDocs"
          >Details</a>
        </span>
      </p>
    </div>
    <div class="vue-dialog-buttons license-lapsed-buttons">
      <a
        href="#"
        class="license-lapsed-enter-key small"
        @click.prevent="$emit('enter-license')"
      >Have a key? Enter license</a>
      <span class="expand" />
      <button
        class="btn btn-flat"
        type="button"
        @click.prevent="$emit('dismiss')"
      >
        Continue with the free version
      </button>
      <button
        class="btn btn-flat"
        type="button"
        @click.prevent="$emit('request')"
      >
        Draft manager approval request
      </button>
      <button
        class="btn btn-primary"
        type="button"
        @click.prevent="$emit('buy')"
      >
        {{ buyLabel }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue, { PropType } from 'vue'
import { UsedPaidFeature } from '@/lib/paidFeatures'
import { LIFETIME_DOCS_URL } from '@/lib/approvalRequest'

const MAX_VISIBLE_FEATURES = 6

/**
 * Body shared by the "trial ended" and "license ended" dialogs: what changed,
 * which paid features this install actually used, and the three ways forward.
 */
export default Vue.extend({
  props: {
    title: {
      type: String,
      required: true,
    },
    usedFeatures: {
      type: Array as PropType<UsedPaidFeature[]>,
      default: () => [],
    },
    featuresHeading: {
      type: String,
      default: 'Paid features used during the trial, now locked:',
    },
    buyLabel: {
      type: String,
      default: 'Buy a license',
    },
  },
  computed: {
    visibleFeatures(): UsedPaidFeature[] {
      return this.usedFeatures.slice(0, MAX_VISIBLE_FEATURES)
    },
    hiddenCount(): number {
      return Math.max(0, this.usedFeatures.length - MAX_VISIBLE_FEATURES)
    },
  },
  methods: {
    openLifetimeDocs() {
      this.$native.openLink(LIFETIME_DOCS_URL)
    },
  },
})
</script>
