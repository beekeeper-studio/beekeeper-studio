
// Fix (part 1 of 3) Issue #1399 - int64s not displaying properly
// (part 2 is in apps/studio/src/lib/db/clients/sqlite.js
// and part 3 is in shared/src/lib/dialects/index.ts)
// This part fixes "TypeError: Do not know how to serialize a BigInt"
// by adding a toJSON() method to BigInts (like Numbers have)

// for ts
// from: https://github.com/GoogleChromeLabs/jsbi/issues/30#issuecomment-1006088574
// eslint-disable-next-line @typescript-eslint/no-redeclare
interface BigInt {
  /** Convert to BigInt to string form in JSON.stringify */
  toJSON: () => string;
}

// for js
BigInt.prototype.toJSON = function() { return this.toString() }

