<template>
  <base-modal
    :name="modalName"
    first-focusable="input[name='theme-mode']:checked"
  >
    <template #title>Appearance</template>
    <fieldset class="theme-mode">
      <legend>Mode</legend>
      <span class="mode-options">
        <label class="mode-option">
          <input
            type="radio"
            name="theme-mode"
            class="visually-hidden"
            value="light"
            :checked="themeAppearance === 'light'"
            @change="setThemeDark('light')"
          >
          <span class="mode-option-content">Light</span>
        </label>
        <label class="mode-option">
          <input
            type="radio"
            name="theme-mode"
            class="visually-hidden"
            value="dark"
            :checked="themeAppearance === 'dark'"
            @change="setThemeDark('dark')"
          >
          <span class="mode-option-content">Dark</span>
        </label>
        <label class="mode-option">
          <input
            type="radio"
            name="theme-mode"
            class="visually-hidden"
            value="auto"
            :checked="themeAppearance === 'auto'"
            @change="setThemeDark('auto')"
          >
          <span class="mode-option-content">Auto</span>
        </label>
      </span>
    </fieldset>
    <div class="form-group">
      <label>Theme</label>
      <div class="theme-list">
        <label
          v-for="theme in themes"
          :key="theme.id"
          class="theme-item"
          :class="{ selected: themeId === theme.id }"
        >
          <span class="theme-name checkbox-group">
            <input
              type="radio"
              name="theme-name"
              :value="theme.id"
              :checked="themeId === theme.id"
              @change="setThemeId(theme.id)"
            />
            <span>{{ theme.label }}</span>
          </span>
          <span class="theme-preview-frame">
            <theme-preview :theme-id="theme.id" :dark="themeDark" />
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
import ThemePreview from "@/components/common/ThemePreview.vue";

export default Vue.extend({
  components: { BaseModal, ThemePreview },
  data() {
    return {
      modalName: "appearance-modal",
    };
  },
  computed: {
    ...mapState("theme", ["themes"]),
    ...mapGetters({
      themeId: "theme/id",
      themeAppearance: "theme/appearance",
      themeDark: "theme/dark",
    }),
    rootBindings() {
      return [{ event: AppEvent.openAppearanceModal, handler: this.open }];
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
    setTimeout(() => {
      this.open()
    }, 1000)
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    ...mapActions("theme", {
      setThemeDark: "setDark",
      setThemeId: "setId",
    }),
    open() {
      this.$modal.show(this.modalName);
    },
  },
});
</script>

<style scoped lang="scss">
.theme-mode {
  min-width: 0;
  margin: 0.4rem 0 0.2rem;
  padding: 0;
  border: 0;

  legend {
    font-size: 0.831rem;
    line-height: 1.5;
    padding: 0 0.2rem;
    margin-bottom: 2px;
  }
}

.mode-options {
  display: flex;
  align-items: center;
  width: fit-content;
}

.mode-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 0.25rem;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.15rem;
  color: var(--btn-fg);
  background: var(--btn-flat-bg);
  cursor: pointer;
  transition: background 0.15s ease-in-out, color 0.15s ease-in-out;

  &:hover {
    color: var(--btn-flat-fg-hover);
  }

  &:first-child {
    border-start-start-radius: 8px;
    border-end-start-radius: 8px;
  }

  &:last-child {
    border-start-end-radius: 8px;
    border-end-end-radius: 8px;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
    box-shadow: none;
  }


  .mode-option-content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.0325rem 0.75rem;
    border-radius: 8px;
  }

  input:checked + .mode-option-content {
    color: var(--text-contrast);
    background: var(--bg-active-a);
  }

  input:focus-visible + .mode-option-content {
    outline: var(--focus-ring);
  }
}

.theme-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding-bottom: 0.5rem;
}

.form-group label.theme-item {
  display: flex;
  flex-direction: column;
  padding: 0;
  cursor: pointer;
  align-items: flex-start;

  .theme-preview-frame {
    overflow: hidden;
    border-radius: 4px;
    border: 1px solid var(--border-subtle);
    border-radius: 4px;
  }

  &.selected .theme-preview-frame {
    border-color: var(--border-active);
  }

  &:has(input:focus-visible) .theme-preview-frame {
    outline: var(--focus-ring);
  }

  .theme-name {
    padding-bottom: 0.35rem;
  }
}

.theme-preview-frame {
  width: 100%;
}
</style>
