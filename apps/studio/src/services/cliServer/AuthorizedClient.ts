import type { CliAccess } from "@beekeeperstudio/cli-client";

export class AuthorizedClient {
  constructor(
    readonly name: string,
    readonly access: CliAccess
  ) {}
}
