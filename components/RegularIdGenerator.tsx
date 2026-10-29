"use client";

import { useMemo, useState } from "react";
import CardPreview from "./CardPreview";
import PhotoField, { type Photo } from "./PhotoField";
import {
  EMPTY_DATA,
  computeLines,
  fileNameFor,
  fillRegularTemplate,
  type FieldKey,
  type RegularIdData,
} from "@/lib/regularId";

const digits = (s: string) => s.replace(/\D/g, "");

/** Apply a 0/1 mask like "XX-XXXXXXX-X" to a run of digits. */
function mask(s: string, pattern: string) {
  const d = digits(s);
  let out = "";
  let i = 0;
  for (const ch of pattern) {
    if (i >= d.length) break;
    if (ch === "X") out += d[i++];
    else out += ch;
  }
  return out;
}

const formatters: Partial<Record<FieldKey, (v: string) => string>> = {
  sss: (v) => (/^[\d-]*$/.test(v) ? mask(v, "XX-XXXXXXX-X") : v),
  tin: (v) => (/^[\d-]*$/.test(v) ? mask(v, "XXX-XXX-XXX-XXXX") : v),
  hdmf: (v) => (/^\d*$/.test(v) ? digits(v).slice(0, 12) : v),
  phic: (v) => (/^\d*$/.test(v) ? digits(v).slice(0, 12) : v),
  emergencyPhone: (v) => (/^[\d ]*$/.test(v) ? mask(v, "XXXX XXX XXXX") : v),
};

type FieldDef = {
  key: FieldKey;
  label: string;
  placeholder?: string;
  type?: "text" | "date";
  required?: boolean;
  inputMode?: "numeric" | "tel";
  hint?: string;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Employee",
    fields: [
      { key: "name", label: "Full name", placeholder: "JUAN D. DELA CRUZ", required: true },
      { key: "designation", label: "Designation", placeholder: "ROUTE SALES AGENT", required: true },
      { key: "baseBranch", label: "Base branch", placeholder: "TAGUM", required: true },
      { key: "employeeNo", label: "Employee no.", placeholder: "2025016", required: true },
    ],
  },
  {
    title: "Government IDs & dates",
    fields: [
      { key: "dateHired", label: "Date hired", type: "date" },
      { key: "sss", label: "SSS", placeholder: "09-3581447-1", inputMode: "numeric" },
      { key: "tin", label: "TIN", placeholder: "389-579-006-0000", inputMode: "numeric" },
      { key: "hdmf", label: "HDMF (Pag-IBIG)", placeholder: "121166622247", inputMode: "numeric" },
      { key: "phic", label: "PHIC (PhilHealth)", placeholder: "160507044376", inputMode: "numeric" },
      { key: "birthdate", label: "Birthdate", type: "date" },
    ],
  },
  {
    title: "Address",
    fields: [
      {
        key: "addressLine1",
        label: "Address, line 1",
        placeholder: "PRK. SAMPAO,",
        hint: "Sits beside the ADDRESS label — keep it short.",
      },
      { key: "addressLine2", label: "Address, line 2", placeholder: "KAPALONG, DAVAO DEL NORTE" },
    ],
  },
  {
    title: "In case of emergency",
    fields: [
      { key: "emergencyName", label: "Contact person", placeholder: "MARIA DELA CRUZ" },
      { key: "emergencyPhone", label: "Contact number", placeholder: "0910 051 8893", inputMode: "tel" },
    ],
  },
];

export default function RegularIdGenerator() {
  const [data, setData] = useState<RegularIdData>(EMPTY_DATA);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoKey, setPhotoKey] = useState(0); // remounts the photo editor on "Clear"
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const lines = useMemo(() => computeLines(data), [data]);
  const missing = SECTIONS.flatMap((s) => s.fields)
    .filter((f) => f.required && !data[f.key].trim())
    .map((f) => f.label);

  function set(key: FieldKey, value: string) {
    const f = formatters[key];
    setData((d) => ({ ...d, [key]: f ? f(value) : value.toUpperCase() }));
    setStatus(null);
  }

  async function download() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/templates/regular-id.docx");
      if (!res.ok) throw new Error("Could not load the ID template.");
      const bytes = await fillRegularTemplate(await res.arrayBuffer(), data, photo?.bytes ?? null);
      const blob = new Blob([bytes as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameFor(data);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus({ kind: "ok", text: `Downloaded ${fileNameFor(data)}` });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  function clearAll() {
    setData(EMPTY_DATA);
    setPhoto(null);
    setPhotoKey((k) => k + 1);
    setStatus(null);
  }

  return (
    <main className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">ID generator</p>
          <h1>Regular employee ID</h1>
        </div>
        <p className="privacy">Everything is made in your browser — nothing is uploaded.</p>
      </header>

      <div className="grid">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!missing.length) void download();
          }}
        >
          {SECTIONS.map((section) => (
            <fieldset key={section.title}>
              <legend>{section.title}</legend>
              <div className="fields">
                {section.fields.map((f) => {
                  const overflow = lines[f.key].overflow;
                  return (
                    <label key={f.key} className={`field${f.key === "name" || f.key === "designation" ? " wide" : ""}`}>
                      <span>
                        {f.label}
                        {f.required && <b aria-hidden> *</b>}
                      </span>
                      <input
                        type={f.type ?? "text"}
                        value={data[f.key]}
                        placeholder={f.placeholder}
                        inputMode={f.inputMode}
                        autoComplete="off"
                        spellCheck={false}
                        required={f.required}
                        aria-invalid={overflow || undefined}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                      {overflow ? (
                        <small className="error">Too long for the ID — shorten it or it will wrap.</small>
                      ) : (
                        f.hint && <small>{f.hint}</small>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <fieldset>
            <legend>Photo</legend>
            <PhotoField key={photoKey} onChange={setPhoto} />
          </fieldset>

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={busy || missing.length > 0}>
              {busy ? "Preparing…" : "Download Word (.docx)"}
            </button>
            <button type="button" className="btn-secondary" onClick={clearAll}>
              Clear form
            </button>
          </div>
          {missing.length > 0 && <p className="hint">Still needed: {missing.join(", ")}.</p>}
          <p className={`status ${status?.kind ?? ""}`} role="status" aria-live="polite">
            {status?.text}
          </p>
        </form>

        <aside className="preview" aria-label="Preview">
          <div className="paper">
            <CardPreview data={data} photoUrl={photo?.url ?? null} />
          </div>
          <p className="hint center">Front on top, back below — as printed on the Word page.</p>
        </aside>
      </div>
    </main>
  );
}
