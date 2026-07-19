import { evaluateRulePredicate } from "./rule-predicate-evaluator";
import type { RulePredicate } from "@l3arn/shared-types";

describe("evaluateRulePredicate", () => {
  describe("leaf predicates — literal value", () => {
    it("eq: true when attribute equals the literal value", () => {
      const predicate: RulePredicate = { field: "sides", op: "eq", value: 4 };
      expect(evaluateRulePredicate(predicate, { sides: 4 })).toBe(true);
    });

    it("eq: false when attribute does not equal the literal value", () => {
      const predicate: RulePredicate = { field: "sides", op: "eq", value: 4 };
      expect(evaluateRulePredicate(predicate, { sides: 3 })).toBe(false);
    });

    it("neq: true when attribute differs from the literal value", () => {
      const predicate: RulePredicate = { field: "sides", op: "neq", value: 4 };
      expect(evaluateRulePredicate(predicate, { sides: 3 })).toBe(true);
    });

    it("gt/gte/lt/lte compare numbers correctly", () => {
      expect(evaluateRulePredicate({ field: "sides", op: "gt", value: 3 }, { sides: 4 })).toBe(true);
      expect(evaluateRulePredicate({ field: "sides", op: "gt", value: 4 }, { sides: 4 })).toBe(false);
      expect(evaluateRulePredicate({ field: "sides", op: "gte", value: 4 }, { sides: 4 })).toBe(true);
      expect(evaluateRulePredicate({ field: "sides", op: "lt", value: 4 }, { sides: 3 })).toBe(true);
      expect(evaluateRulePredicate({ field: "sides", op: "lte", value: 4 }, { sides: 4 })).toBe(true);
    });

    it("gt: false when the attribute is not a number", () => {
      const predicate: RulePredicate = { field: "color", op: "gt", value: 1 };
      expect(evaluateRulePredicate(predicate, { color: "red" })).toBe(false);
    });

    it("in: true when attribute is one of the listed values", () => {
      const predicate: RulePredicate = { field: "color", op: "in", value: ["red", "blue"] };
      expect(evaluateRulePredicate(predicate, { color: "blue" })).toBe(true);
    });

    it("in: false when attribute is not in the listed values", () => {
      const predicate: RulePredicate = { field: "color", op: "in", value: ["red", "blue"] };
      expect(evaluateRulePredicate(predicate, { color: "green" })).toBe(false);
    });
  });

  describe("leaf predicates — compareField (field-to-field, e.g. AI-mistake detection)", () => {
    it("neq: true when two attributes on the same item differ", () => {
      const predicate: RulePredicate = { field: "claimedSides", op: "neq", compareField: "actualSides" };
      expect(evaluateRulePredicate(predicate, { claimedSides: 5, actualSides: 6 })).toBe(true);
    });

    it("neq: false when two attributes on the same item are equal", () => {
      const predicate: RulePredicate = { field: "claimedSides", op: "neq", compareField: "actualSides" };
      expect(evaluateRulePredicate(predicate, { claimedSides: 6, actualSides: 6 })).toBe(false);
    });
  });

  describe("compound predicates", () => {
    it("allOf: true only when every sub-predicate is true", () => {
      const predicate: RulePredicate = {
        allOf: [
          { field: "sides", op: "eq", value: 4 },
          { field: "color", op: "eq", value: "blue" },
        ],
      };
      expect(evaluateRulePredicate(predicate, { sides: 4, color: "blue" })).toBe(true);
      expect(evaluateRulePredicate(predicate, { sides: 4, color: "red" })).toBe(false);
    });

    it("anyOf: true when at least one sub-predicate is true", () => {
      const predicate: RulePredicate = {
        anyOf: [
          { field: "sides", op: "eq", value: 4 },
          { field: "sides", op: "eq", value: 6 },
        ],
      };
      expect(evaluateRulePredicate(predicate, { sides: 6 })).toBe(true);
      expect(evaluateRulePredicate(predicate, { sides: 5 })).toBe(false);
    });

    it("not: inverts the inner predicate", () => {
      const predicate: RulePredicate = { not: { field: "sides", op: "eq", value: 4 } };
      expect(evaluateRulePredicate(predicate, { sides: 4 })).toBe(false);
      expect(evaluateRulePredicate(predicate, { sides: 3 })).toBe(true);
    });

    it("nested compound: allOf containing an anyOf", () => {
      const predicate: RulePredicate = {
        allOf: [
          { anyOf: [{ field: "sides", op: "eq", value: 4 }, { field: "sides", op: "eq", value: 6 }] },
          { field: "color", op: "neq", value: "red" },
        ],
      };
      expect(evaluateRulePredicate(predicate, { sides: 6, color: "blue" })).toBe(true);
      expect(evaluateRulePredicate(predicate, { sides: 6, color: "red" })).toBe(false);
      expect(evaluateRulePredicate(predicate, { sides: 5, color: "blue" })).toBe(false);
    });
  });
});
