/**
 * #58 — chapters are runs of scenes, not titles. Two chapters may share a name
 * (e.g. chapters named for their POV character), even side by side; `firstScene`
 * anchors keep them apart across serialize → rebuild round-trips.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  OutlineTree,
  buildOutline,
  chapterRuns,
  isDerivedDuplicateId,
  moveScene,
  sceneSlotForChapter,
  serializeOutline,
} from "../src/outliner/outline";
import { StructureGroup, passChapterAnchors, renameSceneInChapters } from "../src/outliner/structure";
import { BUILTIN_STEPS } from "../src/compile/steps";
import { buildPlotGrid } from "../src/outliner/plotgrid";
import { numberRepeats } from "../src/lib/labels";
import type { CompileScene } from "../src/compile/types";
import { removeSceneFromIndex, renameSceneInIndex, updateScenes } from "../src/projects/index-writer";
import { ProjectStore } from "../src/projects/project-store";
import { createScene } from "../src/outliner/create-scene";
import { FakeApp, flushAsync } from "./fakes/fake-app";

const scene = (title: string, chapter?: string, act?: string) => ({
  title,
  path: `${title}.md`,
  indent: 0,
  chapter,
  act,
});

type SceneIn = ReturnType<typeof scene>;

/** Every chapter node, display order. */
const chaptersOf = (t: OutlineTree) => [...t.acts.flatMap((a) => a.chapters), ...t.looseChapters];

/** Serialize, then rebuild from the written scene strings + config (a save/load). */
function roundTrip(t: OutlineTree): { tree: OutlineTree; chapters: StructureGroup[]; acts: StructureGroup[] } {
  const out = serializeOutline(t);
  const scenes = out.order.map((s) =>
    scene(s.title, out.sceneChapter.get(s.title) || undefined, out.sceneAct.get(s.title) || undefined)
  );
  return { tree: buildOutline(out.acts, out.chapters, scenes), chapters: out.chapters, acts: out.acts };
}

describe("chapterRuns", () => {
  it("non-adjacent chapters with one name are separate runs", () => {
    const { runs, unassigned } = chapterRuns(
      [scene("s1", "Alice"), scene("s2", "Alice"), scene("s3", "Bob"), scene("s4", "Alice")],
      undefined
    );
    expect(runs.map((r) => [r.title, r.indices])).toEqual([
      ["Alice", [0, 1]],
      ["Bob", [2]],
      ["Alice", [3]],
    ]);
    expect(unassigned).toEqual([]);
  });

  it("derives deterministic, unique ids for unconfigured repeats", () => {
    const scenes = [scene("s1", "Alice"), scene("s2", "Bob"), scene("s3", "Alice"), scene("s4", "Bob"), scene("s5", "Alice")];
    const a = chapterRuns(scenes, undefined).runs.map((r) => r.id);
    expect(a).toEqual(["c:Alice", "c:Bob", "c:Alice~2", "c:Bob~2", "c:Alice~3"]);
    expect(chapterRuns(scenes, undefined).runs.map((r) => r.id)).toEqual(a);
    expect(isDerivedDuplicateId("c:Alice~2")).toBe(true);
    expect(isDerivedDuplicateId("c:Alice")).toBe(false);
    expect(isDerivedDuplicateId("sg-abc-1")).toBe(false);
  });

  it("a derived id never collides with a stored one", () => {
    // Run 2 is anchored to the entry whose id is "c:Alice"; run 1 is unconfigured.
    const cfg = [{ id: "c:Alice", title: "Alice", firstScene: "s3" }];
    const { runs } = chapterRuns([scene("s1", "Alice"), scene("s2", "Bob"), scene("s3", "Alice")], cfg);
    expect(runs.map((r) => r.id)).toEqual(["c:Alice~2", "c:Bob", "c:Alice"]);
  });

  it("an anchor splits two same-named chapters side by side", () => {
    const cfg = [
      { id: "ch-1", title: "Alice", firstScene: "s1", targetWords: 1000 },
      { id: "ch-2", title: "Alice", firstScene: "s3", targetWords: 2000 },
    ];
    const { runs } = chapterRuns([scene("s1", "Alice"), scene("s2", "Alice"), scene("s3", "Alice")], cfg);
    expect(runs.map((r) => [r.id, r.indices, r.cfg?.targetWords])).toEqual([
      ["ch-1", [0, 1], 1000],
      ["ch-2", [2], 2000],
    ]);
  });

  it("ignores an anchor whose scene is gone or carries another chapter", () => {
    const cfg = [
      { id: "ch-1", title: "Alice", firstScene: "s1" },
      { id: "ch-2", title: "Alice", firstScene: "deleted" },
      { id: "ch-3", title: "Alice", firstScene: "s2" }, // s2 is in Bob now
    ];
    const { runs, planned } = chapterRuns([scene("s1", "Alice"), scene("s2", "Bob"), scene("s3", "Alice")], cfg);
    // s3's run pairs by title order with the first unclaimed Alice entry.
    expect(runs.map((r) => r.id)).toEqual(["ch-1", "c:Bob", "ch-2"]);
    expect(planned.map((p) => p.id)).toEqual(["ch-3"]);
  });

  it("legacy configs (no anchors) pair by title in order; extra entries are planned", () => {
    // The pre-#58 bug left two "Alice" entries (the second added by "Add chapter")
    // over one run: the run keeps the ORIGINAL (first) entry and its target.
    const cfg = [
      { id: "orig", title: "Alice", targetWords: 3000, actId: "act-1" },
      { id: "added", title: "Alice" },
    ];
    const { runs, planned } = chapterRuns([scene("s1", "Alice")], cfg);
    expect(runs.map((r) => r.cfg?.id)).toEqual(["orig"]);
    expect(planned.map((p) => p.id)).toEqual(["added"]);
  });

  it("blank chapter strings are unassigned and break runs", () => {
    const { runs, unassigned } = chapterRuns(
      [scene("s1", "Alice"), scene("s2"), scene("s3", "Alice")],
      undefined
    );
    expect(runs.map((r) => r.indices)).toEqual([[0], [2]]);
    expect(unassigned).toEqual([1]);
  });
});

