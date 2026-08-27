<template>
  <div class="ai-shell-upsell">
    <div class="compact-card">
      <div class="head-row">
        <div class="mark">
          <i class="material-icons">auto_awesome</i>
        </div>
        <div class="title-block">
          <div class="eyebrow">
            <i class="material-icons">lock</i>
            <span>UPGRADE REQUIRED</span>
          </div>
          <h1>Chat with your database</h1>
        </div>
      </div>
      <p class="lede">
        A SQL wingman that figures out your schema on its own, writes
        and runs queries, and uses the LLM you already pay for.
      </p>

      <ai-shell-preview />

      <ul class="pills" title="Claude, ChatGPT, Gemini, and even local models work great.">
        <li class="pill-row">
          <i class="material-icons">vpn_key</i>
          <span>Bring your own model</span>
        </li>
        <li class="pill-row" title="No proxies, no logging, no token fees. Beekeeper connects directly to your agent">
          <i class="material-icons">paid</i>
          <span>No usage fees or middlemen</span>
        </li>
        <li class="pill-row" title="The AI shell can safely explore your database without you having to worry if it will do something destructive">
          <i class="material-icons">verified_user</i>
          <span>Asks before it runs SQL</span>
        </li>
      </ul>

      <div class="testimonial">
        <span class="stars" aria-label="5 out of 5">★★★★★</span>
        <span class="quote">"The AI feature is highly beneficial."</span>
        <span class="attr">— Mehmet Özdaş, Nuvo Code</span>
      </div>

      <div class="cta-actions">
        <button class="btn btn-trial" @click.prevent="startTrial">
          Start Free Trial
        </button>
        <button class="btn btn-upgrade" @click.prevent="buyLicense">
          Upgrade
        </button>
      </div>

      <div class="lifetime-note">
        <i class="material-icons">all_inclusive</i>
        <span><strong>Lifetime license</strong> - included as part of every subscription.*</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import AiShellPreview from "./AiShellPreview.vue";
import { AppEvent } from "@/common/AppEvent";

const PRICING_URL = 'https://www.beekeeperstudio.io/pricing';

export default Vue.extend({
  components: { AiShellPreview },
  methods: {
    startTrial() {
      this.$store.dispatch('licenses/add', { trial: true });
      this.$emit('started-trial');
    },
    buyLicense() {
      this.$native.openLink(PRICING_URL);
      this.$root.$emit(AppEvent.enterLicense);
    }
  }
});
</script>
