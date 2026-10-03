// Projects the real sunroom model to page coordinates and writes it out as
// sketch-data.js for the style mock (file:// friendly: no fetch).
import { CURTAIN, DOOR, SIDELIGHT, computeLayout, project, projectFurn } from "../../../../src/pages/home/sunroom/scene.js";
import { buildModel, isFurniture } from "../../../../src/pages/home/sunroom/model.js";
import { writeFileSync } from "node:fs";

const metrics = { width: 1440, blockLeft: 327, blockRight: 1113, blockBottom: 420, textRight: 1127, textBottom: 345 };
const lay = computeLayout(metrics);
const model = buildModel(lay);
const items = model.items.map((it) => ({
  kind: it.kind,
  group: it.group,
  weight: it.kind === "line" ? it.weight : null,
  paint: it.kind === "fill" ? it.paint : null,
  curve: !!it.curve,
  closed: it.kind === "line" ? !!it.closed : true,
  overshoot: it.kind === "line" ? it.overshoot !== false : false,
  alpha: it.kind === "line" ? it.alpha ?? 1 : 1,
  pts: it.pts.map((p) => (isFurniture(it.group) ? projectFurn(lay.furn, p) : project(lay.sketch, p)).map((n) => Math.round(n * 10) / 10)),
}));
// Regions, for shading: polygons on the page.
const P = (x: number, y: number, z = 0) => project(lay.sketch, [x, y, z]).map((n) => Math.round(n * 10) / 10);
const edge = DOOR.half + DOOR.casing;
const regions = {
  leftWall: [P(lay.wallL, 0, 0), P(lay.wallL, lay.wallH, 0), P(lay.wallL, lay.wallH, lay.sideZ), P(lay.wallL, 0, lay.sideZ)],
  backWall: [P(lay.wallL, 0), P(lay.wallL, lay.wallH), P(lay.wallR + 0.9, lay.wallH), P(lay.wallR + 0.9, 0)],
  door: [P(-edge, 0), P(-edge, DOOR.height + DOOR.casing), P(edge, DOOR.height + DOOR.casing), P(edge, 0)],
  glass: [P(-DOOR.half, DOOR.kick), P(-DOOR.half, DOOR.height - DOOR.head), P(DOOR.half, DOOR.height - DOOR.head), P(DOOR.half, DOOR.kick)],
  sideL: [P(-SIDELIGHT[1], DOOR.kick - 0.05), P(-SIDELIGHT[1], DOOR.height - DOOR.head + 0.05), P(-SIDELIGHT[0], DOOR.height - DOOR.head + 0.05), P(-SIDELIGHT[0], DOOR.kick - 0.05)],
  sideR: [P(SIDELIGHT[0], DOOR.kick - 0.05), P(SIDELIGHT[0], DOOR.height - DOOR.head + 0.05), P(SIDELIGHT[1], DOOR.height - DOOR.head + 0.05), P(SIDELIGHT[1], DOOR.kick - 0.05)],
  curtainOuter: lay.curtainOuter,
  floor: [P(lay.wallL, 0, lay.sideZ), P(lay.wallL, 0, 0), P(lay.wallR + 0.9, 0), [lay.width, lay.height], [0, lay.height]],
};
const out = { width: lay.width, height: lay.height, floorY: lay.floorY, blockBottom: metrics.blockBottom, items, regions, furn: lay.furn, chairs: lay.chairs, table: lay.table };
writeFileSync(new URL("./sketch-data.js", import.meta.url), "window.SKETCH = " + JSON.stringify(out) + ";\n");
console.log(items.length, "items", lay.width, lay.height);
