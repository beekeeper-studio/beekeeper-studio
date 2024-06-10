import { QueryFormatPresetEntity } from "@/common/appdb/models/QueryFormatPresetEntity";
import {
  DEFAULT_FORMAT_PRESET,
  QueryFormatPreset,
} from "@shared/lib/queryFormatter";
import _ from "lodash";
import { Module } from "vuex";
import { State as RootState } from "../index";

interface State {
  presets: QueryFormatPresetEntity[];
}

export const QueryFormatModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    presets: [],
  }),
  mutations: {
    set(state, presets: QueryFormatPresetEntity[]) {
      state.presets = presets;
    },
    add(state, preset: QueryFormatPresetEntity) {
      state.presets.push(preset);
    },
    remove(state, preset: QueryFormatPresetEntity) {
      state.presets = _.without(state.presets, preset);
    },
  },
  actions: {
    async loadPresets(context) {
      const presets = await QueryFormatPresetEntity.find();
      presets.forEach((p) => {
        // Fill in missing values. We do this so we don't have to change the
        // db. If there is a new option, just add it to the default constant.
        _.defaults(p, DEFAULT_FORMAT_PRESET);
        return p;
      });
      context.commit("set", presets || []);
    },
    async unloadPresets(context) {
      context.commit("set", []);
    },
    async add(context, payload: { name: string; values: QueryFormatPreset }) {
      const preset = new QueryFormatPresetEntity(payload.name, payload.values);
      await preset.save();
      context.commit("add", preset);
    },
    async save(context, payload: { name: string; values: QueryFormatPreset }) {
      const preset = context.state.presets.find((p) => p.name === payload.name);
      console.log("save", preset, payload.values);
      _.assign(preset.values, payload.values);
      await preset.save();
    },
    async remove(context, name: string) {
      const preset = context.state.presets.find((p) => p.name === name);
      if (preset) {
        await preset.remove();
        context.commit("remove", preset);
      }
    },
  },
};