describe("buildOutline with shared chapter names (#58)", () => {
  it("keeps each same-named chapter's own target and act", () => {
    const acts = [
      { id: "act-1", title: "One" },
      { id: "act-2", title: "Two" },
    ];
    const chapters = [
      { id: "ch-a1", title: "Alice", actId: "act-1", targetWords: 1000, firstScene: "s1" },
      { id: "ch-b", title: "Bob", actId: "act-1", firstScene: "s2" },
      { id: "ch-a2", title: "Alice", actId: "act-2", targetWords: 2000, firstScene: "s3" },
    ];
    const t = buildOutline(acts, chapters, [
      scene("s1", "Alice", "One"),
      scene("s2", "Bob", "One"),
      scene("s3", "Alice", "Two"),
    ]);
    expect(t.acts[0].chapters.map((c) => [c.id, c.title, c.targetWords])).toEqual([
      ["ch-a1", "Alice", 1000],
      ["ch-b", "Bob", undefined],
    ]);
    expect(t.acts[1].chapters.map((c) => [c.id, c.title, c.targetWords])).toEqual([["ch-a2", "Alice", 2000]]);
  });

  it("adjacent same-named chapters survive a save/load round trip", () => {
    const chapters = [
      { id: "ch-1", title: "Alice" },
      { id: "ch-2", title: "Alice" },
    ];
    let t = buildOutline(undefined, chapters, [scene("s1"), scene("s2")]);
    t = moveScene(t, "s1", "ch-1");
    t = moveScene(t, "s2", "ch-2");
    const once = roundTrip(t);
    expect(chaptersOf(once.tree).map((c) => [c.id, c.scenes.map((s) => s.title)])).toEqual([
      ["ch-1", ["s1"]],
      ["ch-2", ["s2"]],
    ]);
    expect(once.chapters.map((c) => c.firstScene)).toEqual(["s1", "s2"]);
    // Stable: a second round trip changes nothing.
    expect(roundTrip(once.tree).chapters).toEqual(once.chapters);
  });

  it("filling empty Alice/Bob/Alice shells one scene at a time never merges", () => {
    const chapters = [
      { id: "a1", title: "Alice" },
      { id: "b", title: "Bob" },
      { id: "a2", title: "Alice" },
    ];
    const scenes: SceneIn[] = [scene("s1"), scene("s2"), scene("s3")];
    let state = { tree: buildOutline(undefined, chapters, scenes), chapters: chapters as StructureGroup[] };
    for (const [title, target] of [
      ["s1", "a1"],
      ["s3", "a2"], // while Bob is still empty: the two Alices sit side by side
      ["s2", "b"],
    ] as const) {
      state = roundTrip(moveScene(state.tree, title, target));
    }
    expect(chaptersOf(state.tree).map((c) => [c.id, c.title, c.scenes.map((s) => s.title)])).toEqual([
      ["a1", "Alice", ["s1"]],
      ["a2", "Alice", ["s3"]],
      ["b", "Bob", ["s2"]],
    ]);
  });

  it("an emptied derived duplicate is dropped; a user's empty chapter is kept", () => {
    // A stray s4 tagged "Alice" far from the Alice chapter splits off as c:Alice~2.
    const chapters = [
      { id: "sg-1", title: "Alice" },
      { id: "sg-2", title: "Bob" },
      { id: "sg-3", title: "Carol" }, // planned, empty
    ];
    const t = buildOutline(undefined, chapters, [
      scene("s1", "Alice"),
      scene("s2", "Bob"),
      scene("s3", "Bob"),
      scene("s4", "Alice"),
    ]);
    expect(chaptersOf(t).map((c) => c.id)).toEqual(["sg-1", "sg-2", "c:Alice~2", "sg-3"]);
    // Drag the stray back into the real Alice chapter.
    const out = serializeOutline(moveScene(t, "s4", "sg-1"));
    expect(out.chapters.map((c) => c.id)).toEqual(["sg-1", "sg-2", "sg-3"]);
    expect(out.order.map((s) => s.title)).toEqual(["s1", "s4", "s2", "s3"]);
  });

  it("a project with unique chapter names builds exactly as before", () => {
    const t = buildOutline(undefined, undefined, [
      scene("s1", "One", "1"),
      scene("s2", "One", "1"),
      scene("s3", "Two", "1"),
    ]);
    expect(t.acts[0].chapters.map((c) => [c.id, c.scenes.length])).toEqual([
      ["c:One", 2],
      ["c:Two", 1],
    ]);
  });
});

