import JSZip from "jszip";
import { ADVANCE } from "./metrics.ts";
import { ARIAL_BLACK, ARIAL_BLACK_DEFAULT, CAMBRIA_BOLD } from "./metricsNonReg.ts";

/* -------------------------------------------------------------------------- */
/*  Data model                                                                */
/* -------------------------------------------------------------------------- */

export type NonRegularIdData = {
  name: string;
  designation: string;
  employeeNo: string;
  birthdate: string; // ISO yyyy-mm-dd
  sss: string;
  phic: string;
  hdmf: string;
  tin: string;
  address: string; // free text, wraps over up to 3 lines on the back
  emergencyName: string;
  emergencyPhone: string;
};

export const EMPTY_DATA: NonRegularIdData = {
  name: "",
  designation: "",
  employeeNo: "",
  birthdate: "",
  sss: "",
  phic: "",
  hdmf: "",
  tin: "",
  address: "",
  emergencyName: "",
  emergencyPhone: "",
};

export type FieldKey = keyof NonRegularIdData;

/** One template sheet holds four ID cards (front + back each). */
export const MAX_CARDS = 4;

/** Printed in place of a blank value so it can be filled in by hand. */
export const BLANK_LINE = "____________";

/* -------------------------------------------------------------------------- */
/*  Fitting text into the fixed boxes                                         */
/*  (sizes/widths measured from the template's DrawingML; 12700 EMU = 1 pt)   */
/* -------------------------------------------------------------------------- */

const EMU_PT = 12700;

type FontKey = "arialBold" | "cambriaBold" | "arialBlack";

function advance(font: FontKey, ch: string): number {
  if (font === "arialBold") return ADVANCE.arialBold[ch] ?? 600;
  if (font === "cambriaBold") return CAMBRIA_BOLD[ch] ?? 600;
  return ARIAL_BLACK[ch] ?? ARIAL_BLACK_DEFAULT;
}

export function textWidthPt(text: string, font: FontKey, sizePt: number): number {
  let units = 0;
  for (const ch of text) units += advance(font, ch);
  return (units * sizePt) / 1000;
}

type Fit = { font: FontKey; basePt: number; minPt: number; innerPt: number };

/** innerPt = box width minus the left+right text inset. */
const fit = (font: FontKey, basePt: number, minPt: number, boxEmu: number, insetEmu: number): Fit => ({
  font,
  basePt,
  minPt,
  innerPt: (boxEmu - insetEmu * 2) / EMU_PT,
});

export const FIT = {
  name: fit("arialBold", 12, 8, 2048084, 36576),
  designation: fit("cambriaBold", 8, 6, 2051844, 36576),
  employeeNo: fit("arialBlack", 5, 4, 449147, 36576),
  emergencyName: fit("arialBold", 10, 7, 2011797, 36576),
  emergencyPhone: fit("arialBold", 12, 8, 1606163, 36576),
  address: fit("arialBold", 7, 5.5, 2011797, 91440),
} as const;

/** Back-card rows: label column is a 0.5" hanging indent, then ": value". */
export const HANG_PT = 36;
export const ADDRESS_MAX_LINES = 3;
const ROW_PT = 6; // label + value size for every row except the address value

export type Line = {
  text: string;
  sizePt: number;
  /** Half-points, as stored in w:sz */
  halfPts: number;
  /** True when the text still does not fit at the smallest allowed size. */
  overflow: boolean;
};

export function fitLine(key: Exclude<keyof typeof FIT, "address">, text: string): Line {
  const f = FIT[key];
  let size = f.basePt;
  while (size > f.minPt && textWidthPt(text, f.font, size) > f.innerPt) size -= 0.5;
  const overflow = textWidthPt(text, f.font, size) > f.innerPt;
  return { text, sizePt: size, halfPts: Math.round(size * 2), overflow };
}

/** Greedy word wrap, the same way Word breaks lines (at spaces). */
export function wrapAddress(text: string, sizePt: number): { lines: string[]; tooWide: boolean } {
  const f = FIT.address;
  const room = f.innerPt - HANG_PT;
  const colonPt = textWidthPt(": ", "arialBold", ROW_PT);
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  let tooWide = false;
  for (const w of words) {
    const limit = lines.length === 0 ? room - colonPt : room;
    const next = cur ? `${cur} ${w}` : w;
    if (textWidthPt(next, f.font, sizePt) <= limit) {
      cur = next;
    } else if (cur) {
      lines.push(cur);
      cur = w;
      if (textWidthPt(w, f.font, sizePt) > room) tooWide = true;
    } else {
      cur = w; // a single word wider than the line
      tooWide = true;
    }
  }
  if (cur) lines.push(cur);
  return { lines, tooWide };
}

export type AddressLine = Line & { lineCount: number };

