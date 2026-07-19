/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // NOTE: deliberately NOT "<rootDir>/src/**/*.test.ts" as originally specced.
  // jest-util@29.7's replacePathSepForGlob() (used to normalize testMatch
  // globs on Windows) does not convert a backslash immediately followed by
  // "." (regex: /\\(?![{}()+?.^$])/g) because that sequence is a valid glob
  // escape. This repo's git worktrees live under a literal ".worktrees"
  // directory, so once <rootDir> (a native Windows path, e.g.
  // "...\L3arn_repo\.worktrees\lesson-content-contract\...") is substituted
  // into the pattern, the "\.worktrees" segment survives un-converted,
  // producing a mixed-separator glob that matches 0 files (repro'd
  // standalone outside any dot-prefixed path with the identical config to
  // confirm this, not a dependency/config mistake). "roots" (which scopes
  // the search to this package) is resolved via plain path.resolve and is
  // NOT affected, so a rootDir-relative glob works correctly here.
  testMatch: ["**/src/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        // Override the package's own ESNext/bundler tsconfig for the test
        // run only — ts-jest needs CommonJS output to run under plain `jest`
        // (no --experimental-vm-modules). Production builds are unaffected;
        // tsup (not this config) builds the published cjs+esm output.
        tsconfig: { module: "CommonJS", moduleResolution: "Node" },
      },
    ],
  },
};