describe("sceneSlotForChapter", () => {
  it("points after the chapter's own last scene, else the nearest earlier one", () => {
    const chapters = [
      { id: "a", title: "Alice", firstScene: "s1" },
      { id: "b", title: "Bob", firstScene: "s2" },
      { id: "c", title: "Alice" }, // planned
    ];
    const t = buildOutline(undefined, chapters, [scene("s1", "Alice"), scene("s2", "Bob"), scene("s3", "Bob")]);
    expect(sceneSlotForChapter(t, "a")).toBe("s1");
    expect(sceneSlotForChapter(t, "c")).toBe("s3");
    expect(sceneSlotForChapter(buildOutline(undefined, [{ id: "x", title: "X" }], []), "x")).toBeUndefined();
  });
});

describe("anchor upkeep", () => {
  it("renameSceneInChapters follows a renamed opening scene", () => {
    const cfg = [{ id: "a", title: "Alice", firstScene: "Old" }, { id: "b", title: "Bob", firstScene: "Other" }];
    expect(renameSceneInChapters(cfg, "Old", "New")).toEqual([
      { id: "a", title: "Alice", firstScene: "New" },
      { id: "b", title: "Bob", firstScene: "Other" },
    ]);
    expect(renameSceneInChapters(cfg, "Nope", "New")).toBeNull();
    expect(renameSceneInChapters(undefined, "Old", "New")).toBeNull();
  });

  it("passChapterAnchors hands the anchor to the next scene, or drops it", () => {
    const cfg = [{ id: "a", title: "Alice", firstScene: "s2" }];
    const order = [{ title: "s1" }, { title: "s2" }, { title: "s3" }];
    expect(passChapterAnchors(cfg, order, "s2")).toEqual([{ id: "a", title: "Alice", firstScene: "s3" }]);
    expect(passChapterAnchors([{ id: "a", title: "Alice", firstScene: "s3" }], order, "s3")).toEqual([
      { id: "a", title: "Alice" },
    ]);
    expect(passChapterAnchors(cfg, order, "s1")).toBeNull();
  });
});

