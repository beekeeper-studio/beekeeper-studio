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
  /** Held so concurrent callers share one read rather than racing. */
  loading: Promise<void> | null;
}

async function readVimrc(): Promise<string[]> {
  const data: string | null = await Vue.prototype.$util.send("config/readVimrc");
  if (data == null) return [];
  return data.split("\n");
}

/**
 * A single line gets its reason spelled out; several would make the
 * notification unreadable, so those just get located.
 */
function describeErrors(errors: VimrcParseError[]): string {
  if (errors.length === 1) {
    return `.beekeeper.vimrc line ${errors[0].line}: ${errors[0].reason}`;
  }
  const lines = errors.map((e) => e.line).join(", ");
  return `.beekeeper.vimrc: ${errors.length} lines could not be parsed (lines ${lines})`;
}

/**
 * The user's `.beekeeper.vimrc`, read once per app run rather than once per
 * editor tab. Mappings are applied to a global vim singleton, so re-reading
 * the file for every tab did redundant io and re-applied the same mappings.
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
    /**
     * The app's own defaults first, so anything in the user's vimrc that
     * touches the same key is applied afterwards and wins.
     */
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
    /** Resolves once the vimrc is available. Safe to await from every tab. */
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
