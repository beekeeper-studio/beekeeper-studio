<template>
  <div class="erd-upsell">
    <div class="bg-glow" aria-hidden="true"></div>

    <div class="compact-card">
      <div class="head-row">
        <div class="mark">
          <i class="material-icons">schema</i>
        </div>
        <div class="title-block">
          <div class="eyebrow">
            <i class="material-icons">lock</i>
            <span>Upgrade required</span>
          </div>
          <h1>See your schema, at a glance</h1>
        </div>
      </div>
      <p class="lede">
        An auto-laid-out map of every table, key, and foreign-key
        relationship in your database. Pan, zoom, and focus on the
        corner of the model you actually care about.
      </p>

      <er-diagram-preview />

      <ul class="pills">
        <li class="pill-row">
          <i class="material-icons">auto_awesome_motion</i>
          <span>Auto-laid out</span>
        </li>
        <li class="pill-row">
          <i class="material-icons">key</i>
          <span>Follows your foreign keys</span>
        </li>
        <li class="pill-row">
          <i class="material-icons">file_download</i>
          <span>Export PNG &amp; SVG</span>
        </li>
      </ul>

      <div class="testimonial">
        <span class="stars" aria-label="5 out of 5">★★★★★</span>
        <span class="quote">"The ER diagram instantly made our 200-table monolith make sense."</span>
        <span class="attr">— Priya R., Staff Engineer</span>
      </div>

      <upsell-buttons class="erd-upsell-buttons" />

      <div class="lifetime-note">
        <i class="material-icons">all_inclusive</i>
        <span v-tooltip="'Pay for 12 months to get lifetime access to any version of Beekeeper Studio released during your subscription period.'"><strong>Lifetime license</strong> - included as part of every subscription.*</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import UpsellButtons from "./common/UpsellButtons.vue";
import ErDiagramPreview from "./ErDiagramPreview.vue";

export default Vue.extend({
  components: { UpsellButtons, ErDiagramPreview },
});
</script>
