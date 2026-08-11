/**
 * Shared constants and types for talking to the SQL AI Shell plugin
 * (`bks-ai-shell`).
 *
 * The host never composes prompt text. It hands the plugin structured data plus
 * a command that says what kind of task it is; how that turns into a prompt is
 * the plugin's business.
 *
 * NOTE(follow-up): these param types belong in `@beekeeperstudio/plugin`
 * alongside `LoadViewParams` once that package ships them. They live here in
 * the meantime so the shared type doesn't have to be widened to `any`.
 */

export const AI_SHELL_PLUGIN_ID = "bks-ai-shell";

/** Display name used when there is no manifest to read a name from. */
export const AI_SHELL_NAME = "SQL AI Shell";

/**
 * Commands the host can hand to the AI Shell. Each entry point uses a distinct
 * command so the plugin can tell the tasks apart.
 */
export const AiShellCommand = {
  /** Debug a failed query. Params: {@link AiShellDebugQueryErrorParams} */
  debugQueryError: "debug-query-error",
  /** Answer a question about a query. Params: {@link AiShellAskQuestionParams} */
  askQuestion: "ask-question",
} as const;

export type AiShellCommandName =
  (typeof AiShellCommand)[keyof typeof AiShellCommand];

/** Position information for a query error, where the dialect provides it. */
export type AiShellQueryErrorLocation = {
  line?: number;
  ch?: number;
  /** Character offset into the query, as reported by the dialect. */
  position?: number;
};

export type AiShellDebugQueryErrorParams = {
  /** The SQL that was executed. */
  query: string;
  error: {
    message: string;
  } & AiShellQueryErrorLocation;
};

export type AiShellAskQuestionParams = {
  /** The SQL the question is about. */
  query: string;
  /** True when `query` is the user's selection rather than the whole editor. */
  isSelection: boolean;
  /** The user's question, verbatim. */
  question: string;
};

export type AiShellTaskParams =
  | AiShellDebugQueryErrorParams
  | AiShellAskQuestionParams;
