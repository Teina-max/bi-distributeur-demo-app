/**
 * Type declarations for globals injected by the Convex runtime.
 *
 * Convex injects `process.env` in both V8 (queries/mutations/actions) and
 * Node.js (`"use node"`) runtimes. The convex/tsconfig.json lib targets
 * ES2023+DOM and does not include @types/node, so we declare the minimal
 * subset needed here rather than pulling in all of @types/node.
 */

declare namespace NodeJS {
  interface ProcessEnv extends Record<string, string | undefined> {}
}

declare const process: {
  env: NodeJS.ProcessEnv;
};

type BufferEncoding =
  | "ascii"
  | "utf8"
  | "utf-8"
  | "utf16le"
  | "ucs2"
  | "ucs-2"
  | "base64"
  | "base64url"
  | "latin1"
  | "binary"
  | "hex";

declare const Buffer: {
  from: {
    (
      data: string,
      encoding?: BufferEncoding,
    ): Uint8Array & {
      byteLength: number;
    };
    (
      data: ArrayBuffer | SharedArrayBuffer | Uint8Array | ArrayLike<number>,
    ): Uint8Array & { byteLength: number };
  };
};
