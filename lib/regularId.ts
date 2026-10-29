import JSZip from "jszip";
import { ADVANCE, type FontKey } from "./metrics.ts";

/* -------------------------------------------------------------------------- */
/*  Data model                                                                */
/* -------------------------------------------------------------------------- */

export type RegularIdData = {
  name: string;
  designation: string;
  baseBranch: string;
  employeeNo: string;
  dateHired: string; // ISO yyyy-mm-dd
  sss: string;
  tin: string;
  hdmf: string;
  phic: string;
  birthdate: string; // ISO yyyy-mm-dd
  addressLine1: string; // purok / street / barangay (sits beside the ADDRESS label)
  addressLine2: string; // municipality, province (centred underneath)
  emergencyName: string;
  emergencyPhone: string;
};

export const EMPTY_DATA: RegularIdData = {
  name: "",
  designation: "",
  baseBranch: "",
  employeeNo: "",
  dateHired: "",
  sss: "",
  tin: "",
  hdmf: "",
  phic: "",
  birthdate: "",
  addressLine1: "",
  addressLine2: "",
  emergencyName: "",
  emergencyPhone: "",
};

export type FieldKey = keyof RegularIdData;

/* -------------------------------------------------------------------------- */
/*  Text boxes on the card: font, size range and usable width                 */
/*  (values measured from the template's DrawingML; 12700 EMU = 1 pt)         */
/* -------------------------------------------------------------------------- */

const EMU_PT = 12700;
const INSET = 91440 * 2; // left + right text-box inset

type Fit = { font: FontKey; basePt: number; minPt: number; innerPt: number };

const fit = (font: FontKey, basePt: number, minPt: number, boxEmu: number): Fit => ({
  font,
  basePt,
  minPt,
  innerPt: (boxEmu - INSET) / EMU_PT,
});

export const FIT: Record<FieldKey, Fit> = {
  name: fit("calibriBold", 12, 8, 2068317),
  designation: fit("calibriBold", 11, 7, 1936750),
  baseBranch: fit("calibriBold", 10, 7, 1936751),
  employeeNo: fit("arialBold", 10, 7, 888365),
  dateHired: fit("arial", 7.5, 6, 1139916),
  sss: fit("arial", 8, 6, 1139916),
  tin: fit("arial", 8, 6, 1139916),
  hdmf: fit("arial", 8, 6, 1139916),
  phic: fit("arial", 8, 6, 1139916),
  birthdate: fit("arial", 8, 6, 1139916),
  addressLine1: fit("arial", 8, 6, 1139916),
  addressLine2: fit("arial", 7, 5.5, 1997800),
  emergencyName: fit("arialBold", 9, 6.5, 1945005),
  emergencyPhone: fit("arialBold", 9, 6.5, 1945005),
};

export function textWidthPt(text: string, font: FontKey, sizePt: number): number {
  const table = ADVANCE[font];
  let units = 0;
  for (const ch of text) units += table[ch] ?? 600;
  return (units * sizePt) / 1000;
}

/* -------------------------------------------------------------------------- */
/*  Normalising user input                                                    */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

/** "2025-02-24" -> "FEBRUARY 24, 2025" (no locale/timezone dependence). */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return "";
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

export function cleanText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
}

export function displayText(key: FieldKey, data: RegularIdData): string {
  if (key === "dateHired" || key === "birthdate") return formatDate(data[key]);
  return cleanText(data[key]);
}

export type Line = {
  text: string;
  sizePt: number;
  /** Half-points, as stored in w:sz */
  halfPts: number;
  /** True when the text still does not fit at the smallest allowed size. */
  overflow: boolean;
};

export function fitLine(key: FieldKey, text: string): Line {
  const f = FIT[key];
  let size = f.basePt;
  while (size > f.minPt && textWidthPt(text, f.font, size) > f.innerPt) size -= 0.5;
  const overflow = textWidthPt(text, f.font, size) > f.innerPt;
  return { text, sizePt: size, halfPts: Math.round(size * 2), overflow };
}

