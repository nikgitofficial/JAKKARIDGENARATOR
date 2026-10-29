"use client";

import type { CSSProperties } from "react";
import { BOXES, CROP, EMU_PER_PT, INSET, PHOTO, type Box } from "@/lib/cardGeometry";
import { computeLines, type FieldKey, type RegularIdData } from "@/lib/regularId";

const FONT = {
  calibriBold: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
  arial: 'Arial, "Liberation Sans", Arimo, Helvetica, sans-serif',
  arialBold: 'Arial, "Liberation Sans", Arimo, Helvetica, sans-serif',
} as const;

const cqw = (emu: number) => `${((emu / CROP.w) * 100).toFixed(4)}cqw`;
const pctX = (emu: number) => `${((emu / CROP.w) * 100).toFixed(4)}%`;
const pctY = (emu: number) => `${((emu / CROP.h) * 100).toFixed(4)}%`;
const pt = (n: number) => cqw(n * EMU_PER_PT);

function boxStyle(b: Box, extra: CSSProperties = {}): CSSProperties {
  return {
    position: "absolute",
    left: pctX(b.x),
    top: pctY(b.y),
    width: pctX(b.w),
    boxSizing: "border-box",
    padding: `${cqw(45720)} ${cqw(INSET)}`,
    whiteSpace: "nowrap",
    ...extra,
  };
}

type Props = { data: RegularIdData; photoUrl: string | null };

export default function CardPreview({ data, photoUrl }: Props) {
  const L = computeLines(data);

  const line = (
    key: FieldKey,
    opts: { font: keyof typeof FONT; color?: string; minLinePt?: number; lineHeight?: string },
  ): CSSProperties => ({
    fontFamily: FONT[opts.font],
    fontWeight: opts.font === "arial" ? 400 : 700,
    fontSize: pt(L[key].sizePt),
    color: opts.color,
    lineHeight: opts.lineHeight ?? "normal",
    minHeight: opts.minLinePt ? pt(opts.minLinePt) : undefined,
  });

  const valueKeys: FieldKey[] = ["dateHired", "sss", "tin", "hdmf", "phic", "birthdate", "addressLine1"];

  return (
    <div
      className="card"
      style={{ aspectRatio: `${CROP.w} / ${CROP.h}` }}
      role="img"
      aria-label="Live preview of the employee ID card (front on top, back below)"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-bg" src="/card/regular-blank.png" alt="" draggable={false} />

      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={photoUrl}
          draggable={false}
          style={{
            position: "absolute",
            left: pctX(PHOTO.x),
            top: pctY(PHOTO.y),
            width: pctX(PHOTO.w),
            height: pctY(PHOTO.h),
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          className="card-photo-empty"
          style={{
            left: pctX(PHOTO.x),
            top: pctY(PHOTO.y),
            width: pctX(PHOTO.w),
            height: pctY(PHOTO.h),
            fontSize: pt(7),
          }}
        >
          PHOTO
        </div>
      )}

      {/* Front */}
      <div style={boxStyle(BOXES.name)}>
        <div style={line("name", { font: "calibriBold", lineHeight: "normal" })}>{L.name.text}</div>
      </div>
      <div style={boxStyle(BOXES.designation)}>
        <div style={line("designation", { font: "calibriBold", lineHeight: "normal" })}>{L.designation.text}</div>
      </div>
      <div style={boxStyle(BOXES.baseBranch)}>
        <div style={line("baseBranch", { font: "calibriBold", lineHeight: "normal" })}>{L.baseBranch.text}</div>
      </div>
      <div style={boxStyle(BOXES.employeeNo)}>
        <div style={line("employeeNo", { font: "arialBold", lineHeight: "normal" })}>{L.employeeNo.text}</div>
      </div>

      {/* Back */}
      <div style={boxStyle(BOXES.values)}>
        {valueKeys.map((k) => (
          <div key={k} style={line(k, { font: "arial", minLinePt: 9 })}>
            {L[k].text || " "}
          </div>
        ))}
      </div>
      <div style={boxStyle(BOXES.addressLine2, { textAlign: "center" })}>
        <div style={line("addressLine2", { font: "arial", minLinePt: 9 })}>{L.addressLine2.text}</div>
      </div>
      <div style={boxStyle(BOXES.emergency, { textAlign: "center" })}>
        {(["emergencyName", "emergencyPhone"] as FieldKey[]).map((k) => (
          <div key={k} style={line(k, { font: "arialBold", color: "#fff", minLinePt: 9 })}>
            {L[k].text || " "}
          </div>
        ))}
      </div>
    </div>
  );
}
