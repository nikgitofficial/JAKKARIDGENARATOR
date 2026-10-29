"use client";

import type { CSSProperties, ReactNode } from "react";
import { BOXES, EMU_PER_PT, LINE, SLOT, type Box } from "@/lib/cardGeometryNonReg";
import { HANG_PT, computeCard, wrapAddress, type NonRegularIdData } from "@/lib/nonRegularId";

const FONT = {
  arial: 'Arial, "Liberation Sans", Arimo, Helvetica, sans-serif',
  cambria: 'Cambria, Caladea, Georgia, "Times New Roman", serif',
  arialBlack: '"Arial Black", "Arial Bold", Arial, "Liberation Sans", sans-serif',
} as const;

const cqw = (emu: number) => `${((emu / SLOT.w) * 100).toFixed(4)}cqw`;
const pctX = (emu: number) => `${((emu / SLOT.w) * 100).toFixed(4)}%`;
const pctY = (emu: number) => `${((emu / SLOT.h) * 100).toFixed(4)}%`;
const pt = (n: number) => cqw(n * EMU_PER_PT);

function boxStyle(b: Box, extra: CSSProperties = {}): CSSProperties {
  return {
    position: "absolute",
    left: pctX(b.x),
    top: pctY(b.y),
    width: pctX(b.w),
    height: pctY(b.h),
    boxSizing: "border-box",
    padding: `${cqw(b.insetY)} ${cqw(b.insetX)}`,
    whiteSpace: "nowrap",
    ...extra,
  };
}

function Block({ b, children, style }: { b: Box; children: ReactNode; style?: CSSProperties }) {
  return <div style={boxStyle(b, style)}>{children}</div>;
}

type Props = { data: NonRegularIdData };

export default function NonRegularCardPreview({ data }: Props) {
  const L = computeCard(data);
  const white = "#fff";
  const bold = { fontFamily: FONT.arial, fontWeight: 700 } as const;

  const labelCol: CSSProperties = { width: pt(HANG_PT), flex: "none", fontSize: pt(6) };
  const addr = wrapAddress(L.address.text, L.address.sizePt).lines;
  const addrLines = addr.length ? addr : [L.address.text];

  return (
    <div
      className="card"
      style={{ aspectRatio: `${SLOT.w} / ${SLOT.h}` }}
      role="img"
      aria-label="Live preview of the employee ID card (front on the left, back on the right)"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="card-bg" src="/card/non-regular-blank.png" alt="" draggable={false} />

      {/* Front */}
      <Block
        b={BOXES.name}
        style={{ ...bold, display: "flex", alignItems: "center", justifyContent: "center", color: white }}
      >
        <span style={{ fontSize: pt(L.name.sizePt), lineHeight: LINE.arialNormal }}>{L.name.text}</span>
      </Block>
      <Block b={BOXES.designation} style={{ fontFamily: FONT.cambria, fontWeight: 700, textAlign: "center" }}>
        <div style={{ fontSize: pt(L.designation.sizePt), lineHeight: LINE.cambriaNormal }}>{L.designation.text}</div>
      </Block>
      <Block b={BOXES.employeeNo} style={{ fontFamily: FONT.arialBlack, fontWeight: 900, color: white }}>
        <div style={{ fontSize: pt(L.employeeNo.sizePt), lineHeight: LINE.arialBlackNormal }}>{L.employeeNo.text}</div>
      </Block>

      {/* Back */}
      <Block b={BOXES.details} style={{ ...bold, whiteSpace: "normal" }}>
        {addrLines.map((text, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "baseline", lineHeight: LINE.arial, whiteSpace: "nowrap" }}
          >
            <span style={labelCol}>{i === 0 ? "Address" : ""}</span>
            <span style={{ fontSize: pt(L.address.sizePt) }}>
              {i === 0 && <span style={{ fontSize: pt(6) }}>: </span>}
              <span style={{ textDecoration: "underline" }}>{text}</span>
            </span>
          </div>
        ))}
        <div style={{ height: pt(6 * LINE.arial) }} />
        {L.rows.map((r) => (
          <div
            key={r.label}
            style={{ display: "flex", fontSize: pt(6), lineHeight: pt(6 * LINE.arial * LINE.rowSpacing), whiteSpace: "nowrap" }}
          >
            <span style={labelCol}>{r.label}</span>
            <span>
              {": "}
              <span style={{ textDecoration: "underline" }}>{r.text}</span>
            </span>
          </div>
        ))}
      </Block>

      <Block b={BOXES.emergencyName} style={{ ...bold, color: white, textAlign: "center" }}>
        <div style={{ fontSize: pt(L.emergencyName.sizePt), lineHeight: LINE.arialNormal }}>{L.emergencyName.text}</div>
      </Block>
      <Block b={BOXES.emergencyPhone} style={{ ...bold, color: white, textAlign: "center" }}>
        <div style={{ fontSize: pt(L.emergencyPhone.sizePt), lineHeight: LINE.arialNormal }}>
          {L.emergencyPhone.text}
        </div>
      </Block>
    </div>
  );
}