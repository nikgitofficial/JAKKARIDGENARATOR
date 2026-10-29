// Fills a template with sample data and writes the result, for visual comparison.
//   node scripts/verify.mjs <template.docx> <out.docx> [sample|long] [photo.png]
import { readFileSync, writeFileSync } from "node:fs";
import { fillRegularTemplate } from "../lib/regularId.ts";

const [tpl, out, which = "sample", photoPath] = process.argv.slice(2);
const SAMPLES = {
  sample: {
    name: "Jappet John S. Calledo", designation: "Route Sales Agent", baseBranch: "Tagum", employeeNo: "2025016",
    dateHired: "2025-02-24", sss: "09-3581447-1", tin: "389-579-006-0000", hdmf: "121166622247", phic: "160507044376",
    birthdate: "1995-08-14", addressLine1: "Prk.Sampao,", addressLine2: "Kapalong, Davao del Norte",
    emergencyName: "Rheabel Kaye Calledo", emergencyPhone: "0910 051 8893",
  },
  long: {
    name: "Maria Cristina Magdalena Villanueva-Dela Cruz", designation: "Senior Accounting & Finance Assistant", baseBranch: "General Santos City",
    employeeNo: "2025016789", dateHired: "2025-09-30", sss: "09-3581447-1", tin: "389-579-006-0000", hdmf: "121166622247", phic: "160507044376",
    birthdate: "1995-09-28", addressLine1: "Purok 7 Barangay Sampao", addressLine2: "Kapalong, Davao del Norte",
    emergencyName: "Jose Protacio Rizal Mercado y Alonso", emergencyPhone: "0910 051 8893",
  },
};
const bytes = await fillRegularTemplate(readFileSync(tpl), SAMPLES[which], photoPath ? new Uint8Array(readFileSync(photoPath)) : null);
writeFileSync(out, bytes);
console.log("wrote", out, bytes.length);
