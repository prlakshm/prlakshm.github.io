import { existsSync, readFileSync } from "node:fs";

const directory = "public/branding/assets/title-svg";
const files = [
  "figma-word.svg",
  "figma-f.svg",
  "figma-i.svg",
  "figma-g.svg",
  "figma-m.svg",
  "figma-a.svg",
  "sound-s.svg",
  "sound-o.svg",
  "sound-u.svg",
  "sound-n.svg",
  "sound-d.svg",
];

for (const file of files) {
  const path = `${directory}/${file}`;
  if (!existsSync(path)) throw new Error(`${path} is missing`);
  const svg = readFileSync(path, "utf8");
  if (!svg.includes("<path")) throw new Error(`${path} is not outlined`);
  if (svg.includes("<text")) throw new Error(`${path} still depends on a font`);
  if (!/viewBox="0 0 [\d.]+ 240"/.test(svg)) {
    throw new Error(`${path} does not use the shared 240-unit title canvas`);
  }
}

console.log(`PASS: ${files.length} font-independent title SVG assets`);
