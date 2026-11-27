import type { Access } from "@beekeeperstudio/rpc";

export class AuthorizedClient {
  constructor(
    readonly name: string,
    readonly access: Access
  ) {}
}
