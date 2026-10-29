"use client";

import { useMemo, useState } from "react";
import NonRegularCardPreview from "./NonRegularCardPreview";
import "./nonRegular.css";
import {
  EMPTY_DATA,
  MAX_CARDS,
  computeCard,
  fileNameFor,
  fillNonRegularTemplate,
  overflowFields,
  type FieldKey,
  type NonRegularIdData,
} from "@/lib/nonRegularId";

const digits = (s: string) => s.replace(/\D/g, "");

/** Apply a mask like "XX-XXXXXXX-X" to a run of digits. */
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
  sss: (v) => (/^[\d\s-]*$/.test(v) ? mask(v, "XX-XXXXXXX-X") : v),
  tin: (v) => (/^[\d\s-]*$/.test(v) ? mask(v, "XXX-XXX-XXX-XXXX") : v),
  hdmf: (v) => (/^[\d\s]*$/.test(v) ? digits(v).slice(0, 12) : v),
  phic: (v) => (/^[\d\s]*$/.test(v) ? digits(v).slice(0, 12) : v),
  emergencyPhone: (v) => (/^[\d ]*$/.test(v) ? mask(v, "XXXX XXX XXXX") : v),
};

/** Fields that are printed exactly as typed instead of in capitals. */
const KEEP_CASE: FieldKey[] = ["address"];

type FieldDef = {
  key: FieldKey;
  label: string;
  placeholder?: string;
  type?: "text" | "date";
  required?: boolean;
  inputMode?: "numeric" | "tel";
  hint?: string;
  wide?: boolean;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Employee",
    fields: [
      { key: "name", label: "Full name", placeholder: "JUAN D. DELA CRUZ", required: true, wide: true },
      { key: "designation", label: "Designation", placeholder: "BOOKING SALES AGENT", required: true },
      { key: "employeeNo", label: "ID no.", placeholder: "2025089", required: true },
    ],
  },
  {
    title: "Back of the ID",
    fields: [
      {
        key: "address",
        label: "Address",
        placeholder: "Purok 22-A, Malamboon, Brgy. 76-A Bucana, Davao City",
        wide: true,
        hint: "Printed as typed. Wraps over up to 3 lines.",
      },
      { key: "birthdate", label: "Birth date", type: "date" },
      { key: "sss", label: "SSS", placeholder: "09-1996650-7", inputMode: "numeric" },
      { key: "phic", label: "PhilHealth", placeholder: "160502765946", inputMode: "numeric" },
      { key: "hdmf", label: "HDMF (Pag-IBIG)", placeholder: "109003192248", inputMode: "numeric" },
      { key: "tin", label: "TIN", placeholder: "403-042-464-000", inputMode: "numeric", hint: "Any empty value prints as a blank line to write in." },
    ],
  },
  {
    title: "In case of emergency",
    fields: [
      { key: "emergencyName", label: "Contact person", placeholder: "MARIA DELA CRUZ" },
      { key: "emergencyPhone", label: "Contact number", placeholder: "0948 129 5425", inputMode: "tel" },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);
const POSITIONS = ["top left", "top right", "bottom left", "bottom right"];

const missingFor = (d: NonRegularIdData) => ALL_FIELDS.filter((f) => f.required && !d[f.key].trim()).map((f) => f.label);

export default function NonRegularIdGenerator() {
  const [cards, setCards] = useState<NonRegularIdData[]>([EMPTY_DATA]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const data = cards[active];
  const overflow = useMemo(() => overflowFields(computeCard(data)), [data]);
  const problems = cards
    .map((c, i) => ({ n: i + 1, missing: missingFor(c) }))
    .filter((p) => p.missing.length > 0);

  function set(key: FieldKey, value: string) {
    const f = formatters[key];
    const next = f ? f(value) : KEEP_CASE.includes(key) ? value : value.toUpperCase();
    setCards((cs) => cs.map((c, i) => (i === active ? { ...c, [key]: next } : c)));
    setStatus(null);
  }

  function addCard() {
    if (cards.length >= MAX_CARDS) return;
    setCards((cs) => [...cs, EMPTY_DATA]);
    setActive(cards.length);
    setStatus(null);
  }

  function removeCard() {
    if (cards.length < 2) return;
    setCards((cs) => cs.filter((_, i) => i !== active));
    setActive((a) => Math.max(0, a - (a === cards.length - 1 ? 1 : 0)));
    setStatus(null);
  }

  function clearAll() {
    setCards([EMPTY_DATA]);
    setActive(0);
    setStatus(null);
  }

  async function download() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/templates/non-regular-id.docx");
      if (!res.ok) throw new Error("Could not load the ID template.");
      const bytes = await fillNonRegularTemplate(await res.arrayBuffer(), cards);
      const blob = new Blob([bytes as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileNameFor(cards);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setStatus({ kind: "ok", text: `Downloaded ${fileNameFor(cards)}` });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">ID generator</p>
          <h1>Non-regular employee ID</h1>
        </div>
        <p className="privacy">Everything is made in your browser — nothing is uploaded.</p>
      </header>

      <div className="grid wide">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!problems.length) void download();
          }}
        >
          <div className="id-tabs" role="tablist" aria-label="IDs on this sheet">
            {cards.map((c, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === active}
                className={`id-tab${i === active ? " on" : ""}`}
                onClick={() => setActive(i)}
              >
                {i + 1}. {c.name.trim() ? c.name.split(" ")[0] : "New ID"}
              </button>
            ))}
            {cards.length < MAX_CARDS && (
              <button type="button" className="id-tab add" onClick={addCard}>
                + Add ID
              </button>
            )}
          </div>
          <p className="hint">
            One Word page holds up to {MAX_CARDS} IDs (front and back). ID {active + 1} prints{" "}
            {POSITIONS[active]}.
          </p>

          {SECTIONS.map((section) => (
            <fieldset key={section.title}>
              <legend>{section.title}</legend>
              <div className="fields">
                {section.fields.map((f) => (
                  <label key={f.key} className={`field${f.wide ? " wide" : ""}`}>
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
                      aria-invalid={overflow[f.key] || undefined}
                      className={KEEP_CASE.includes(f.key) ? "keep-case" : undefined}
                      onChange={(e) => set(f.key, e.target.value)}
                    />
                    {overflow[f.key] ? (
                      <small className="error">
                        {f.key === "address"
                          ? "Too long for the ID — it needs more than 3 lines. Shorten it."
                          : "Too long for the ID — shorten it or it will wrap."}
                      </small>
                    ) : (
                      f.hint && <small>{f.hint}</small>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="actions">
            <button type="submit" className="btn-primary" disabled={busy || problems.length > 0}>
              {busy ? "Preparing…" : `Download Word (.docx)${cards.length > 1 ? ` — ${cards.length} IDs` : ""}`}
            </button>
            {cards.length > 1 && (
              <button type="button" className="btn-secondary" onClick={removeCard}>
                Remove ID {active + 1}
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={clearAll}>
              Clear form
            </button>
          </div>
          {problems.length > 0 && (
            <p className="hint">
              Still needed:{" "}
              {problems.map((p) => (cards.length > 1 ? `ID ${p.n}: ${p.missing.join(", ")}` : p.missing.join(", "))).join(" · ")}.
            </p>
          )}
          <p className={`status ${status?.kind ?? ""}`} role="status" aria-live="polite">
            {status?.text}
          </p>
        </form>

        <aside className="preview" aria-label="Preview">
          <div className="paper">
            <NonRegularCardPreview data={data} />
          </div>
          <p className="hint center">Front on the left, back on the right — as printed on the Word page.</p>
        </aside>
      </div>
    </main>
  );
}