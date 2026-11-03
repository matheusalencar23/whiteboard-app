import type { Point } from "../../types";
import { getBounds } from "../../geometry/bounds";
import { distanceToPolyline } from "../../geometry/distance";
import { baseFields, scalePoints, type ShapeUtil } from "../shapeUtil";
import type { FreedrawElement } from "../types";

function geometryFrom(points: Point[]) {
  const bounds = getBounds(points);
  return {
    ...bounds,
    points: points.map((p) => ({ x: p.x - bounds.x, y: p.y - bounds.y })),
  };
}

export function createFreedraw(points: Point[]): FreedrawElement {
  const geometry = geometryFrom(points);
  return { ...baseFields(geometry), type: "freedraw", points: geometry.points };
}

export function setFreedrawPoints(el: FreedrawElement, points: Point[]): FreedrawElement {
  return { ...el, ...geometryFrom(points) };
}

export const freedrawUtil: ShapeUtil<FreedrawElement> = {
  draw(el, _rc, ctx) {
    const points = el.points.map((p) => ({ x: el.x + p.x, y: el.y + p.y }));
    ctx.save();
    ctx.strokeStyle = el.style.strokeColor;
    ctx.fillStyle = el.style.strokeColor;
    ctx.lineWidth = el.style.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, el.style.strokeWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const mid = {
          x: (points[i].x + points[i + 1].x) / 2,
          y: (points[i].y + points[i + 1].y) / 2,
        };
        ctx.quadraticCurveTo(points[i].x, points[i].y, mid.x, mid.y);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
    }
    ctx.restore();
  },

  hitTest(el, p, tolerance) {
    const t = tolerance + el.style.strokeWidth / 2;
    const local = { x: p.x - el.x, y: p.y - el.y };
    return distanceToPolyline(local, el.points) <= t;
  },

  resize(el, bounds) {
    return { ...el, ...bounds, points: scalePoints(el.points, el, bounds) };
  },
};
