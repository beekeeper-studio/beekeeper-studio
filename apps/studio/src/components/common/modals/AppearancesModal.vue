<template>
  <base-modal :name="modalName">
    <template #title>Appearances</template>
    <div class="form-group">
      <label for="theme-mode">Mode</label>
      <x-buttons class="selectbutton" id="theme-mode">
        <x-button
          :toggled="themeDark === 'false'"
          @click.prevent="setThemeDark('false')"
        >
          <span class="togglebutton-content">Light</span>
        </x-button>
        <x-button
          :toggled="themeDark === 'true'"
          @click.prevent="setThemeDark('true')"
        >
          <span class="togglebutton-content">Dark</span>
        </x-button>
        <x-button
          :toggled="themeDark === 'auto'"
          @click.prevent="setThemeDark('auto')"
        >
          <span class="togglebutton-content">Auto</span>
        </x-button>
      </x-buttons>
    </div>
    <div class="form-group">
      <label>Theme</label>
      <div class="theme-list">
        <label
          v-for="theme in themes"
          :key="theme.value"
          class="theme-item"
          :class="{ selected: themeName === theme.value }"
        >
          <span
            class="theme-preview"
            :data-theme="theme.value"
            :data-theme-dark="themeType === 'dark'"
          >
            <span style="background-color: var(--theme-base)" />
            <span style="background-color: var(--theme-bg)" />
            <span style="background-color: var(--theme-primary)" />
            <span style="background-color: var(--theme-secondary)" />
          </span>
          <span class="theme-name checkbox-group">
            <input
              type="radio"
              name="theme-name"
              :value="theme.value"
              :checked="themeName === theme.value"
              @change="setThemeName(theme.value)"
            />
            <span>{{ theme.label }}</span>
          </span>
        </label>
      </div>
    </div>
  </base-modal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapActions, mapGetters, mapState } from "vuex";
import { AppEvent } from "@/common/AppEvent";
import BaseModal from "@/components/common/modals/BaseModal.vue";

export default Vue.extend({
  components: { BaseModal },
  data() {
    return {
      modalName: "appearances-modal",
    };
  },
  computed: {
    ...mapState("theme", ["themes"]),
    ...mapGetters({
      themeName: "theme/name",
      themeType: "theme/type",
      settings: "settings/settings",
    }),
    rootBindings() {
      return [{ event: AppEvent.openAppearancesModal, handler: this.open }];
    },
    themeDark() {
      return this.settings.themeDark?.value || "auto";
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    ...mapActions("settings", { saveSetting: "save" }),
    open() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    setThemeDark(value: string) {
      this.saveSetting({ key: "themeDark", value });
    },
    setThemeName(value: string) {
      this.saveSetting({ key: "themeName", value });
    },
  },
});
</script>

<style scoped lang="scss">
.theme-list {
  display: flex;
  gap: 1rem;
  padding-bottom: 0.5rem;
}

.form-group label.theme-item {
  display: flex;
  flex-direction: column;
  width: 10rem;
  padding: 0;
  border: 2px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;

  &.selected {
    border-color: var(--theme-primary);
  }

  .theme-name {
    width: 100%;
    padding-block: 0.75rem;
    padding-inline: 0.5rem;

    span {
      font-size: 0.831rem;
    }

    input[type="radio"] {
      display: none;
    }
  }
}


.theme-preview {
  display: flex;
  width: 100%;
  height: 5rem;

  > * {
    width: 25%;
    height: 100%;
  }
}
</style>
