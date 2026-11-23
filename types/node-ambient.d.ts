// Ambient Type Declarations for Node.js built-in modules in Vite config & server endpoints
declare module "node:crypto" {
  export interface Hash {
    update(data: string | any, inputEncoding?: string): Hash;
    digest(encoding?: string): any;
  }
  export interface Hmac {
    update(data: string | any, inputEncoding?: string): Hmac;
    digest(encoding?: string): any;
  }
  export function randomBytes(size: number): { toString(encoding: string): string };
  export function pbkdf2Sync(password: string, salt: string, iterations: number, keylen: number, digest: string): { toString(encoding: string): string };
  export function createHmac(algorithm: string, key: string): Hmac;
  export function createHash(algorithm: string): Hash;
  export function timingSafeEqual(a: any, b: any): boolean;
  const crypto: {
    randomBytes: typeof randomBytes;
    pbkdf2Sync: typeof pbkdf2Sync;
    createHmac: typeof createHmac;
    createHash: typeof createHash;
    timingSafeEqual: typeof timingSafeEqual;
  };
  export default crypto;
}

declare module "node:https" {
  export function request(options: any, callback?: (res: any) => void): any;
  const https: {
    request: typeof request;
  };
  export default https;
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: string): string;
  export function writeFileSync(path: string, data: string, options?: any): void;
  export function appendFileSync(path: string, data: string, options?: any): void;
  export function mkdirSync(path: string, options?: any): void;
  export function unlinkSync(path: string): void;
  export function copyFileSync(src: string, dest: string): void;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { size: number; isFile(): boolean; isDirectory(): boolean };
  export function createWriteStream(path: string): any;
  export function createReadStream(path: string, options?: any): any;
  const fs: {
    existsSync: typeof existsSync;
    readFileSync: typeof readFileSync;
    writeFileSync: typeof writeFileSync;
    appendFileSync: typeof appendFileSync;
    mkdirSync: typeof mkdirSync;
    unlinkSync: typeof unlinkSync;
    copyFileSync: typeof copyFileSync;
    readdirSync: typeof readdirSync;
    statSync: typeof statSync;
    createWriteStream: typeof createWriteStream;
    createReadStream: typeof createReadStream;
  };
  export default fs;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
  export function basename(path: string, ext?: string): string;
  const path: {
    resolve: typeof resolve;
    join: typeof join;
    dirname: typeof dirname;
    basename: typeof basename;
  };
  export default path;
}

declare module "node:buffer" {
  export class Buffer {
    static from(data: any, encoding?: string): any;
    toString(encoding?: string): string;
    readonly length: number;
  }
}

declare var Buffer: {
  from(data: any, encoding?: string): any;
};
