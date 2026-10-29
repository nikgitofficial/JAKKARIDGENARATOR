// Positions (EMU, 914400 per inch) of the editable boxes on one non-regular ID slot, taken from the
// template's DrawingML after applying the nested group transforms. Coordinates are relative to the
// slot group's top-left corner (front card on the left, back card on the right), which is also the
// top-left of public/card/non-regular-blank.png (1474x1106 px at 300 dpi).

export const EMU_PER_PT = 12700;

export const SLOT = { w: 4493260, h: 3371850 };

export type Box = { x: number; y: number; w: number; h: number; insetX: number; insetY: number };
const box = (x: number, y: number, w: number, h: number, insetX = 36576, insetY = 36576): Box => ({
  x, y, w, h, insetX, insetY,
});

export const BOXES = {
  // front (left card)
  name: box(87062, 1976594, 2048084, 291899),
  designation: box(82550, 2263993, 2051844, 214099),
  employeeNo: box(1726885, 1807495, 449147, 208999),
  // back (right card)
  details: box(2381607, 368300, 2011797, 1062676, 91440, 45720),
  emergencyName: box(2375257, 1822450, 2011797, 257003),
  emergencyPhone: box(2590060, 2120900, 1606163, 257003),
};

/** Word line heights (multiples of the font size): font's natural line height x the paragraph's line spacing. */
export const LINE = {
  arial: 1.149,
  // Normal style = 285/240 line spacing, applied to boxes that don't override it
  arialNormal: 1.149 * (285 / 240),
  cambriaNormal: 1.172 * (285 / 240),
  arialBlackNormal: 1.41 * (285 / 240),
  rowSpacing: 276 / 240,
};