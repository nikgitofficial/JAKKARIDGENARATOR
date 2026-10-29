// Builds public/templates/regular-id.docx from the original Word file:
// every personal value is blanked and the sample photo is replaced by a neutral placeholder,
// so no real employee data ships with the app.
//
//   node scripts/make-template.mjs "<path to original REGULAR ID.docx>" [--transparent-photo <out.docx>]
import { readFileSync, writeFileSync } from "node:fs";
import JSZip from "jszip";
import { fillRegularTemplate, EMPTY_DATA } from "../lib/regularId.ts";

const [src, ...rest] = process.argv.slice(2);
if (!src) {
  console.error('Usage: node scripts/make-template.mjs "<original.docx>" [--transparent-photo <out.docx>]');
  process.exit(1);
}

async function build(photoFile, out) {
  const photo = new Uint8Array(readFileSync(new URL(`./assets/${photoFile}`, import.meta.url)));
  const filled = await fillRegularTemplate(readFileSync(src), EMPTY_DATA, photo);

  // Drop author metadata from the original file.
  const zip = await JSZip.loadAsync(filled);
  let core = await zip.file("docProps/core.xml").async("string");
  core = core
    .replace(/<dc:creator>[^<]*<\/dc:creator>/, "<dc:creator></dc:creator>")
    .replace(/<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy></cp:lastModifiedBy>");
  zip.file("docProps/core.xml", core);
  writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("wrote", out);
}

await build("photo-placeholder.png", new URL("../public/templates/regular-id.docx", import.meta.url).pathname);
const i = rest.indexOf("--transparent-photo");
if (i >= 0) await build("photo-transparent.png", rest[i + 1]);
