<template>
  <div class="ai-shell-upsell">
    <div class="bg-glow" aria-hidden="true"></div>

    <div class="compact-card">
      <div class="head-row">
        <div class="mark">
          <i class="material-icons">auto_awesome</i>
        </div>
        <h1>Chat with your database</h1>
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

      <upsell-buttons class="ai-shell-upsell-buttons" />

      <div class="lifetime-note">
        <i class="material-icons">all_inclusive</i>
        <span v-tooltip="'Pay for 12 months to get lifetime access to any version of Beekeeper Studio released during your subscription period.'"><strong>Lifetime license.</strong>&nbsp;Included as part of every subscription.*</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import UpsellButtons from "./common/UpsellButtons.vue";
import AiShellPreview from "./AiShellPreview.vue";

export default Vue.extend({
  components: { UpsellButtons, AiShellPreview },
});
</script>
