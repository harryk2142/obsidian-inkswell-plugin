import { describe, expect, it } from "vitest";
import { numberWord, planScaffold } from "../src/outliner/scaffold-plan";
import { templateActs } from "../src/outliner/beat-templates";
import { resolveTemplate } from "../src/outliner/custom-templates";

describe("numberWord", () => {
  it("spells 1–99", () => {
    expect(numberWord(1)).toBe("One");
    expect(numberWord(15)).toBe("Fifteen");
    expect(numberWord(20)).toBe("Twenty");
    expect(numberWord(21)).toBe("Twenty-One");
    expect(numberWord(27)).toBe("Twenty-Seven");
    expect(numberWord(99)).toBe("Ninety-Nine");
  });

  it("falls back to digits out of range", () => {
    expect(numberWord(0)).toBe("0");
    expect(numberWord(100)).toBe("100");
  });
});

/** Beat count per act title, in act order. */
function split(templateId: string): Array<[string, number]> {
  const plan = planScaffold(resolveTemplate(templateId)!, templateActs(templateId));
  return plan.acts.map((a) => [
    a.title,
    plan.scenes.filter((s) => s.actTitle === a.title).length,
  ]);
}

describe("planScaffold act boundaries", () => {
  it("save-the-cat splits 5/7/3 (Break Into Two/Three start their acts)", () => {
    expect(split("save-the-cat")).toEqual([["Akt I", 5], ["Akt II", 7], ["Akt III", 3]]);
  });

  it("three-act splits 2/3/2", () => {
    expect(split("three-act")).toEqual([["Akt I", 2], ["Akt II", 3], ["Akt III", 2]]);
  });

  it("heros-journey splits 4/5/3", () => {
    expect(split("heros-journey")).toEqual([["Akt I", 4], ["Akt II", 5], ["Akt III", 3]]);
  });

  it("seven-point splits 1/5/1", () => {
    expect(split("seven-point")).toEqual([["Akt I", 1], ["Akt II", 5], ["Akt III", 1]]);
  });

  it("story-circle splits 2/4/2", () => {
    expect(split("story-circle")).toEqual([["Akt I", 2], ["Akt II", 4], ["Akt III", 2]]);
  });

  it("romancing-the-beat uses Gwen Hayes' four part names, 4/3/4/3", () => {
    expect(split("romancing-the-beat")).toEqual([
      ["Ausgangslage", 4],
      ["Verlieben", 3],
      ["Rückzug", 4],
      ["Kampf um die Liebe", 3],
    ]);
  });

  it("twenty-seven-chapter splits 9/9/9", () => {
    expect(split("twenty-seven-chapter")).toEqual([["Akt I", 9], ["Akt II", 9], ["Akt III", 9]]);
  });

  it("ten-point splits 3/4/3", () => {
    expect(split("ten-point")).toEqual([["Akt I", 3], ["Akt II", 4], ["Akt III", 3]]);
  });
});

describe("planScaffold shape", () => {
  const plan = planScaffold(resolveTemplate("save-the-cat")!, templateActs("save-the-cat"));

  it("numbers chapters globally across acts, one per beat, unique", () => {
    expect(plan.chapters).toHaveLength(15);
    expect(plan.chapters[0].title).toBe("Chapter One");
    expect(plan.chapters[5].title).toBe("Chapter Six"); // first Act II chapter continues the count
    expect(plan.chapters[14].title).toBe("Chapter Fifteen");
    expect(new Set(plan.chapters.map((c) => c.title)).size).toBe(15);
  });

  it("pairs each scene with its beat, chapter, and act", () => {
    const s = plan.scenes[5];
    expect(s.beatId).toBe("break-into-2");
    expect(s.title).toBe("Aufbruch in Akt II");
    expect(s.chapterTitle).toBe("Chapter Six");
    expect(s.actTitle).toBe("Akt II");
    expect(s.synopsis).toContain("neue Welt");
  });

  it("chapter actIndex points into the emitted acts", () => {
    for (const c of plan.chapters) {
      expect(plan.acts[c.actIndex]).toBeDefined();
    }
  });

  it("omits acts that receive no beats", () => {
    const acts = [
      { title: "A", from: 0 },
      { title: "Empty", from: 0.4 },
      { title: "B", from: 0.5 },
    ];
    const beats = [
      { id: "x", name: "X", position: 0, blurb: "" },
      { id: "y", name: "Y", position: 0.9, blurb: "" },
    ];
    const p = planScaffold(beats, acts);
    expect(p.acts.map((a) => a.title)).toEqual(["A", "B"]);
  });

  it("unknown template id resolves to null — no silent Save-the-Cat fallback", () => {
    // The old getTemplate() fell back to Save the Cat, which would render the
    // wrong beat keyspace over a sheet's assignments. Callers must handle null.
    expect(resolveTemplate("nope")).toBeNull();
    expect(templateActs("nope").length).toBeGreaterThan(0); // acts still have a generic fallback
  });
});
