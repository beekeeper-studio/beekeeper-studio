<template>
  <base-modal name="upgrade-modal-v2">
    <template #title>
      <div class="modal-header">
        <div class="eyebrow">Beekeeper Studio</div>
        <h2 class="heading">Upgrade to unlock these awesome features</h2>
      </div>
    </template>
    <template #default>
      <div class="beekeeper-modal upgrade-modal">
        <carousel>
          <carousel-slide>
            <section class="upsell-section">
              <div class="upsell-content">
                <div class="title">Organize your stuff</div>
                <div class="description">Better organization, folders, subfolders, pinned items</div>
                <div class="preview">
                  <upgrade-preview class="um-preview" :feature="{ id: 'organize', color: 'var(--brand-purple)' }" />
                </div>
              </div>
              <div class="upsell-content">
                <div class="title">Visualize your schema</div>
                <div class="description">Better visualization, ER diagrams across schemas</div>
                <div class="preview">
                  <upgrade-preview class="um-preview" :feature="{ id: 'erd', color: 'var(--brand-info)' }" />
                </div>
              </div>
            </section>
          </carousel-slide>
          <carousel-slide>
            <section class="upsell-content">
              <div class="title">Analyze with AI</div>
              <div class="description">Better analysis, SQL AI Shell — bring your own model</div>
              <div class="preview">
                <upgrade-preview class="um-preview" :feature="{ id: 'ai', color: 'var(--brand-pink)' }" />
              </div>
            </section>
          </carousel-slide>
          <carousel-slide>
            <section class="upsell-content">
              <div class="title">Sync across devices</div>
              <div class="description">Better collaboration, cloud &amp; team workspaces, synced across devices</div>
              <div class="preview">
                <upgrade-preview class="um-preview" :feature="{ id: 'workspaces', color: 'var(--theme-secondary)' }" />
              </div>
            </section>
          </carousel-slide>
          <carousel-slide>
            <section class="upsell-content">
              <div class="title">Connect to anything</div>
              <div class="description">Better connectivity, AWS/Azure SSO, Oracle, MongoDB, +6 more databases</div>
              <div class="preview">
                <upgrade-preview class="um-preview" :feature="{ id: 'enterprise', color: 'var(--brand-success)' }" />
              </div>
            </section>
          </carousel-slide>
          <carousel-slide>
            <section class="upsell-content">
              <div class="title">Edit on the fly</div>
              <div class="description">Better data handling, editable results, JSON sidebar, import/export</div>
              <div class="preview">
                <upgrade-preview class="um-preview" :feature="{ id: 'editable', color: 'var(--theme-primary)' }" />
              </div>
            </section>
          </carousel-slide>
        </carousel>
      </div>
    </template>
    <template #footer>
      <upsell-buttons />
    </template>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import Carousel from "@/components/common/carousel/Carousel.vue";
import CarouselSlide from "@/components/common/carousel/CarouselSlide.vue";
import UpgradePreview from "./UpgradePreview.vue";
import UpsellButtons from "./common/UpsellButtons.vue";

export default Vue.extend({
  name: "upgrade-required-modal-v2",
  components: {
    BaseModal,
    Carousel,
    CarouselSlide,
    UpgradePreview,
    UpsellButtons,
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.upgradeModal, handler: this.showModal }];
    },
  },
  methods: {
    showModal() {
      this.$modal.show("upgrade-modal-v2");
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
});
</script>

<style scoped>
.carousel-image {
  width: 100%;
  height: auto;
  display: block;
}

.upsell-section {
  display: flex;
}

.upsell-content {
  flex-basis: 50%;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.description {
  margin-bottom: 1rem;
}

.preview {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-header {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-light);
}

.heading {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-dark);
}
</style>
