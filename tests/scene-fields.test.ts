/**
 * The writer's own scene fields (#52): spec parsing with the scene reserved set,
 * spec → inspector fields (no codex catalog, no image), the inspector layout's
 * "Your fields" block, template keys never copied into new scenes, and list
 * fields written as deltas (gotcha 10).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { FIELDS_KEY, serializeFieldSpec } from "../src/codex/profile-schema";
import { isValidNewKey, rowsToSpec } from "../src/customize/field-spec";
import { createSceneFile } from "../src/outliner/create-scene";
import {
  SCENE_FIELDS_KEY,
  SCENE_RESERVED_KEYS,
  parseSceneFieldSpec,
  sceneFieldsFromSpec,
} from "../src/scenes/scene-fields";
import { inspectorFields, updateSceneList } from "../src/scenes/scene-meta";
import { resolveSceneFields } from "../src/scenes/scene-template-io";
import { FakeApp } from "./fakes/fake-app";

const SETTINGS = { baseFolder: "Inkswell", codexFolder: "Codex", coLocateCodex: true };

describe("parseSceneFieldSpec", () => {
  it("keeps the writer's keys in order and drops Inkswell's own scene keys", () => {
    const spec = parseSceneFieldSpec({
      incitingIncident: "textarea",
      status: "text",
      revScene: "text",
      tags: "list",
      codex: "text",
      turningPoint: null,
      antagonist: "link:character",
    });
    expect(spec.map((s) => s.key)).toEqual(["incitingIncident", "turningPoint", "antagonist"]);
  });

  it("is [] when absent or unreadable", () => {
    expect(parseSceneFieldSpec(undefined)).toEqual([]);
    expect(parseSceneFieldSpec(42)).toEqual([]);
  });

  it("round-trips through serializeFieldSpec with the scene reserved set", () => {
    const value = serializeFieldSpec(
      [{ key: "crisis", type: "textarea", label: "The crisis" }, { key: "pov", type: "text" }],
      SCENE_RESERVED_KEYS
    );
    expect(value).toEqual({ crisis: { type: "textarea", label: "The crisis" } });
    expect(parseSceneFieldSpec(value)).toEqual([{ key: "crisis", type: "textarea", label: "The crisis" }]);
  });
});

describe("sceneFieldsFromSpec", () => {
  it("derives labels from keys — never a codex field's label or placeholder", () => {
    const [type] = sceneFieldsFromSpec([{ key: "type" }]);
    expect(type).toEqual({ key: "type", label: "Type", type: "text" });
  });

  it("maps kinds and link options; drops image fields", () => {
    const fields = sceneFieldsFromSpec([
      { key: "crisis", type: "textarea", label: "Crisis" },
      { key: "beats", type: "list" },
      { key: "allies", type: "links:character:labeled" },
      { key: "antagonist", type: "link:character" },
      { key: "mood", type: "image" },
      { key: "odd", type: "nonsense" },
    ]);
    expect(fields.map((f) => f.key)).toEqual(["crisis", "beats", "allies", "antagonist", "odd"]);
    expect(fields[2]).toMatchObject({ type: "links", linkCategory: "character", labeled: true });
    expect(fields[3]).toMatchObject({ type: "links", linkCategory: "character", single: true });
    expect(fields[4].type).toBe("text");
  });
});

describe("Customize helpers with scene rules", () => {
  it("rowsToSpec takes a default-label function (labels equal to it aren't stored)", () => {
    const spec = rowsToSpec(
      [
        { id: "turningPoint", key: "turningPoint", label: "Turning point", kind: "text" },
        { id: "crisis", key: "crisis", label: "The crisis", kind: "textarea" },
      ],
      (k) => (k === "turningPoint" ? "Turning point" : "Crisis")
    );
    expect(spec).toEqual([
      { key: "turningPoint", type: "text" },
      { key: "crisis", type: "textarea", label: "The crisis" },
    ]);
  });

  it("isValidNewKey rejects Inkswell's scene keys with the scene reserved set", () => {
    expect(isValidNewKey("pov", [], "POV", SCENE_RESERVED_KEYS)).toMatchObject({ ok: false });
    expect(isValidNewKey("revScene", [], "", SCENE_RESERVED_KEYS)).toMatchObject({ ok: false });
    expect(isValidNewKey("crisis", [], "Crisis", SCENE_RESERVED_KEYS)).toEqual({ ok: true });
  });
});

describe("inspector layout", () => {
  it("has a movable 'Your fields' block before Notes, hideable as a whole", () => {
    const ids = inspectorFields().map((f) => f.id);
    expect(ids.indexOf("custom")).toBe(ids.indexOf("notes") - 1);
    expect(inspectorFields({ hidden: ["custom"] }).find((f) => f.id === "custom")?.hidden).toBe(true);
  });
});

describe("scene template I/O", () => {
  const TEMPLATE = "Inkswell/Templates/Scene.md";
  let app: FakeApp;

  beforeEach(() => {
    app = new FakeApp({
      [TEMPLATE]:
        "---\nscene-fields:\n  crisis: textarea\n  antagonist: link:character\ncodex-fields:\n  - role\nmood: tense\n---\n# {{title}}\n",
    });
  });

  it("resolveSceneFields reads the template's scene-fields", () => {
    expect(resolveSceneFields(app.asApp(), SETTINGS).map((f) => f.key)).toEqual(["crisis", "antagonist"]);
  });

  it("a new scene never inherits scene-fields or codex-fields; other template keys carry over", async () => {
    const file = await createSceneFile(app.asApp(), SETTINGS, {}, "Book/Scenes/New.md", "New");
    const raw = app.vault.raw(file.path);
    expect(raw).not.toContain(SCENE_FIELDS_KEY);
    expect(raw).not.toContain(FIELDS_KEY);
    expect(raw).toContain("mood: tense");
    expect(raw).toContain("# New");
  });
});

describe("custom list fields write as deltas", () => {
  const SCENE = "Book/Scenes/Alpha.md";

  it("two adds from the same stale render both survive", async () => {
    const app = new FakeApp({ [SCENE]: "---\nstatus: draft\n---\nProse.\n" });
    const file = app.file(SCENE);
    await updateSceneList(app.asApp(), file, "obstacles", (cur) => [...cur, "the locked gate"]);
    await updateSceneList(app.asApp(), file, "obstacles", (cur) => [...cur, "the night watch"]);
    const fm = app.metadataCache.getFileCache(file as never)?.frontmatter ?? {};
    expect(fm["obstacles"]).toEqual(["the locked gate", "the night watch"]);
    expect(app.vault.raw(SCENE)).toContain("Prose.");
  });
});
