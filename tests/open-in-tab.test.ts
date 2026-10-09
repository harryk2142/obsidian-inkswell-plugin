// @vitest-environment happy-dom
/**
 * `attachOpenInTab` (#53): Ctrl/Cmd-click and middle-click open the scene in a
 * regular tab INSTEAD of the row's own click; a plain click is untouched.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attachOpenInTab } from "../src/lib/row-menu";

function row(): { el: HTMLElement; own: ReturnType<typeof vi.fn>; open: ReturnType<typeof vi.fn> } {
  const el = document.createElement("div");
  const child = document.createElement("span");
  el.appendChild(child);
  document.body.appendChild(el);
  const own = vi.fn();
  el.onclick = own;
  const open = vi.fn();
  attachOpenInTab(el, open);
  return { el, own, open };
}

describe("attachOpenInTab", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("mod-click opens and blocks the row's own click", () => {
    const { el, own, open } = row();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(own).not.toHaveBeenCalled();
  });

  it("blocks the row's click when the mod-click lands on a child", () => {
    const { el, own, open } = row();
    el.querySelector("span")!.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(own).not.toHaveBeenCalled();
  });

  it("leaves a plain click alone", () => {
    const { el, own, open } = row();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(open).not.toHaveBeenCalled();
    expect(own).toHaveBeenCalledTimes(1);
  });

  it("middle-click (auxclick, button 1) opens", () => {
    const { el, open } = row();
    el.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 1 }));
    expect(open).toHaveBeenCalledTimes(1);
    el.dispatchEvent(new MouseEvent("auxclick", { bubbles: true, button: 2 }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("adds the hint to an existing label on desktop", () => {
    const el = document.createElement("div");
    el.setAttribute("aria-label", "Open in Write");
    attachOpenInTab(el, () => {});
    expect(el.getAttribute("aria-label")).toBe("Open in Write · Ctrl/Cmd-click to open in a new tab");
  });
});