describe("compile group-by-chapter", () => {
  const step = BUILTIN_STEPS.find((s) => s.id === "group-by-chapter")!;
  const cs = (title: string, chapter: string, chapterStart?: boolean): CompileScene => ({
    title,
    indent: 0,
    contents: `${title} text`,
    chapter,
    ...(chapterStart ? { chapterStart } : {}),
  });

  it("gives two same-named chapters side by side a heading each", () => {
    const out = step.run(
      [cs("s1", "Alice", true), cs("s2", "Alice"), cs("s3", "Alice", true)],
      {},
      { format: "md" } as never
    ) as CompileScene[];
    expect(out.map((s) => s.contents)).toEqual(["# Alice\n\ns1 text\n\n* * *\n\ns2 text", "# Alice\n\ns3 text"]);
    // Without the flag (e.g. a hand-run step) same-named neighbours still merge.
    const merged = step.run([cs("s1", "Alice"), cs("s2", "Alice")], {}, { format: "md" } as never) as CompileScene[];
    expect(merged).toHaveLength(1);
  });
});

// --- Index writes: anchors stay consistent with the scene list ---------------

const INDEX_PATH = "Books/Book/Book.md";
const INDEX = `---
longform:
  format: scenes
  title: Book
  sceneFolder: Scenes
  scenes:
    - s1
    - s2
    - s3
  ignoredFiles: []
inkswell:
  chapters:
    - id: a1
      title: Alice
      firstScene: s1
    - id: a2
      title: Alice
      firstScene: s2
---
Body stays.
`;

describe("index writes keep chapter anchors", () => {
  let app: FakeApp;
  const chaptersIn = (): StructureGroup[] => {
    const cache = app.metadataCache.getFileCache(app.vault.getAbstractFileByPath(INDEX_PATH) as never);
    return ((cache?.frontmatter?.["inkswell"] as Record<string, unknown>)?.["chapters"] as StructureGroup[]) ?? [];
  };
  const scenesIn = (): string[] => {
    const cache = app.metadataCache.getFileCache(app.vault.getAbstractFileByPath(INDEX_PATH) as never);
    return ((cache?.frontmatter?.["longform"] as { scenes: string[] }).scenes ?? []).map(String);
  };

  beforeEach(() => {
    app = new FakeApp({ [INDEX_PATH]: INDEX });
  });

  it("renaming an opening scene renames its anchor in the same write", async () => {
    await renameSceneInIndex(app.asApp(), app.file(INDEX_PATH), "s2", "s2b");
    expect(scenesIn()).toEqual(["s1", "s2b", "s3"]);
    expect(chaptersIn().map((c) => c.firstScene)).toEqual(["s1", "s2b"]);
  });

  it("removing an opening scene passes its anchor on; the body is untouched", async () => {
    await removeSceneFromIndex(app.asApp(), app.file(INDEX_PATH), "s2");
    expect(scenesIn()).toEqual(["s1", "s3"]);
    expect(chaptersIn().map((c) => c.firstScene)).toEqual(["s1", "s3"]);
    expect(await app.vault.read(app.file(INDEX_PATH))).toContain("Body stays.");
  });

  it("two removals from the same pre-state both land (gotcha 10)", async () => {
    const file = app.file(INDEX_PATH);
    await removeSceneFromIndex(app.asApp(), file, "s2");
    await removeSceneFromIndex(app.asApp(), file, "s3");
    expect(scenesIn()).toEqual(["s1"]);
    // s2 passed its anchor to s3, which then left with no successor.
    expect(chaptersIn()).toEqual([
      { id: "a1", title: "Alice", firstScene: "s1" },
      { id: "a2", title: "Alice" },
    ]);
  });

  it("updateScenes without a chapters transform leaves chapters alone", async () => {
    await updateScenes(app.asApp(), app.file(INDEX_PATH), (s) => [...s, { title: "s4", indent: 0 }]);
    expect(scenesIn()).toEqual(["s1", "s2", "s3", "s4"]);
    expect(chaptersIn().map((c) => c.firstScene)).toEqual(["s1", "s2"]);
  });
});

