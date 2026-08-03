import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts does not set `test.globals: true`, so React Testing
// Library's automatic afterEach(cleanup) detection (which relies on a
// global `afterEach`) never fires. Without this, DOM from one test's
// render() leaks into the next test in the same file, causing spurious
// "multiple elements found" failures whenever a file renders the same
// component more than once (first hit: OptionListTask.test.tsx).
afterEach(() => {
  cleanup();
});
