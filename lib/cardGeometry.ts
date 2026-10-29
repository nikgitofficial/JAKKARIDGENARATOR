// Positions (EMU, 914400 per inch) of the editable boxes on the card, taken from the template's
// DrawingML. Preview coordinates are relative to the cropped background image
// (public/card/regular-blank.png: 773x2233 px at 300 dpi), whose top-left sits
// ORIGIN away from the card's own top-left corner.

export const EMU_PER_PT = 12700;
export const INSET = 91440;

export const ORIGIN = { x: 91908, y: 92142 };
export const CROP = { w: Math.round((773 / 300) * 914400), h: Math.round((2233 / 300) * 914400) };

export type Box = { x: number; y: number; w: number };
const at = (x: number, y: number, w: number): Box => ({ x: x + ORIGIN.x, y: y + ORIGIN.y, w });

export const BOXES = {
  name: at(102748, 1620649, 2068317),
  designation: at(102749, 1875615, 1936750),
  baseBranch: at(93785, 2166956, 1936751),
  employeeNo: at(93784, 2458297, 888365),
  values: at(898909, 4343043, 1139916),
  addressLine2: at(113323, 5183035, 1997800),
  emergency: at(109695, 5546043, 1945005),
};

export const PHOTO = {
  x: 676568 + ORIGIN.x,
  y: 815500 + ORIGIN.y,
  w: 836359,
  h: 839324,
};

/** Width / height of the photo frame; uploaded photos are cropped to this. */
export const PHOTO_ASPECT = PHOTO.w / PHOTO.h;