describe("createScene into an empty chapter", () => {
  const PATH = "Books/Pov/Pov.md";
  const IDX = `---
longform:
  format: scenes
  title: Pov
  sceneFolder: Scenes
  scenes:
    - s1
  ignoredFiles: []
inkswell:
  chapters:
    - id: a1
      title: Alice
      firstScene: s1
    - id: a2
      title: Alice
---
`;

  it("anchors the chapter on its first scene in the same index write", async () => {
    const app = new FakeApp({ [PATH]: IDX, "Books/Pov/Scenes/s1.md": "---\nchapter: Alice\n---\nOne.\n" });
    const store = new ProjectStore(app.asApp());
    store.load();
    await flushAsync();
    const project = store.getProject(PATH)!;
    const settings = { baseFolder: "Inkswell", codexFolder: "Codex", coLocateCodex: true };
    const file = await createScene(app.asApp(), store, settings, project, {
      title: "s2",
      afterTitle: "s1",
      meta: { chapter: "Alice" },
      anchorChapter: "a2",
    });
    expect(file?.path).toBe("Books/Pov/Scenes/s2.md");
    const fm = app.metadataCache.getFileCache(app.file(PATH))?.frontmatter as Record<string, never>;
    const chapters = (fm["inkswell"] as { chapters: StructureGroup[] }).chapters;
    expect(chapters.map((c) => [c.id, c.firstScene])).toEqual([
      ["a1", "s1"],
      ["a2", "s2"],
    ]);
    // Rebuilt: two Alice chapters side by side, one scene each.
    const t = buildOutline(undefined, chapters, [scene("s1", "Alice"), scene("s2", "Alice")]);
    expect(chaptersOf(t).map((c) => [c.id, c.scenes.map((s) => s.title)])).toEqual([
      ["a1", ["s1"]],
      ["a2", ["s2"]],
    ]);
    store.unload();
  });

  it("never re-anchors a chapter that already has one", async () => {
    const app = new FakeApp({ [PATH]: IDX, "Books/Pov/Scenes/s1.md": "---\nchapter: Alice\n---\nOne.\n" });
    const store = new ProjectStore(app.asApp());
    store.load();
    await flushAsync();
    const settings = { baseFolder: "Inkswell", codexFolder: "Codex", coLocateCodex: true };
    await createScene(app.asApp(), store, settings, store.getProject(PATH)!, {
      title: "s0",
      meta: { chapter: "Alice" },
      anchorChapter: "a1",
    });
    const fm = app.metadataCache.getFileCache(app.file(PATH))?.frontmatter as Record<string, never>;
    expect((fm["inkswell"] as { chapters: StructureGroup[] }).chapters[0].firstScene).toBe("s1");
    store.unload();
  });
});

describe("plot grid rows", () => {
  it("each row is its own chapter: distinct ids and where a new scene goes", () => {
    const grid = buildPlotGrid(
      [
        { title: "s1", path: "s1.md", chapter: "Alice" },
        { title: "s2", path: "s2.md", chapter: "Bob" },
        { title: "s3", path: "s3.md", chapter: "Alice" },
        { title: "s4", path: "s4.md" },
      ],
      [{ id: "p1", title: "Main" }],
      [{ id: "plan", title: "Alice" }, { id: "sg-a", title: "Alice", firstScene: "s1" }],
      undefined
    );
    const rows = grid.groups.flatMap((g) => g.rows);
    expect(rows.map((r) => [r.label, r.chapterId, r.slotAfter])).toEqual([
      ["Alice", "sg-a", "s1"],
      ["Bob", "c:Bob", "s2"],
      ["Alice", "plan", "s3"],
      ["Kein Kapitel", null, undefined],
    ]);
  });
});

describe("numberRepeats (menu labels)", () => {
  it("numbers only the labels that repeat, by occurrence", () => {
    expect(numberRepeats(["Alice", "Bob", "Alice", "Carol"])).toEqual(["Alice (1)", "Bob", "Alice (2)", "Carol"]);
    expect(numberRepeats([])).toEqual([]);
  });
});
