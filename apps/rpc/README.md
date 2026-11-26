<div align="center">
	<br />
	<p>
		<img src="../studio/src/assets/logo.svg" width="96" alt="Beekeeper Studio" />
	</p>
	<h1>@beekeeperstudio/rpc</h1>
	<br />
	<p>
		<a href="https://github.com/beekeeper-studio/beekeeper-studio/blob/master/LICENSE.md"><img src="https://img.shields.io/badge/license-GPL--3.0-blue.svg" alt="License: GPL-3.0" /></a>
		<a href="https://github.com/beekeeper-studio/beekeeper-studio"><img src="https://img.shields.io/github/stars/beekeeper-studio/beekeeper-studio?style=flat" alt="GitHub stars" /></a>
	</p>
</div>

## About

`@beekeeperstudio/rpc` is the client for the Beekeeper Studio CLI socket. It talks to a connection that is **already open in the app**, over a local socket, so scripts and AI coding agents can inspect a database without being given its credentials.

## Example usage

```ts
import { Client } from "@beekeeperstudio/rpc";

const client = new Client();
await client.requestApproval();
const connections = await client.getConnections();
const queryResult = await client.runQuery({
  sql: "select id, email from users limit 5",
});

console.log(connections.markdown());
console.log(queryResult.json().results);
```

## Contributing

Run the tests and the type check from this folder:

```sh
pnpm test
pnpm typecheck
```
