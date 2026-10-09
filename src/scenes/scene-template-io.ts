/**
 * I/O for the vault-wide scene template note (`<base>/Templates/Scene.md`) —
 * the Customize → Scene template editor's target. Per-project `sceneTemplate`
 * overrides are resolved (not edited) by outliner/create-scene.ts.
 */

import { App, TFile, normalizePath } from "obsidian";
import { FolderSettings, joinPath, resolveTemplateFolder } from "../settings/folders";
import { SCENE_TEMPLATE_BASENAME, starterSceneTemplate } from "./scene-template";
import type { ProfileField } from "../codex/profile-schema";
import { CategoryDef, CategoryOverrides, categoryLabel } from "../codex/types";
import { SCENE_FIELDS_KEY, parseSceneFieldSpec, sceneFieldsFromSpec } from "./scene-fields";

/** Path of the vault-wide scene template note. */
export function sceneTemplatePath(settings: FolderSettings): string {
  return normalizePath(joinPath(resolveTemplateFolder(settings), `${SCENE_TEMPLATE_BASENAME}.md`));
}

/** The vault-wide scene template note, or null when none exists. */
export function resolveVaultSceneTemplate(app: App, settings: FolderSettings): TFile | null {
  const f = app.vault.getAbstractFileByPath(sceneTemplatePath(settings));
  return f instanceof TFile ? f : null;
}

/**
 * The writer's own scene fields (#52), from the vault-wide template's
 * `scene-fields` — even when a project uses its own body template (one rule).
 * Reads the metadata cache only; cheap enough per render.
 */
export function resolveSceneFields(app: App, settings: FolderSettings): ProfileField[] {
  const template = resolveVaultSceneTemplate(app, settings);
  if (!template) return [];
  const fm = app.metadataCache.getFileCache(template)?.frontmatter as Record<string, unknown> | undefined;
  return sceneFieldsFromSpec(parseSceneFieldSpec(fm?.[SCENE_FIELDS_KEY]));
}

/** What `renderSceneMetaFields` needs to show the writer's own fields. */
export function sceneFieldExtras(
  app: App,
  settings: FolderSettings & { customCategories: CategoryDef[]; categoryOverrides: CategoryOverrides }
): { customFields: ProfileField[]; typeLabel: (id: string) => string } {
  return {
    customFields: resolveSceneFields(app, settings),
    typeLabel: (id) => categoryLabel(id, settings.customCategories, settings.categoryOverrides),
  };
}

/** The vault-wide scene template: existing, else a fresh starter. Never clobbers. */
export async function ensureSceneTemplate(app: App, settings: FolderSettings): Promise<TFile> {
  const existing = resolveVaultSceneTemplate(app, settings);
  if (existing) return existing;
  const folder = resolveTemplateFolder(settings);
  if (folder && !app.vault.getAbstractFileByPath(folder)) {
    try {
      await app.vault.createFolder(folder);
    } catch {
      /* exists / race */
    }
  }
  return app.vault.create(sceneTemplatePath(settings), starterSceneTemplate());
}
