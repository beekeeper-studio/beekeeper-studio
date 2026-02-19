<template>
  <portal to="modals">
    <modal
      :name="modalName"
      :class="['vue-dialog', 'beekeeper-modal', 'keyboard-shortcuts-modal']"
    >
      <div v-kbd-trap="true">
        <div class="dialog-content">
          <div class="dialog-c-title">Keyboard Shortcuts</div>
          <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
            <i class="material-icons">clear</i>
          </a>
          <div class="kbd-content">
            <div
              v-for="section in sections"
              :key="section.sectionKey"
              class="kbd-section"
            >
              <h3 class="kbd-section-title">
                {{ section.label }}
              </h3>
              <div class="kbd-list">
                <div
                  v-for="action in section.actions"
                  :key="action.key"
                  class="kbd-item"
                >
                  <div class="kbd-label">
                    {{ action.label }}
                  </div>
                  <div class="kbd-keys">
                    <div
                      v-for="(keybinding, kbIdx) in action.keybindings"
                      :key="kbIdx"
                      class="kbd-keybinding"
                    >
                      <span v-for="(key, keyIdx) in keybinding" :key="keyIdx">{{
                        key
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from "vue";
import { AppEvent } from "@/common/AppEvent";
import type { KeybindingSection } from "@/types";

export default Vue.extend({
  data() {
    return {
      modalName: "keyboard-shortcuts-modal",
    };
  },
  computed: {
    rootBindings() {
      return [{ event: AppEvent.openKeyboardShortcuts, handler: this.open }];
    },
    sections(): KeybindingSection[] {
      return this.$bksConfigUI.getKeybindingSections();
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    this.unregisterHandlers(this.rootBindings);
  },
  methods: {
    open() {
      this.$modal.show(this.modalName);
    },
    close() {
      this.$modal.hide(this.modalName);
    },
  },
});
</script>

<style scoped>
.dialog-content {
  height: 70vh;
  display: flex;
  flex-direction: column;
}

.kbd-content {
  overflow-y: auto;
  padding-bottom: 1rem;
  padding-right: 0.5rem;
  margin-right: -0.8rem;
  height: 100%;
}

.kbd-section:not(:first-child) {
  margin-top: 1.25rem;
}

.kbd-section-title {
  position: sticky;
  top: 0;
  margin: 0;
  padding-block: 0.75rem;
  font-size: 0.85rem;
  letter-spacing: 0.05rem;
  text-transform: uppercase;
  font-weight: bold;
  text-transform: uppercase;
  color: var(--text-dark);
  background-color: hsl(from var(--theme-bg) h s calc(l + 1));
  border-bottom: 1px solid var(--border-color);
}

.kbd-item {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  padding-block: 0.65rem;
}

.kbd-label {
  color: rgb(from var(--theme-base) r g b / 77%);
}

.kbd-keys {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.kbd-keybinding {
  display: flex;
  gap: 0.28rem;

  > span {
    display: inline-block;
    padding: 0 0.35rem;
    border-radius: 4px;
    line-height: 1.6;
    font-size: 0.85rem;
    font-weight: normal;
    text-align: center;
    white-space: nowrap;
    vertical-align: baseline;
    background: rgb(from var(--theme-base) r g b / 5%);
    box-shadow: inset 0 0 0 1px rgb(from var(--theme-base) r g b / 5%);
    color: var(--text);
  }
}
</style>
