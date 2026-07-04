/**
 * Unit tests for withAIRetry's non-retryable ("fatal") generation-error path.
 *
 * A request timeout/abort cannot be fixed by retrying the identical call, so it
 * must short-circuit straight to the fallback rather than burning all three
 * attempts (which would triple the wall-clock wait before the student gets a
 * mission). Validation failures, by contrast, must still retry the full 3×.
 *
 * The tests use a sentinel error + predicate so they verify withAIRetry's
 * contract directly, decoupled from the Anthropic SDK (the compiler supplies the
 * real predicate: `error instanceof Anthropic.APIConnectionTimeoutError`).
 */

import { withAIRetry } from "./retry-engine";
import { isNonRetryableAiError } from "../compiler";
import type { SafeFallback } from "@l3arn/shared-types";

// Minimal SafeFallback — only `id` is read by withAIRetry (as result.fallbackId).
const FALLBACK = {
  id: "fallback-mission-001",
  context: "mission-generation",
  title: "Fallback",
  content: "{}",
  parentNote: "note",
  parentVisible: true,
  isAIGenerated: false,
} as unknown as SafeFallback;

const getFallback = () => FALLBACK;
const passthroughValidate = (raw: unknown) => raw;

class FatalGenError extends Error {}
const isFatal = (e: unknown) => e instanceof FatalGenError;

describe("withAIRetry — non-retryable generation errors", () => {
  it("short-circuits to the fallback after ONE attempt on a fatal error", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      throw new FatalGenError("Request timed out.");
    };

    const result = await withAIRetry(generate, passthroughValidate, getFallback, isFatal);

    expect(calls).toBe(1); // did NOT retry
    expect(result.status).toBe("failed-with-fallback");
    if (result.status === "failed-with-fallback") {
      expect(result.fallbackId).toBe("fallback-mission-001");
      expect(result.attempts).toHaveLength(3); // schema requires 3; padded after short-circuit
    }
  });

  it("still retries the full 3 attempts on a NON-fatal generation error", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      throw new Error("transient network blip");
    };

    const result = await withAIRetry(generate, passthroughValidate, getFallback, isFatal);

    expect(calls).toBe(3); // fatal predicate did not match → normal retry
    expect(result.status).toBe("failed-with-fallback");
  });

  it("preserves the original 3-attempt behaviour when no predicate is supplied", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      throw new FatalGenError("would-be fatal, but no predicate given");
    };

    const result = await withAIRetry(generate, passthroughValidate, getFallback);

    expect(calls).toBe(3);
    expect(result.status).toBe("failed-with-fallback");
  });

  it("returns validated on success without consulting the fatal predicate", async () => {
    const generate = async () => ({ ok: true });
    let predicateCalls = 0;
    const result = await withAIRetry(generate, (r) => r, getFallback, () => {
      predicateCalls++;
      return true;
    });

    expect(result.status).toBe("validated");
    expect(predicateCalls).toBe(0);
  });
});

/**
 * PR #20 prod-miss regression coverage: in the Railway runtime, the SDK timeout
 * error did NOT match `instanceof Anthropic.APIConnectionTimeoutError` alone, so
 * withAIRetry retried all 3 attempts (3x90s = 270s) instead of short-circuiting.
 * isNonRetryableAiError (compiler.ts) now also duck-types by name/message. These
 * tests exercise the REAL exported predicate wired through withAIRetry, not a
 * local stand-in.
 */
describe("withAIRetry — fatal generation errors (real isNonRetryableAiError predicate)", () => {
  const FALLBACK_2: SafeFallback = {
    id: "test-fallback",
    context: "mission-generation",
    title: "t",
    content: "{}",
    parentNote: "n",
    parentVisible: true,
    isAIGenerated: false,
  };

  it("short-circuits to fallback after ONE attempt when the error is a timeout", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      throw { name: "AbortError", message: "Request timed out." };
    };
    const result = await withAIRetry(generate, (r) => r, () => FALLBACK_2, isNonRetryableAiError);
    expect(calls).toBe(1); // NOT 3
    expect(result.status).toBe("failed-with-fallback");
  });

  it("still retries 3x for a non-fatal generation error", async () => {
    let calls = 0;
    const generate = async () => {
      calls++;
      throw new Error("transient network blip");
    };
    const result = await withAIRetry(generate, (r) => r, () => FALLBACK_2, isNonRetryableAiError);
    expect(calls).toBe(3);
    expect(result.status).toBe("failed-with-fallback");
  });

  it("predicate matches by name and message, not just instanceof", () => {
    expect(isNonRetryableAiError({ name: "AbortError" })).toBe(true);
    expect(isNonRetryableAiError({ message: "Request timed out." })).toBe(true);
    expect(isNonRetryableAiError(new Error("boom"))).toBe(false);
  });
});
