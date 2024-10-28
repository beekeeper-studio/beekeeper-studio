export interface Transcoder<T, U> {
  serialize(value: T): U;
  deserialize(value: U): T;
}

export const GenericBinaryTranscoder: Transcoder<Buffer, string> = {
  serialize(value) {
    return value.toString("hex");
  },
  deserialize(value) {
    return Buffer.from(value, "hex");
  },
};

export const LibSQLBinaryTranscoder: Transcoder<ArrayBuffer, string> = {
  serialize(value) {
    return Buffer.from(value).toString("hex");
  },
  deserialize(value) {
    return Buffer.from(value, "hex").buffer;
  },
};
