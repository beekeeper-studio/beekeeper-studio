import { Module } from "vuex";
import { State as RootState } from "../index";

/**
 * Where the app sits in the update cycle.
 *
 * `manual` is the portable-build path: a new version exists, but the app can't
 * install it itself, so the only action is a trip to the download page.
 */
export type UpdateStage =
  | "none"
  | "available"
  | "manual"
  | "downloading"
  | "downloaded";

export interface State {
  stage: UpdateStage;
  /** The version being offered, when the updater told us one. */
  version: string | null;
  /** Set when the user closes the update prompt, so it stays closed. */
  dismissed: boolean;
}

export const UpdateModule: Module<State, RootState> = {
  namespaced: true,
  state: () => ({
    stage: "none",
    version: null,
    dismissed: false,
  }),
  getters: {
    /** An update the user hasn't dealt with yet. */
    pending(state): boolean {
      return state.stage !== "none" && !state.dismissed;
    },
  },
  mutations: {
    stage(state, stage: UpdateStage) {
      state.stage = stage;
    },
    version(state, version: string | null) {
      state.version = version || null;
    },
    dismissed(state, dismissed: boolean) {
      state.dismissed = dismissed;
    },
  },
  actions: {
    /**
     * The updater has news. It re-checks on an interval and re-announces what
     * it already told us, so only genuinely new news - a different version, or
     * a download that has since landed - reopens a prompt the user closed.
     */
    found(context, { stage, version }: { stage: UpdateStage; version?: string }) {
      const next = version ?? null;
      if (stage !== context.state.stage || next !== context.state.version) {
        context.commit("dismissed", false);
      }
      context.commit("version", next);
      context.commit("stage", stage);
    },
    download(context) {
      window.main.triggerDownload();
      context.commit("stage", "downloading");
    },
    install() {
      window.main.triggerInstall();
    },
    dismiss(context) {
      context.commit("dismissed", true);
    },
  },
};
