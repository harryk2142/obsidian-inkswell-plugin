/**
 * The writer's own scene fields (#52) — pure, Obsidian-free, tested.
 *
 * Defined in the vault-wide scene template note under `scene-fields`, in the
 * same format as a codex template's `codex-fields` (an ordered map of
 * key → type hint / {type, label}), and edited from Customize → Scene inspector
 * fields. Values live as plain frontmatter keys on each scene; they show only in
 * the Scene Inspector (Board, Grid, compile and the story bible ignore them).
 */

import {
  FIELDS_KEY,
  FieldSpec,
  ProfileField,
  humanizeKey,
  parseFieldSpec,
  parseTypeHint,
} from "../codex/profile-schema";
import { FIELD_KEYS } from "./scene-meta";

/** Frontmatter key on the scene template note listing the writer's fields. */
export const SCENE_FIELDS_KEY = "scene-fields";

/**
 * Keys a custom scene field may not use: Inkswell's own scene keys (metadata
 * form + revision audit), the template spec keys, codex keys (a `codex:` key
 * would turn the scene into a codex entry), and Obsidian's core properties.
 */
export const SCENE_RESERVED_KEYS: ReadonlySet<string> = new Set([
  ...FIELD_KEYS,
  "revScene",
  "revSceneNote",
  "revPurpose",
  "revVerdict",
  "revOpening",
  "revArc",
  SCENE_FIELDS_KEY,
  FIELDS_KEY,
  "codex",
  "codex-series",
  "codex-project",
  "aliases",
  "tags",
  "cssclasses",
]);

/** Parse a template's `scene-fields` value ([] when absent or unreadable). */
export function parseSceneFieldSpec(raw: unknown): FieldSpec[] {
  return parseFieldSpec(raw, SCENE_RESERVED_KEYS) ?? [];
}

/**
 * Spec → inspector fields. No codex catalog lookup (a scene field named `type`
 * must not inherit a codex placeholder), no aliases, and no image fields —
 * scenes have no portrait. An unknown hint falls back to single-line text.
 */
export function sceneFieldsFromSpec(spec: readonly FieldSpec[]): ProfileField[] {
  const out: ProfileField[] = [];
  for (const entry of spec) {
    const hint = entry.type ? parseTypeHint(entry.type) : null;
    if (hint?.type === "image") continue;
    const field: ProfileField = {
      key: entry.key,
      label: entry.label ?? humanizeKey(entry.key),
      type: hint?.type ?? "text",
    };
    if (hint?.type === "links") {
      if (hint.linkCategory) field.linkCategory = hint.linkCategory;
      if (hint.single) field.single = true;
      if (hint.labeled) field.labeled = true;
    }
    out.push(field);
  }
  return out;
}
