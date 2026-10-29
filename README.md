# ID Generator — Regular Employee

Type the employee's details, check the live preview, download the ID as a Word file.
Everything runs in the browser: no server processing, nothing uploaded.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## How it matches your Word file exactly

The app does **not** redraw the card. `public/templates/regular-id.docx` is your original
`REGULAR ID.docx` with the personal values blanked and the sample photo replaced by a neutral
placeholder. On download, only the text boxes (and the photo) are filled in, so the layout,
fonts, crop marks and artwork are byte-for-byte your design. Filling your original file with its own
values re-renders pixel-identical to the original.

Text that is too long for its box is shrunk automatically (down to a minimum size per field,
using Calibri/Arial metrics); the form warns when something still won't fit.

## Project layout

| Path | What it is |
| --- | --- |
| `lib/regularId.ts` | Data model, text fitting, and the `.docx` filler (JSZip) |
| `lib/cardGeometry.ts` | Positions of the boxes, used by the preview |
| `components/` | Form, live preview, photo crop/zoom |
| `public/templates/regular-id.docx` | Sanitised Word template |
| `public/card/regular-blank.png` | Blank card render used behind the preview |
| `scripts/make-template.mjs` | Rebuilds the template from the original Word file |

## If you change the Word design

```bash
node scripts/make-template.mjs "REGULAR ID.docx" --transparent-photo /tmp/bg.docx
```

then re-render `/tmp/bg.docx` at 300 dpi (LibreOffice → PDF → PNG), crop to
`public/card/regular-blank.png`, and re-check `lib/cardGeometry.ts` if boxes moved.
The filler expects the same 16 text boxes in the same order; it throws a clear error if not.

## Adding the other ID types

Copy `lib/regularId.ts` + `components/RegularIdGenerator.tsx` per type, point them at that type's
template, and update the box indexes in `BOX`.
