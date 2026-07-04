/**
 * The default-constructed Anthropic client must use Node's built-in fetch
 * (undici), not the SDK 0.26 node shim (node-fetch). node-fetch fails
 * streamed responses on the Railway runtime with "Premature close" at
 * end-of-stream — 0/3 AI generations in prod — while undici terminates
 * chunked/SSE bodies correctly.
 */
import { buildDefaultClientOptions } from "./compiler";

describe("buildDefaultClientOptions", () => {
  it("passes Node's global fetch to the Anthropic client", () => {
    const opts = buildDefaultClientOptions("test-key");
    expect(opts.fetch).toBe(globalThis.fetch);
    expect(opts.fetch).toBeDefined();
    expect(opts.apiKey).toBe("test-key");
  });

  it("falls back to ANTHROPIC_API_KEY when no key is given", () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "env-key";
    try {
      expect(buildDefaultClientOptions(undefined).apiKey).toBe("env-key");
    } finally {
      if (prev === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = prev;
    }
  });
});
