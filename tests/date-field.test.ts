// @vitest-environment happy-dom
/**
 * #59 — a Date kind for your scene fields (and codex type fields): parsing,
 * value coercion, the spec round trip, and the control itself (date input,
 * commit timing, the non-date fallback, unknown types never becoming a link
 * picker). The DOM part runs under happy-dom with Obsidian's DOM helpers
 * (`createEl`/`createDiv`/`createSpan`, `instanceOf`, `doc`) polyfilled.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { isDateKey, normalizeDate } from "../src/lib/date-key";
import {
  ProfileField,
  ProfileValue,
  coerceValue,
  parseFieldSpec,
  parseTypeHint,
  serializeFieldSpec,
} from "../src/codex/profile-schema";
import { renderProfileFieldControl } from "../src/codex/profile-field-controls";
import { preserveFocus, tagField } from "../src/lib/focus-preserve";
import { sceneFieldsFromSpec, parseSceneFieldSpec } from "../src/scenes/scene-fields";
import { FIELD_KINDS, FIELD_KIND_LABELS } from "../src/customize/field-spec";

describe("date keys", () => {
  it.each([
    ["2026-03-14", true],
    ["2024-02-29", true], // leap year
    ["2026-02-29", false],
    ["1900-02-29", false], // century, not leap
    ["2000-02-29", true],
    ["0042-07-01", true], // an in-story year below 100 stays itself
    ["0000-01-01", false],
    ["2026-13-01", false],
    ["2026-3-14", false],
    ["Spring 1204", false],
  ])("isDateKey(%s) = %s", (v, ok) => {
    expect(isDateKey(v)).toBe(ok);
  });

  it("normalizes date-times and Date objects to the date key", () => {
    expect(normalizeDate("2026-03-14")).toBe("2026-03-14");
    expect(normalizeDate(" 2026-03-14 ")).toBe("2026-03-14");
    expect(normalizeDate("2026-03-14T09:30")).toBe("2026-03-14");
    expect(normalizeDate("2026-03-14T09:30:00.000Z")).toBe("2026-03-14");
    expect(normalizeDate(new Date(Date.UTC(2026, 2, 14)))).toBe("2026-03-14");
    expect(normalizeDate("2026-02-30")).toBeNull();
    expect(normalizeDate("Spring 1204")).toBeNull();
    expect(normalizeDate(20260314)).toBeNull();
    expect(normalizeDate(new Date(Number.NaN))).toBeNull();
  });
});

describe("date fields in the spec", () => {
  const dateField: ProfileField = { key: "storyDate", label: "Story date", type: "date" };

  it("parses the `date` hint and round-trips it", () => {
    expect(parseTypeHint("date")).toEqual({ type: "date" });
    expect(parseTypeHint(" Date ")).toEqual({ type: "date" });
    const spec = parseFieldSpec({ storyDate: "date", mood: "text" });
    expect(serializeFieldSpec(spec)).toEqual({ storyDate: "date", mood: "text" });
  });

  it("scene fields accept the date kind", () => {
    const fields = sceneFieldsFromSpec(parseSceneFieldSpec({ storyDate: { type: "date", label: "In-story date" } }));
    expect(fields).toEqual([{ key: "storyDate", label: "In-story date", type: "date" }]);
  });

  it("is offered in the kind dropdown with a label", () => {
    expect(FIELD_KINDS).toContain("date");
    expect(FIELD_KIND_LABELS.date).toBe("Date");
  });

  it("coerces any calendar date to its key and keeps other text as written", () => {
    expect(coerceValue(dateField, "2026-03-14")).toBe("2026-03-14");
    expect(coerceValue(dateField, "2026-03-14T08:00")).toBe("2026-03-14");
    expect(coerceValue(dateField, new Date(Date.UTC(1999, 11, 31)))).toBe("1999-12-31");
    expect(coerceValue(dateField, "Spring 1204")).toBe("Spring 1204");
    expect(coerceValue(dateField, undefined)).toBe("");
  });
});

// --- The control ---------------------------------------------------------------

beforeAll(() => {
  const node = Node.prototype as unknown as Record<string, unknown>;
  if (!("instanceOf" in node)) {
    Object.defineProperty(Node.prototype, "instanceOf", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value(this: Node, cls: any): boolean {
        return this instanceof cls;
      },
      configurable: true,
    });
  }
  if (!("doc" in node)) {
    Object.defineProperty(Node.prototype, "doc", {
      get(this: Node): Document {
        return this.ownerDocument ?? (this as unknown as Document);
      },
      configurable: true,
    });
  }
  type Opts = { cls?: string; text?: string; type?: string; attr?: Record<string, string> };
  const el = Element.prototype as unknown as Record<string, unknown>;
  if (!("createEl" in el)) {
    Object.defineProperty(Element.prototype, "createEl", {
      value(this: HTMLElement, tag: string, o: Opts = {}): HTMLElement {
        const child = document.createElement(tag);
        if (o.cls) child.className = o.cls;
        if (o.text) child.textContent = o.text;
        if (o.type) (child as HTMLInputElement).type = o.type;
        for (const [k, v] of Object.entries(o.attr ?? {})) child.setAttribute(k, v);
        this.appendChild(child);
        return child;
      },
      configurable: true,
    });
    Object.defineProperty(Element.prototype, "createDiv", {
      value(this: HTMLElement, o: Opts = {}): HTMLElement {
        return (this as unknown as { createEl: (t: string, o: Opts) => HTMLElement }).createEl("div", o);
      },
      configurable: true,
    });
    Object.defineProperty(Element.prototype, "createSpan", {
      value(this: HTMLElement, o: Opts = {}): HTMLElement {
        return (this as unknown as { createEl: (t: string, o: Opts) => HTMLElement }).createEl("span", o);
      },
      configurable: true,
    });
  }
});

function mount(field: ProfileField, value: ProfileValue | undefined) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const saved: ProfileValue[] = [];
  renderProfileFieldControl(host, {
    app: {} as never,
    field,
    value,
    candidates: () => [{ name: "Anna", category: "character" }],
    typeLabel: (id) => id,
    tagPrefix: "scene:x",
    saveValue: (v) => saved.push(v),
    updateList: () => undefined,
  });
  return { host, saved };
}

describe("date control", () => {
  const field: ProfileField = { key: "storyDate", label: "Story date", type: "date" };

  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.className = "";
  });

  it("renders a date input holding the stored key", () => {
    const { host } = mount(field, "2026-03-14");
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("date");
    expect(input.value).toBe("2026-03-14");
    expect(input.dataset.inkswellField).toBe("scene:x:storyDate");
  });

  it("desktop: a change while focused waits for blur; blur commits once", () => {
    const { host, saved } = mount(field, "");
    const input = host.querySelector("input") as HTMLInputElement;
    input.focus();
    input.value = "2026-03-14";
    input.dispatchEvent(new Event("change"));
    expect(saved).toEqual([]); // still typing — no save, no rebuild
    input.blur();
    expect(saved).toEqual(["2026-03-14"]);
    input.dispatchEvent(new Event("blur"));
    expect(saved).toEqual(["2026-03-14"]); // unchanged → no second write
  });

  it("Enter commits; clearing saves an empty value", () => {
    const { host, saved } = mount(field, "2026-03-14");
    const input = host.querySelector("input") as HTMLInputElement;
    input.focus();
    input.value = "";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(saved).toEqual([""]);
  });

  it("touch: the native picker's change commits at once", () => {
    document.body.classList.add("is-mobile");
    const { host, saved } = mount(field, "");
    const input = host.querySelector("input") as HTMLInputElement;
    input.focus();
    input.value = "2026-03-14";
    input.dispatchEvent(new Event("change"));
    expect(saved).toEqual(["2026-03-14"]);
  });

  it("a stored value that isn't a date shows as text with a hint, untouched", () => {
    const { host, saved } = mount(field, "Spring 1204");
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.value).toBe("Spring 1204");
    expect(host.textContent).toContain("Kein Kalenderdatum");
    expect(saved).toEqual([]);
    // Typing a real date there saves the key.
    input.value = "2026-03-14";
    input.dispatchEvent(new Event("change"));
    expect(saved).toEqual(["2026-03-14"]);
  });

  it("an unknown type renders a text input, never the link picker", () => {
    const { host } = mount({ key: "x", label: "X", type: "wibble" as never }, "kept");
    expect(host.querySelector("select")).toBeNull();
    const input = host.querySelector("input") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(input.value).toBe("kept");
  });
});

describe("focus restore for date inputs", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.className = "";
  });

  const rebuildable = (host: HTMLElement, value: string) => {
    host.innerHTML = "";
    const d = document.createElement("input");
    d.type = "date";
    tagField(d, "scene:x:storyDate");
    d.value = value;
    host.appendChild(d);
    return d;
  };

  it("keeps an uncommitted date across a rebuild (desktop)", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const first = rebuildable(host, "");
    first.focus();
    first.value = "2026-03-14";
    preserveFocus(host, () => rebuildable(host, ""));
    const next = host.querySelector("input") as HTMLInputElement;
    expect(next.value).toBe("2026-03-14");
    expect(document.activeElement).toBe(next);
  });

  it("does not refocus on touch (would reopen the native picker)", () => {
    document.body.classList.add("is-mobile");
    const host = document.createElement("div");
    document.body.appendChild(host);
    rebuildable(host, "2026-03-14").focus();
    preserveFocus(host, () => rebuildable(host, "2026-03-14"));
    expect(document.activeElement).not.toBe(host.querySelector("input"));
  });
});
