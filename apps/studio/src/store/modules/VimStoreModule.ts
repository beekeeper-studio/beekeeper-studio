import Vue from "vue";
import { Module } from "vuex";
import rawLog from "@bksLogger";
import { State as RootState } from "../index";
import {
  VimDirective,
  VimrcParseError,
  parseVimrc,
} from "@/lib/editor/vim";
import { DEFAULT_VIM_MAPPINGS } from "@/lib/editor/vimExCommands";

const log = rawLog.scope("vim");

interface State {
  directives: VimDirective[];
  errors: VimrcParseError[];
  loaded: boolean;
  /** Shared so concurrent callers don't race. */
  loading: Promise<void> | null;
}

async function readVimrc(): Promise<string[]> {
  const data: string | null = await Vue.prototype.$util.send("config/readVimrc");
  if (data == null) return [];
  return data.split("\n");
}

/** One line gets its reason; several would be unreadable, so those get located. */
function describeErrors(errors: VimrcParseError[]): string {
  if (errors.length === 1) {
    return `.beekeeper.vimrc line ${errors[0].line}: ${errors[0].reason}`;
  }
  const lines = errors.map((e) => e.line).join(", ");
  return `.beekeeper.vimrc: ${errors.length} lines could not be parsed (lines ${lines})`;
}

/**
 * The user's `.beekeeper.vimrc`, read once per app run rather than per tab.
 */
export const VimStoreModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    directives: [],
    errors: [],
    loaded: false,
    loading: null,
  }),
  getters: {
    /** App defaults first, so the user's vimrc is applied after and wins. */
    directives(state) {
      return [...DEFAULT_VIM_MAPPINGS, ...state.directives];
    },
    errors(state) {
      return state.errors;
    },
  },
  mutations: {
    setResult(state, { directives, errors }) {
      state.directives = directives;
      state.errors = errors;
      state.loaded = true;
    },
    setLoading(state, loading: Promise<void> | null) {
      state.loading = loading;
    },
  },
  actions: {
    /** Safe to await from every tab. */
    async load(context): Promise<void> {
      if (context.state.loaded) return;
      if (context.state.loading) return context.state.loading;

      const loading = (async () => {
        try {
          const { directives, errors } = parseVimrc(await readVimrc());
          context.commit("setResult", { directives, errors });

          if (errors.length > 0) {
            log.warn("Could not parse every line of .beekeeper.vimrc", errors);
            Vue.prototype.$noty.warning(describeErrors(errors));
          }
        } catch (e) {
          log.error("Could not read .beekeeper.vimrc", e);
          context.commit("setResult", { directives: [], errors: [] });
        } finally {
          context.commit("setLoading", null);
        }
      })();

      context.commit("setLoading", loading);
      return loading;
    },
  },
};
