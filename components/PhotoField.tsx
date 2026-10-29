"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_ASPECT } from "@/lib/cardGeometry";

export type Photo = { bytes: Uint8Array; url: string };

const EXPORT_W = 480;
const EXPORT_H = Math.round(EXPORT_W / PHOTO_ASPECT);
const EDIT_W = 220;
const EDIT_H = Math.round(EDIT_W / PHOTO_ASPECT);

type View = { zoom: number; ox: number; oy: number }; // offsets in fractions of the frame

function draw(canvas: HTMLCanvasElement, img: HTMLImageElement, v: View) {
  const ctx = canvas.getContext("2d")!;
  const cw = canvas.width;
  const ch = canvas.height;
  const base = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
  const s = base * v.zoom;
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  // keep the image covering the frame
  const maxX = (w - cw) / 2;
  const maxY = (h - ch) / 2;
  const dx = (cw - w) / 2 + Math.max(-maxX, Math.min(maxX, v.ox * cw));
  const dy = (ch - h) / 2 + Math.max(-maxY, Math.min(maxY, v.oy * ch));
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, w, h);
}

function clampView(img: HTMLImageElement, v: View): View {
  const base = Math.max(EDIT_W / img.naturalWidth, EDIT_H / img.naturalHeight);
  const s = base * v.zoom;
  const mx = (img.naturalWidth * s - EDIT_W) / 2 / EDIT_W;
  const my = (img.naturalHeight * s - EDIT_H) / 2 / EDIT_H;
  return { zoom: v.zoom, ox: Math.max(-mx, Math.min(mx, v.ox)), oy: Math.max(-my, Math.min(my, v.oy)) };
}

export default function PhotoField({ onChange }: { onChange: (p: Photo | null) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, ox: 0, oy: 0 });
  const [error, setError] = useState("");
  const editRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const lastUrl = useRef<string | null>(null);

  const emit = useCallback(
    (image: HTMLImageElement, v: View) => {
      const out = document.createElement("canvas");
      out.width = EXPORT_W;
      out.height = EXPORT_H;
      draw(out, image, v);
      out.toBlob(async (blob) => {
        if (!blob) return;
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        const url = URL.createObjectURL(blob);
        lastUrl.current = url;
        onChange({ bytes: new Uint8Array(await blob.arrayBuffer()), url });
      }, "image/png");
    },
    [onChange],
  );

  // Redraw the editor and (debounced) re-export whenever the framing changes.
  useEffect(() => {
    if (!img || !editRef.current) return;
    draw(editRef.current, img, view);
    const t = setTimeout(() => emit(img, view), 120);
    return () => clearTimeout(t);
  }, [img, view, emit]);

  useEffect(
    () => () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    },
    [],
  );

  function load(file: File | undefined) {
    if (!file) return;
    setError("");
    const src = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(src);
      setImg(image);
      setView({ zoom: 1, ox: 0, oy: 0 });
    };
    image.onerror = () => {
      URL.revokeObjectURL(src);
      setError("That image couldn't be read. Please use a JPG or PNG file.");
    };
    image.src = src;
  }

  function remove() {
    setImg(null);
    setError("");
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    lastUrl.current = null;
    onChange(null);
  }

  return (
    <div className="photo-field">
      {img ? (
        <>
          <canvas
            ref={editRef}
            width={EDIT_W}
            height={EDIT_H}
            className="photo-edit"
            aria-label="Drag to reposition the photo"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || !img) return;
              const r = e.currentTarget.getBoundingClientRect();
              setView((v) =>
                clampView(img, {
                  zoom: v.zoom,
                  ox: d.ox + (e.clientX - d.x) / r.width,
                  oy: d.oy + (e.clientY - d.y) / r.height,
                }),
              );
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          />
          <label className="zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={view.zoom}
              onChange={(e) => setView((v) => clampView(img, { ...v, zoom: Number(e.target.value) }))}
            />
          </label>
          <p className="hint">Drag the photo to reposition it.</p>
          <button type="button" className="btn-link" onClick={remove}>
            Remove photo
          </button>
        </>
      ) : (
        <label className="dropzone">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => load(e.target.files?.[0])} />
          <span>Choose a photo</span>
          <small>JPG or PNG · cropped to the ID frame</small>
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
