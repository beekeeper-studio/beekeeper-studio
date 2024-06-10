<template>
  <modal
    class="vue-dialog beekeeper-modal v2-modal super-formatter-modal"
    :name="modalName"
    @opened="opened"
  >
    <div v-kbd-trap="true">
      <div class="dialog-content">
        <div class="dialog-c-title">Super Formatter</div>
        <a class="close-btn btn btn-fab" href="#" @click.prevent="close">
          <i class="material-icons">clear</i>
        </a>

        <div class="main-content">
          <div ref="settingsContainer" class="settings-container">
            <div class="form-group">
              <label for="preset" required>Preset</label>
              <select
                v-if="true"
                id="preset"
                name="preset"
                class="form-control"
                v-model="selectedPresetName"
                ref="preset"
              >
                <option
                  v-for="preset in presets"
                  :key="preset.name"
                  :value="preset.name"
                >
                  {{ preset.name }}
                </option>
              </select>
              <input
                v-if="false"
                id="preset"
                name="preset"
                class="form-control"
                type="text"
                ref="preset"
              />
            </div>

            <div class="settings-group">
              <div
                v-for="(option, key) in formatOptions"
                class="form-group"
                :key="key"
              >
                <label :for="`super-formatter-${key}`">
                  {{ option.label }}
                </label>
                <span class="description">
                  {{ option.desc }}
                </span>
                <select
                  v-if="option.type === 'options'"
                  :id="`super-formatter-${key}`"
                  :name="key"
                  class="form-control"
                  v-model="preset[key]"
                >
                  <option
                    v-for="val in option.options"
                    :key="val"
                    :value="val"
                  >
                    {{ val }}
                  </option>
                </select>
                <input
                  v-else-if="option.type === 'number'"
                  :id="`super-formatter-${key}`"
                  :name="key"
                  class="form-control xs-input"
                  type="number"
                  v-model.number="preset[key]"
                  min="0"
                />
                <x-switch
                  v-else-if="option.type === 'boolean'"
                  :id="`super-formatter-${key}`"
                  :toggled="preset[key]"
                  @click.prevent="preset[key] = !preset[key]"
                />
                <input
                  v-else
                  :id="`super-formatter-${key}`"
                  :name="key"
                  class="form-control"
                  type="text"
                  v-model="preset[key]"
                />
              </div>
            </div>
          </div>
          <div ref="textEditorContainer" class="text-editor-container">
            <sql-text-editor
              v-model="query"
              :forced-value="forcedTextEditorValue"
              :prevent-destroy="true"
              :connection-type="$store.state.usedConfig.connectionType"
            />
          </div>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <div class="save-group" v-if="dirty">
          <label for="save-as">Save as</label>
          <input
            id="save-as"
            class="form-control"
            type="text"
            value="New preset 1"
          />
          <button class="btn btn-flat" type="button" @click="save">
            Save
          </button>
        </div>
        <button class="btn btn-flat" type="button">Copy to Clipboard</button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="false"
          @click="submit"
        >
          Apply
        </button>
      </div>
    </div>
  </modal>
</template>

<script lang="ts">
// TODO remove this
/* eslint-disable */
// @ts-ignore
import { AppEvent } from "@/common/AppEvent";
import SqlTextEditor from "@/components/common/texteditor/SQLTextEditor.vue";
import Split from "split.js";
import _ from "lodash";
import {
  DEFAULT_FORMAT_PRESET,
  DEFAULT_FORMAT_PRESET_NAME,
  FORMAT_OPTIONS,
  QueryFormatPreset,
} from "@shared/lib/queryFormatter";
import { QueryFormatPresetEntity } from "@/common/appdb/models/QueryFormatPresetEntity";
import { safeSqlFormat } from "@/common/utils";

let lockDirtyChecker = false;

export default {
  components: { SqlTextEditor },
  data() {
    return {
      split: null,
      preset: _.cloneDeep(DEFAULT_FORMAT_PRESET),
      selectedPresetName: "None",
      dirty: false,
      query: "SELECT * FROM banana;",
      forcedTextEditorValue: "SELECT * FROM banana;",
    };
  },
  computed: {
    modalName: () => "super-formatter-modal",
    formatOptions: () => FORMAT_OPTIONS,
    rootBindings() {
      return [{ event: AppEvent.showSuperFormatterModal, handler: this.open }];
    },
    presets() {
      return [
        { name: DEFAULT_FORMAT_PRESET_NAME, values: DEFAULT_FORMAT_PRESET },
        ...this.$store.state.queryFormat.presets,
      ];
    },
  },
  watch: {
    preset: {
      deep: true,
      handler() {
        this.format();
        if (lockDirtyChecker) return;
        this.dirty = true;
      },
    },
    selectedPresetName() {
      const preset: QueryFormatPresetEntity = this.presets.find(
        (p: QueryFormatPresetEntity) => p.name === this.selectedPresetName
      );
      this.setPreset(preset.values);
      this.dirty = false;
    },
  },
  methods: {
    format() {
      this.query = safeSqlFormat(this.query, this.preset);
      this.forcedTextEditorValue = this.query;
    },
    async setPreset(values: QueryFormatPreset) {
      lockDirtyChecker = true;
      this.preset = _.cloneDeep(values);
      await this.$nextTick();
      lockDirtyChecker = false;
    },
    save() {
      this.$store.dispatch("queryFormat/save", {
        name: this.selectedPresetName,
        values: this.preset,
      })
    },
    open() {
      this.$modal.show(this.modalName);
      this.$store.dispatch("queryFormat/loadPresets");
    },
    async opened() {
      this.query = "SELECT * FROM banana;";
      this.selectedPresetName = DEFAULT_FORMAT_PRESET_NAME;
      this.dirty = false;

      this.format();

      await this.$nextTick();

      if (this.split) {
        this.split.destroy();
      }
      this.split = Split(
        [this.$refs.settingsContainer, this.$refs.textEditorContainer],
        {
          elementStyle: (_dimension, size) => ({
            "flex-basis": `calc(${size}%)`,
          }),
          sizes: [50, 50], // sizes: splitSizes,
          onDragEnd: () => {
            // TODO remember the sizes
            // const splitSizes = this.split.getSizes()
            // SmartLocalStorage.addItem("interfaceSplitSizes", splitSizes)
          },
        } as Split.Options
      );

      this.$refs.preset.focus();
    },
    close() {
      this.$modal.hide(this.modalName);
    },
    submit() {
      this.close();
    },
  },
  mounted() {
    this.registerHandlers(this.rootBindings);
  },
};
</script>
