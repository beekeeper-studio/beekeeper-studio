import type { CliAccess } from "@beekeeperstudio/cli";

export class AuthorizedClient {
  constructor(
    readonly name: string,
    readonly access: CliAccess
  ) {}
}