export function fitAddress(text: string): AddressLine {
  const f = FIT.address;
  let size = f.basePt;
  let w = wrapAddress(text, size);
  while (size > f.minPt && (w.lines.length > ADDRESS_MAX_LINES || w.tooWide)) {
    size -= 0.5;
    w = wrapAddress(text, size);
  }
  return {
    text,
    sizePt: size,
    halfPts: Math.round(size * 2),
    overflow: w.lines.length > ADDRESS_MAX_LINES || w.tooWide,
    lineCount: Math.max(1, w.lines.length),
  };
}

/* -------------------------------------------------------------------------- */
/*  Normalising user input                                                    */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "1990-10-07" -> "October 7, 1990" (no locale/timezone dependence). */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return "";
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

/** Collapse whitespace/control characters. */
export function tidy(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

export const cleanUpper = (s: string) => tidy(s).toUpperCase();

export type Row = { label: string; text: string; blank: boolean };

export type CardLayout = {
  name: Line;
  designation: Line;
  employeeNo: Line;
  emergencyName: Line;
  emergencyPhone: Line;
  address: AddressLine;
  /** Birth date, SSS, PhilHealth, HDMF, TIN - in print order. */
  rows: Row[];
  /** Address text is replaced by a blank line when empty. */
  addressBlank: boolean;
};

export function computeCard(d: NonRegularIdData): CardLayout {
  const addr = tidy(d.address);
  const row = (label: string, v: string): Row => {
    const text = tidy(v);
    return { label, text: text || BLANK_LINE, blank: !text };
  };
  return {
    name: fitLine("name", cleanUpper(d.name)),
    designation: fitLine("designation", cleanUpper(d.designation)),
    employeeNo: fitLine("employeeNo", tidy(d.employeeNo)),
    emergencyName: fitLine("emergencyName", cleanUpper(d.emergencyName)),
    emergencyPhone: fitLine("emergencyPhone", tidy(d.emergencyPhone)),
    address: fitAddress(addr || BLANK_LINE),
    addressBlank: !addr,
    rows: [
      row("Birth Date", formatDate(d.birthdate)),
      row("SSS", d.sss),
      row("Philhealth", d.phic),
      row("HDMF", d.hdmf),
      row("TIN", d.tin),
    ],
  };
}

/** Which form fields are too long even at the smallest size. */
export function overflowFields(layout: CardLayout): Partial<Record<FieldKey, boolean>> {
  return {
    name: layout.name.overflow,
    designation: layout.designation.overflow,
    employeeNo: layout.employeeNo.overflow,
    emergencyName: layout.emergencyName.overflow,
    emergencyPhone: layout.emergencyPhone.overflow,
    address: layout.address.overflow,
  };
}

/* -------------------------------------------------------------------------- */
/*  Filling the Word template                                                 */
/*                                                                            */
/*  The sheet has 4 slots (front + back of one card each). Every slot is a    */
/*  DrawingML group with a VML fallback copy, 17 text boxes per copy.         */
/*  Boxes are rebuilt from scratch so a blanked template works the same as    */
/*  the original sample sheet.                                                */
/* -------------------------------------------------------------------------- */

const BOXES_PER_COPY = 17;
const COPIES_PER_SLOT = 2; // DrawingML + VML fallback
const SLOT_COUNT = 4;

/** Index of each editable text box inside one copy. */
const BOX = {
  emergencyName: 5,
  emergencyPhone: 6,
  details: 7,
  designation: 8,
  employeeNo: 10,
  name: 11,
} as const;

/**
 * In the XML the slots run bottom-right, bottom-left, top-right, top-left.
 * Card 1 goes top-left, then top-right, bottom-left, bottom-right.
 */
const XML_SLOT_FOR_CARD = [3, 2, 1, 0] as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const sz = (halfPts: number) => `<w:sz w:val="${halfPts}"/><w:szCs w:val="${halfPts}"/>`;
const ARIAL = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
const BLACK = '<w:rFonts w:ascii="Arial Black" w:hAnsi="Arial Black"/>';
const CAMBRIA = '<w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/>';
const WHITE = '<w:color w:val="FFFFFF" w:themeColor="background1"/>';
const BOLD = "<w:b/><w:bCs/>";

const run = (rPr: string, text: string) =>
  text ? `<w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>` : "";

/** A single-paragraph text box (name, designation, phone ...). */
function simpleBox(rPr: string, centered: boolean, text: string): string {
  const jc = centered ? '<w:jc w:val="center"/>' : "";
  return `<w:p><w:pPr><w:widowControl w:val="0"/>${jc}<w:rPr>${rPr}</w:rPr></w:pPr>${run(rPr, text)}</w:p>`;
}

const HANG = '<w:ind w:left="720" w:hanging="720"/>';

function detailRow(
  label: string,
  value: string,
  valueHalfPts: number,
  line: number,
  labelHalfPts = ROW_PT * 2,
): string {
  const lab = `${ARIAL}<w:b/>${sz(labelHalfPts)}`;
  const val = `${ARIAL}<w:b/>${sz(valueHalfPts)}<w:u w:val="single"/>`;
  const mark = `${ARIAL}<w:b/>${sz(valueHalfPts)}`;
  return (
    `<w:p><w:pPr><w:spacing w:after="0" w:line="${line}" w:lineRule="auto"/>${HANG}<w:rPr>${mark}</w:rPr></w:pPr>` +
    `<w:r><w:rPr>${lab}</w:rPr><w:t>${esc(label)}</w:t></w:r>` +
    `<w:r><w:rPr>${lab}</w:rPr><w:tab/><w:t xml:space="preserve">: </w:t></w:r>` +
    `<w:r><w:rPr>${val}</w:rPr><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p>`
  );
}

function spacer(line: number): string {
  return (
    `<w:p><w:pPr><w:spacing w:after="0" w:line="${line}" w:lineRule="auto"/>${HANG}` +
    `<w:rPr>${ARIAL}<w:b/>${sz(ROW_PT * 2)}</w:rPr></w:pPr></w:p>`
  );
}

function detailsBox(c: CardLayout): string {
  return (
    detailRow("Address", c.address.text, c.address.halfPts, 240) +
    spacer(240) +
    c.rows.map((r) => detailRow(r.label, r.text, ROW_PT * 2, 276)).join("") +
    spacer(276) +
    spacer(240)
  );
}

function boxContents(c: CardLayout | null): Record<number, string> {
  const white = (half: number) => `${ARIAL}${BOLD}${WHITE}${sz(half)}`;
  const t = (l: Line | undefined) => l?.text ?? "";
  const h = (l: Line | undefined, base: number) => l?.halfPts ?? base;
  return {
    [BOX.emergencyName]: simpleBox(white(h(c?.emergencyName, 20)), true, t(c?.emergencyName)),
    [BOX.emergencyPhone]: simpleBox(white(h(c?.emergencyPhone, 24)), true, t(c?.emergencyPhone)),
    [BOX.details]: c ? detailsBox(c) : spacer(240),
    [BOX.designation]: simpleBox(`${CAMBRIA}${BOLD}${sz(h(c?.designation, 16))}`, true, t(c?.designation)),
    [BOX.employeeNo]: simpleBox(`${BLACK}${BOLD}${WHITE}${sz(h(c?.employeeNo, 10))}`, false, t(c?.employeeNo)),
    [BOX.name]: simpleBox(white(h(c?.name, 24)), true, t(c?.name)),
  };
}

/** Rewrites the text boxes of one slot (both the DrawingML and the VML copy). */
function patchSlot(slotXml: string, card: CardLayout | null): string {
  const contents = boxContents(card);
  let count = 0;
  const out = slotXml.replace(/<w:txbxContent>[\s\S]*?<\/w:txbxContent>/g, (whole) => {
    const idx = count++ % BOXES_PER_COPY;
    const next = contents[idx];
    return next === undefined ? whole : `<w:txbxContent>${next}</w:txbxContent>`;
  });
  if (count !== BOXES_PER_COPY * COPIES_PER_SLOT) {
    throw new Error(
      `Template layout changed: found ${count} text boxes in a card slot, expected ${BOXES_PER_COPY * COPIES_PER_SLOT}.`,
    );
  }
  return out;
}

const SLOT = /<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g;

function patchDocumentXml(xml: string, cards: (CardLayout | null)[]): string {
  let n = 0;
  const patched = xml.replace(SLOT, (slot) => {
    const xmlSlot = n++;
    const cardIdx = XML_SLOT_FOR_CARD.indexOf(xmlSlot as 0 | 1 | 2 | 3);
    const card = cards[cardIdx];
    // Unused slots are removed so the sample cards never print.
    return card === undefined ? "" : patchSlot(slot, card);
  });
  if (n !== SLOT_COUNT) {
    throw new Error(`Template layout changed: found ${n} card slots, expected ${SLOT_COUNT}.`);
  }
  return patched;
}

/**
 * Fill the template with 1-4 employees. With `blank: true` every slot is kept but emptied
 * (used to build the shipped template and the preview background).
 */
export async function fillNonRegularTemplate(
  template: ArrayBuffer | Uint8Array,
  employees: NonRegularIdData[],
  opts: { blank?: boolean } = {},
): Promise<Uint8Array> {
  if (!opts.blank && (employees.length < 1 || employees.length > MAX_CARDS)) {
    throw new Error(`A sheet holds 1 to ${MAX_CARDS} IDs.`);
  }
  const zip = await JSZip.loadAsync(template);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Not a valid Word template.");

  const cards: (CardLayout | null)[] = opts.blank
    ? Array.from({ length: SLOT_COUNT }, () => null)
    : employees.map(computeCard);

  zip.file("word/document.xml", patchDocumentXml(await docFile.async("string"), cards));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function fileNameFor(employees: NonRegularIdData[]): string {
  const clean = (s: string) => cleanUpper(s).replace(/[\\/:*?"<>|]+/g, "").trim();
  const first = clean(employees[0]?.name ?? "") || "EMPLOYEE";
  return employees.length > 1
    ? `IDs - ${first} (+${employees.length - 1} more).docx`
    : `ID - ${first}.docx`;
}