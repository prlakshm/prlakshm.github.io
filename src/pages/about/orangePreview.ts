export type OrangePreview = {
  index: number;
  name: string;
  hex: string;
  matrix: string;
};

const CURRENT = { r: 254, g: 199, b: 154 };

const OPTIONS = [
  ["Current Peach", "#fec79a"],
  ["Vanilla Creamsicle", "#ffc98f"],
  ["Mango Cream", "#ffc266"],
  ["Classic Creamsicle", "#ffb873"],
  ["Papaya Milk", "#ffae70"],
  ["Apricot Pop", "#ffa36a"],
  ["Orange Sorbet", "#ff995d"],
  ["Tangerine Sorbet", "#ff8f55"],
  ["Coral Sherbet", "#ff9275"],
] as const;

const channel = (hex: string, start: number) => parseInt(hex.slice(start, start + 2), 16);

export const ORANGE_PREVIEWS: OrangePreview[] = OPTIONS.map(([name, hex], i) => {
  const r = channel(hex, 1) / CURRENT.r;
  const g = channel(hex, 3) / CURRENT.g;
  const b = channel(hex, 5) / CURRENT.b;
  return {
    index: i + 1,
    name,
    hex,
    matrix: `${r.toFixed(5)} 0 0 0 0  0 ${g.toFixed(5)} 0 0 0  0 0 ${b.toFixed(5)} 0 0  0 0 0 1 0`,
  };
});

export const DEFAULT_ORANGE_PREVIEW = ORANGE_PREVIEWS[1];

export function orangePreviewFromSearch(search: string): OrangePreview | null {
  const params = new URLSearchParams(search);
  const value = params.get("color");
  if (!value || !/^\d+$/.test(value)) return null;
  const index = Number(value);
  if (index < 1 || index > ORANGE_PREVIEWS.length) return null;
  return ORANGE_PREVIEWS[index - 1];
}
