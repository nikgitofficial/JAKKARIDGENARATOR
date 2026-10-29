import { readFile, writeFile } from "node:fs/promises";
import { fillNonRegularTemplate, fileNameFor } from "../lib/nonRegularId.ts";

const base = {
  designation: "ROUTE SALES AGENT", birthdate: "1990-10-07", sss: "07-2615665-2", phic: "170255903325",
  hdmf: "121219369653", tin: "403-042-464-000", emergencyName: "Maria Dela Cruz", emergencyPhone: "0910 051 8893",
};
const all = [
  { ...base, name: "John Anthony T. Porillo", employeeNo: "2026027", address: "Blk.27, Lot 18, Ph 1 Elenita Hgts. Brgy.,Cat.Grande, Davao City" },
  { ...base, name: "Loreto G. Delmoro", designation: "Booking Sales Agent", employeeNo: "2025089", address: "Purok 22-A, Malamboon, Brgy. 76-A Bucana, Davao City", tin: "", birthdate: "1980-08-21" },
  { ...base, name: "John Rusty C. Doring", employeeNo: "2025088", address: "Deca Homes Talomo, Davao City", emergencyName: "Rudy Doring" },
  { ...base, name: "Juan Dela Cruz Jr.", employeeNo: "2024001", address: "" },
];
const n = Number(process.argv[2] ?? 4);
const tpl = await readFile(new URL("../public/templates/non-regular-id.docx", import.meta.url));
const bytes = await fillNonRegularTemplate(tpl, all.slice(0, n));
await writeFile("./nonreg-sample.docx", bytes);
console.log(fileNameFor(all.slice(0, n)), bytes.length);