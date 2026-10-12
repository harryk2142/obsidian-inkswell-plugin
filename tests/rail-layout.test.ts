/**
 * The writer's rail arrangement (#55): Home and the tools footer are fixed; the
 * rest lives in two sections split by one divider, reorderable within and
 * across them. Stored layouts are sanitized and stay lossless as destinations
 * are added.
 */
import { describe, expect, it } from "vitest";
import {
  InkswellMode,
  defaultRailLayout,
  isDefaultRailLayout,
  isRailMovable,
  moveRailItem,
  nudgeRailItem,
  resolveRailLayout,
} from "../src/views/nav-model";

describe("rail layout", () => {
  it("defaults to the shipped grouping: pipeline above, Codex · Track below", () => {
    expect(defaultRailLayout()).toEqual({
      upper: ["plan", "write", "revise", "publish"],
      lower: ["codex", "track"],
    });
    expect(isDefaultRailLayout(defaultRailLayout())).toBe(true);
  });

  it("keeps Home and the footer fixed", () => {
    for (const id of ["home", "search", "customize", "help"] as InkswellMode[]) {
      expect(isRailMovable(id)).toBe(false);
    }
    expect(moveRailItem(defaultRailLayout(), "home", "upper", 0)).toEqual(defaultRailLayout());
  });

  it("sanitizes stored layouts and appends destinations missing from them", () => {
    expect(resolveRailLayout(null)).toEqual(defaultRailLayout());
    expect(resolveRailLayout("nope")).toEqual(defaultRailLayout());
    const l = resolveRailLayout({
      upper: ["plan", "write", "codex", "track", "home", "bogus", "write"],
      lower: ["revise"],
    });
    // home/bogus/duplicate dropped; Publish (missing) appended to its default section.
    expect(l).toEqual({ upper: ["plan", "write", "codex", "track", "publish"], lower: ["revise"] });
  });

  it("#55's arrangement: Codex and Track up beside Write, Revise and Publish below", () => {
    let l = defaultRailLayout();
    l = moveRailItem(l, "codex", "upper", 2);
    l = moveRailItem(l, "track", "upper", 3);
    expect(l).toEqual({ upper: ["plan", "write", "codex", "track", "revise", "publish"], lower: [] });
    l = moveRailItem(l, "revise", "lower", 0);
    l = moveRailItem(l, "publish", "lower", 1);
    expect(l).toEqual({ upper: ["plan", "write", "codex", "track"], lower: ["revise", "publish"] });
    expect(isDefaultRailLayout(l)).toBe(false);
  });

  it("nudges one step, crossing the divider both ways, and stops at the ends", () => {
    const def = defaultRailLayout();
    expect(nudgeRailItem(def, "write", 1).upper).toEqual(["plan", "revise", "write", "publish"]);
    expect(nudgeRailItem(def, "publish", 1)).toEqual({
      upper: ["plan", "write", "revise"],
      lower: ["publish", "codex", "track"],
    });
    expect(nudgeRailItem(def, "codex", -1)).toEqual({
      upper: ["plan", "write", "revise", "publish", "codex"],
      lower: ["track"],
    });
    expect(nudgeRailItem(def, "plan", -1)).toEqual(def);
    expect(nudgeRailItem(def, "track", 1)).toEqual(def);
  });

  it("nudging skips hidden destinations (a step always moves past a visible one)", () => {
    const hiddenTrack = (id: InkswellMode) => id !== "track";
    expect(nudgeRailItem(defaultRailLayout(), "codex", 1, hiddenTrack)).toEqual(defaultRailLayout());
    const hiddenRevise = (id: InkswellMode) => id !== "revise";
    expect(nudgeRailItem(defaultRailLayout(), "write", 1, hiddenRevise).upper).toEqual([
      "plan",
      "revise",
      "publish",
      "write",
    ]);
  });
});
