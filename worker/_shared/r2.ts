import { getEnv } from "../env";

export type BlobGetOptions = { type?: "arrayBuffer" | "stream" | "text" };

export type ObjectStore = {
  get(key: string, options?: BlobGetOptions): Promise<ArrayBuffer | ReadableStream | string | null>;
  getWithMetadata(
    key: string,
    options?: BlobGetOptions,
  ): Promise<{ data: ArrayBuffer | ReadableStream | string | null; metadata: Record<string, string> } | null>;
  set(key: string, data: ArrayBuffer | Uint8Array | string, opts?: { metadata?: Record<string, string> }): Promise<void>;
  delete(key: string): Promise<void>;
};

function wrap(bucket: R2Bucket): ObjectStore {
  return {
    async get(key, options) {
      const obj = await bucket.get(key);
      if (!obj) return null;
      if (options?.type === "stream") return obj.body;
      if (options?.type === "text") return obj.text();
      return obj.arrayBuffer();
    },
    async getWithMetadata(key, options) {
      const obj = await bucket.get(key);
      if (!obj) return null;
      const metadata = (obj.customMetadata ?? {}) as Record<string, string>;
      let data: ArrayBuffer | ReadableStream | string | null = null;
      if (options?.type === "stream") data = obj.body;
      else if (options?.type === "text") data = await obj.text();
      else data = await obj.arrayBuffer();
      return { data, metadata };
    },
    async set(key, data, opts) {
      const customMetadata = opts?.metadata;
      await bucket.put(key, data, customMetadata ? { customMetadata } : undefined);
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}

/** Compatibility shim for the old Netlify Blobs getStore(name) calls. */
export function getStore(name: "markaz-reports" | "markaz-blog"): ObjectStore {
  const env = getEnv();
  if (name === "markaz-reports") return wrap(env.REPORTS);
  return wrap(env.BLOG_MEDIA);
}
