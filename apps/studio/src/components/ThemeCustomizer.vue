<template>
  <MountingPortal mount-to="body" append>
    <div class="theme-customizer-overlay" :class="`position-${position}`">
      <button class="menu-button" @click="openPositionMenu">
        <i class="material-icons">more_horiz</i>
      </button>
      <div class="form-group">
        <label for="tc-gray">Gray</label>
        <color-input
          id="tc-gray"
          :value="colors.gray"
          @input="setColor('gray', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-primary">Primary</label>
        <color-input
          id="tc-primary"
          :value="colors.primary"
          @input="setColor('primary', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-info">Info</label>
        <color-input
          id="tc-info"
          :value="colors.info"
          @input="setColor('info', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-success">Success</label>
        <color-input
          id="tc-success"
          :value="colors.success"
          @input="setColor('success', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-warning">Warning</label>
        <color-input
          id="tc-warning"
          :value="colors.warning"
          @input="setColor('warning', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-danger">Danger</label>
        <color-input
          id="tc-danger"
          :value="colors.danger"
          @input="setColor('danger', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-background">Background</label>
        <color-input
          id="tc-background"
          :value="colors.background"
          @input="setColor('background', $event)"
        />
      </div>
      <div class="form-group">
        <x-buttons class="selectbutton" aria-label="Appearance">
          <x-button :toggled="!dark" @click.prevent="setThemeDark(false)">
            <span class="togglebutton-content">
              <i class="material-icons">dark_mode</i>
              Light
            </span>
          </x-button>
          <x-button :toggled="dark" @click.prevent="setThemeDark(true)">
            <span class="togglebutton-content">
              <i class="material-icons">light_mode</i>
              Dark
            </span>
          </x-button>
        </x-buttons>
      </div>
      <div class="form-group toggle">
        <label>Apply theme</label>
        <x-switch @click.prevent="toggleEnabled" :toggled="enabled" />
      </div>
    </div>
  </MountingPortal>
</template>

<script lang="ts">
import Vue from "vue";
import { mapActions, mapGetters } from "vuex";
import { MountingPortal } from "portal-vue";
import { generatePalette } from "@/lib/theme/palette";
import ColorInput, {
  isValidHex,
} from "@/components/common/form/ColorInput.vue";

export default Vue.extend({
  components: { MountingPortal, ColorInput },
  computed: {
    ...mapGetters({
      themeValue: "settings/themeValue",
      themeType: "settings/themeType",
      colors: "settings/themeCustomizerColors",
      position: "settings/themeCustomizerPosition",
    }),
    enabled() {
      return this.themeValue === "custom";
    },
    dark() {
      return this.themeType === "dark";
    },
  },
  watch: {
    enabled: {
      immediate: true,
      handler() {
        this.applyAll();
      },
    },
    dark() {
      this.applyAll();
    },
    colors() {
      this.applyAll();
    },
  },
  methods: {
    ...mapActions("settings", { saveSetting: "save" }),
    toggleEnabled() {
      const enabled = !this.enabled;
      this.saveSetting({ key: "theme", value: enabled ? "custom" : "default" });
    },
    setThemeDark(value: boolean) {
      this.saveSetting({ key: "themeDark", value: `${value}` });
    },
    openPositionMenu(event: MouseEvent) {
      this.$bks.openMenu({
        event,
        options: [
          {
            name: "Top left",
            handler: () => this.setPosition("top-left"),
          },
          {
            name: "Top right",
            handler: () => this.setPosition("top-right"),
          },
          {
            name: "Bottom right",
            handler: () => this.setPosition("bottom-right"),
          },
          {
            name: "Bottom left",
            handler: () => this.setPosition("bottom-left"),
          },
        ],
      });
    },
    setPosition(
      value: "top-left" | "top-right" | "bottom-right" | "bottom-left"
    ) {
      this.saveSetting({ key: "themeCustomizerPosition", value });
    },
    setColor(name: string, value: string) {
      this.saveSetting({
        key: "themeCustomizerColors",
        value: JSON.stringify({ ...this.colors, [name]: value }),
      });
    },
    applyAll() {
      if (!this.enabled) {
        this.clear();
        return;
      }

      Object.keys(this.colors).forEach((name) => this.apply(name));
    },
    apply(name: string) {
      if (!this.enabled || !isValidHex(this.colors[name])) {
        return;
      }

      // Every scale is generated against these two.
      if (
        !isValidHex(this.colors.gray) ||
        !isValidHex(this.colors.background)
      ) {
        return;
      }

      const root = document.documentElement;

      if (name === "background") {
        root.style.setProperty("--app-bg", this.colors.background);
        return;
      }

      const palette = generatePalette({
        appearance: this.dark ? "dark" : "light",
        accent: this.colors[name],
        gray: this.colors.gray,
        background: this.colors.background,
      });
      // Gray is a ramp, not an accent — its seed shouldn't be forced onto step 9.
      const scale = name === "gray" ? palette.grayScale : palette.scale;
      const scaleAlpha =
        name === "gray" ? palette.grayScaleAlpha : palette.scaleAlpha;

      scale.forEach((color, i) => {
        root.style.setProperty(`--${name}-${i + 1}`, color);
      });
      scaleAlpha.forEach((color, i) => {
        root.style.setProperty(`--${name}-a${i + 1}`, color);
      });
    },
    clear() {
      const root = document.documentElement;
      root.style.removeProperty("--app-bg");
      Object.keys(this.colors).forEach((name) => {
        for (let step = 1; step <= 12; step++) {
          root.style.removeProperty(`--${name}-${step}`);
          root.style.removeProperty(`--${name}-a${step}`);
        }
      });
    },
  },
});
</script>

<style scoped>
.theme-customizer-overlay {
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.75rem;
  border: 1px solid var(--gray-6);
  border-radius: 6px;
  background: var(--panel-bg);
  color: var(--text);
  z-index: 1;
}

.theme-customizer-overlay.position-top-left {
  top: 3rem;
  left: 1rem;
}

.theme-customizer-overlay.position-top-right {
  top: 3rem;
  right: 1rem;
}

.theme-customizer-overlay.position-bottom-right {
  right: 1rem;
  bottom: 1rem;
}

.theme-customizer-overlay.position-bottom-left {
  bottom: 1rem;
  left: 1rem;
}

.menu-button {
  align-self: flex-start;
  display: flex;
  align-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
}

.menu-button .material-icons {
  font-size: 1.1rem;
}

.togglebutton-content {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.togglebutton-content .material-icons {
  font-size: 0.95rem;
}

.form-group.toggle {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
</style>
