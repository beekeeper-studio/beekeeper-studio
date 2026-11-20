import { CliResultResponse } from "@/cli/protocol";

/** A successful reply from the app. Each command's reply adds its own markdown(). */
export class CliReply<Result> {
  constructor(readonly response: CliResultResponse) {}

  json(): Result {
    return this.response.result as Result;
  }

  raw(): string {
    return JSON.stringify(this.response.result);
  }
}
