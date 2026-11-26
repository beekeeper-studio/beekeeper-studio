import type { Access } from "@beekeeperstudio/cli";

export class AuthorizedClient {
  constructor(
    readonly name: string,
    readonly access: Access
  ) {}
}
