<template>
  <MountingPortal mount-to="body" append>
    <div class="theme-customizer-overlay" :class="`position-${position}`">
      <button class="menu-button" @click="openPositionMenu">
        <i class="material-icons">more_horiz</i>
      </button>
      <div class="form-group toggle">
        <label>Apply theme</label>
        <x-switch @click.prevent="toggleEnabled" :toggled="enabled" />
      </div>
      <div class="form-group">
        <label for="tc-gray">Gray</label>
        <color-input
          id="tc-gray"
          :value="colors.gray"
          :disabled="!enabled"
          @input="setColor('gray', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-yellow">Yellow</label>
        <color-input
          id="tc-yellow"
          :value="colors.yellow"
          :disabled="!enabled"
          @input="setColor('yellow', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-blue">Blue</label>
        <color-input
          id="tc-blue"
          :value="colors.blue"
          :disabled="!enabled"
          @input="setColor('blue', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-green">Green</label>
        <color-input
          id="tc-green"
          :value="colors.green"
          :disabled="!enabled"
          @input="setColor('green', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-orange">Orange</label>
        <color-input
          id="tc-orange"
          :value="colors.orange"
          :disabled="!enabled"
          @input="setColor('orange', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-red">Red</label>
        <color-input
          id="tc-red"
          :value="colors.red"
          :disabled="!enabled"
          @input="setColor('red', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-purple">Purple</label>
        <color-input
          id="tc-purple"
          :value="colors.purple"
          :disabled="!enabled"
          @input="setColor('purple', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-pink">Pink</label>
        <color-input
          id="tc-pink"
          :value="colors.pink"
          :disabled="!enabled"
          @input="setColor('pink', $event)"
        />
      </div>
      <div class="form-group">
        <label for="tc-background">Background</label>
        <color-input
          id="tc-background"
          :value="colors.background"
          :disabled="!enabled"
          @input="setColor('background', $event)"
        />
      </div>
      <div class="form-group">
        <x-buttons class="selectbutton" aria-label="Appearance">
          <x-button
            :toggled="!dark"
            :disabled="!enabled"
            @click.prevent="setThemeDark(false)"
          >
            <span class="togglebutton-content">
              <i class="material-icons">dark_mode</i>
              Light
            </span>
          </x-button>
          <x-button
            :toggled="dark"
            :disabled="!enabled"
            @click.prevent="setThemeDark(true)"
          >
            <span class="togglebutton-content">
              <i class="material-icons">light_mode</i>
              Dark
            </span>
          </x-button>
        </x-buttons>
      </div>
      <button class="btn btn-flat btn-icon copy-button" @click="copy">
        <i class="material-icons">content_copy</i>
        Copy
      </button>
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
      themeId: "theme/id",
      dark: "theme/dark",
      colors: "settings/themeCustomizerColors",
      position: "settings/themeCustomizerPosition",
    }),
    enabled() {
      return this.themeId === "custom";
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
    ...mapActions("theme", { setThemeId: "setId", setAppearance: "setDark" }),
    toggleEnabled() {
      this.setThemeId(this.enabled ? "default" : "custom");
    },
    setThemeDark(value: boolean) {
      this.setAppearance(value ? "dark" : "light");
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
      if (!this.enabled) {
        return;
      }

      // body carries the theme classes, so it is where a scale is read from.
      const root = document.body;

      if (name === "background") {
        if (isValidHex(this.colors.background)) {
          root.style.setProperty("--app-bg", this.colors.background);
        }
        return;
      }

      const scales = this.scalesFor(name);
      if (!scales) {
        return;
      }

      scales.scale.forEach((color, i) => {
        root.style.setProperty(`--${name}-${i + 1}`, color);
      });
      scales.scaleAlpha.forEach((color, i) => {
        root.style.setProperty(`--${name}-a${i + 1}`, color);
      });
    },
    scalesFor(name: string) {
      // Every scale is generated against these two.
      if (
        !isValidHex(this.colors[name]) ||
        !isValidHex(this.colors.gray) ||
        !isValidHex(this.colors.background)
      ) {
        return null;
      }

      const palette = generatePalette({
        appearance: this.dark ? "dark" : "light",
        accent: this.colors[name],
        gray: this.colors.gray,
        background: this.colors.background,
      });
      // Gray is a ramp, not an accent — its seed shouldn't be forced onto step 9.
      return name === "gray"
        ? { scale: palette.grayScale, scaleAlpha: palette.grayScaleAlpha }
        : { scale: palette.scale, scaleAlpha: palette.scaleAlpha };
    },
    async copy() {
      const selector = this.dark ? ".theme-custom.dark-theme" : ".theme-custom";
      const lines = [`${selector} {`, `  --app-bg: ${this.colors.background};`];

      Object.keys(this.colors)
        .filter((name) => name !== "background")
        .forEach((name) => {
          const scales = this.scalesFor(name);
          if (!scales) {
            return;
          }
          lines.push("");
          scales.scale.forEach((color, i) => {
            lines.push(`  --${name}-${i + 1}: ${color};`);
          });
          lines.push("");
          scales.scaleAlpha.forEach((color, i) => {
            lines.push(`  --${name}-a${i + 1}: ${color};`);
          });
        });

      lines.push("}", "");
      await this.$native.clipboard.writeText(lines.join("\n"));
    },
    clear() {
      const root = document.body;
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

.copy-button {
  align-self: flex-start;
}
</style>
