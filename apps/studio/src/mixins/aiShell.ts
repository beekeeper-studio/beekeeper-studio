import Vue from "vue";
import { AI_SHELL_PLUGIN_ID, AiShellTaskParams } from "@/common/aiShell";

/**
 * Everything a component needs to offer an AI Shell entry point: whether the
 * feature can be used right now, why not if it can't, and the one way to open
 * the AI Shell (with or without a task attached).
 */
export default Vue.extend({
  computed: {
    /** True when the AI Shell can be opened. */
    aiShellEnabled(): boolean {
      return this.$store.getters.aiShellEnabled;
    },
    /** A sentence explaining why it can't be, or `null`. */
    aiShellUnavailableReason(): string | null {
      return this.$store.getters.aiShellUnavailableReason;
    },
  },
  methods: {
    /**
     * Open the AI Shell in a new tab, optionally handing it a task.
     *
     * @param options.command one of `AiShellCommand`
     * @param options.params structured data for that command — never prompt text
     */
    openAiShell(options: {
      command?: string;
      params?: AiShellTaskParams;
    } = {}): void {
      this.$plugin.openTab(AI_SHELL_PLUGIN_ID, options);
    },
  },
});