export function computeLines(data: RegularIdData): Record<FieldKey, Line> {
  const out = {} as Record<FieldKey, Line>;
  (Object.keys(FIT) as FieldKey[]).forEach((k) => {
    out[k] = fitLine(k, displayText(k, data));
  });
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Filling the Word template                                                 */
/*                                                                            */
/*  The card is a DrawingML group (with a VML fallback copy). Its 16 text     */
/*  boxes appear in the same order in both copies, so we patch box N in each. */
/* -------------------------------------------------------------------------- */

const TEXTBOXES_PER_COPY = 16;

/** Index of each text box inside the template. */
const BOX = {
  addressLine2: 0,
  values: 2,
  emergency: 3,
  name: 12,
  designation: 13,
  baseBranch: 14,
  employeeNo: 15,
} as const;

const VALUE_ORDER: FieldKey[] = [
  "dateHired",
  "sss",
  "tin",
  "hdmf",
  "phic",
  "birthdate",
  "addressLine1",
];

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function setSize(rPr: string, halfPts: number): string {
  const size = `<w:sz w:val="${halfPts}"/><w:szCs w:val="${halfPts}"/>`;
  if (!rPr) return `<w:rPr>${size}</w:rPr>`;
  const stripped = rPr
    .replace(/<w:sz\s[^>]*\/>/g, "")
    .replace(/<w:szCs\s[^>]*\/>/g, "");
  return stripped.replace("</w:rPr>", `${size}</w:rPr>`);
}

/** Replace a paragraph's text, keeping its paragraph and first-run formatting. */
function rewriteParagraph(p: string, line: Line, baseHalfPts: number): string {
  const open = /^<w:p(?:\s[^>]*)?>/.exec(p)?.[0];
  if (!open || !p.endsWith("</w:p>")) return p;
  const pPr = /<w:pPr>[\s\S]*?<\/w:pPr>/.exec(p)?.[0] ?? "";
  const rest = p.slice(open.length, p.length - "</w:p>".length).replace(pPr, "");
  let rPr = /<w:r(?:\s[^>]*)?>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/.exec(rest)?.[1] ?? "";
  if (!rPr) rPr = /<w:rPr>[\s\S]*?<\/w:rPr>/.exec(pPr)?.[0] ?? "";
  // Only touch the size when the text had to shrink, so untouched boxes stay byte-identical.
  if (line.halfPts !== baseHalfPts) rPr = setSize(rPr, line.halfPts);
  return `${open}${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(line.text)}</w:t></w:r></w:p>`;
}

const PARAGRAPH = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>|<w:p(?:\s[^>]*)?\/>/g;

function rewriteBox(inner: string, keys: FieldKey[], lines: Record<FieldKey, Line>): string {
  let i = 0;
  return inner.replace(PARAGRAPH, (p) => {
    const key = keys[i++];
    if (!key) return p;
    return rewriteParagraph(p, lines[key], Math.round(FIT[key].basePt * 2));
  });
}

function patchDocumentXml(xml: string, data: RegularIdData): string {
  const lines = computeLines(data);
  const plan: Record<number, FieldKey[]> = {
    [BOX.addressLine2]: ["addressLine2"],
    [BOX.values]: VALUE_ORDER,
    [BOX.emergency]: ["emergencyName", "emergencyPhone"],
    [BOX.name]: ["name"],
    [BOX.designation]: ["designation"],
    [BOX.baseBranch]: ["baseBranch"],
    [BOX.employeeNo]: ["employeeNo"],
  };

  let count = 0;
  const patched = xml.replace(
    /<w:txbxContent>([\s\S]*?)<\/w:txbxContent>/g,
    (whole, inner: string) => {
      const idx = count++ % TEXTBOXES_PER_COPY;
      const keys = plan[idx];
      if (!keys) return whole;
      return `<w:txbxContent>${rewriteBox(inner, keys, lines)}</w:txbxContent>`;
    },
  );
  if (count === 0 || count % TEXTBOXES_PER_COPY !== 0) {
    throw new Error(
      `Template layout changed: found ${count} text boxes, expected a multiple of ${TEXTBOXES_PER_COPY}.`,
    );
  }
  return patched;
}

/** The photo is the one picture that sits outside the card group. */
function findPhotoRelId(xml: string): string {
  const withoutGroup = xml.replace(/<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g, "");
  const m = /<a:blip\s+r:embed="(rId\d+)"/.exec(withoutGroup);
  if (!m) throw new Error("Template layout changed: photo picture not found.");
  return m[1];
}

function replacePhoto(xml: string, relId: string): string {
  // The template crops the sample photo; the uploaded one is already cropped to the frame.
  const re = new RegExp(`(<a:blip\\s+r:embed="${relId}"[\\s\\S]*?</a:blip>)<a:srcRect[^>]*/>`);
  return xml.replace(re, "$1<a:srcRect/>");
}

async function photoTarget(zip: JSZip, relId: string): Promise<string> {
  const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
  const m = new RegExp(`<Relationship\\s[^>]*Id="${relId}"[^>]*Target="([^"]+)"`).exec(rels)
    ?? new RegExp(`<Relationship\\s[^>]*Target="([^"]+)"[^>]*Id="${relId}"`).exec(rels);
  if (!m) throw new Error("Template layout changed: photo relationship not found.");
  return `word/${m[1]}`;
}

export async function fillRegularTemplate(
  template: ArrayBuffer | Uint8Array,
  data: RegularIdData,
  photoPng: Uint8Array | null,
): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(template);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("Not a valid Word template.");

  let xml = patchDocumentXml(await docFile.async("string"), data);

  if (photoPng) {
    const relId = findPhotoRelId(xml);
    const target = await photoTarget(zip, relId);
    xml = replacePhoto(xml, relId);
    zip.file(target, photoPng);
  }

  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function fileNameFor(data: RegularIdData): string {
  const base = cleanText(data.name).replace(/[\\/:*?"<>|]+/g, "").trim() || "EMPLOYEE";
  return `ID - ${base}.docx`;
}
