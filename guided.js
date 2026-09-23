/**
 * Detecção local de áreas de fala.
 * A análise aceita apenas regiões claras fechadas com traços escuros (balões).
 * Blocos soltos e onomatopeias ficam fora do modo automático. Nenhum pixel
 * sai do navegador.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function overlapRatio(a, b) {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  if (right <= left || bottom <= top) return 0;
  const intersection = (right - left) * (bottom - top);
  return intersection / Math.min(a.width * a.height, b.width * b.height);
}

function normalizeRegion(region, scale, sourceWidth, sourceHeight) {
  const padX = region.width * 0.09 + 9;
  const padY = region.height * 0.13 + 8;
  const x = clamp((region.x - padX) / scale, 0, sourceWidth);
  const y = clamp((region.y - padY) / scale, 0, sourceHeight);
  const right = clamp((region.x + region.width + padX) / scale, 0, sourceWidth);
  const bottom = clamp((region.y + region.height + padY) / scale, 0, sourceHeight);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
    confidence: region.confidence ?? 0.6,
  };
}

function sortReadingOrder(regions, direction = "ltr") {
  if (regions.length < 2) return regions;
  const orderedByTop = [...regions].sort((a, b) => a.y - b.y || a.x - b.x);
  const medianHeight = [...regions]
    .map((item) => item.height)
    .sort((a, b) => a - b)[Math.floor(regions.length / 2)];
  const rows = [];

  for (const region of orderedByTop) {
    const centerY = region.y + region.height / 2;
    let bestRow = null;
    let bestDistance = Infinity;

    for (const row of rows) {
      const overlap = Math.max(0, Math.min(row.bottom, region.y + region.height) - Math.max(row.top, region.y));
      const overlapRatio = overlap / Math.min(row.bottom - row.top, region.height);
      const distance = Math.abs(centerY - row.centerY);
      const tolerance = Math.max(24, Math.min(medianHeight, region.height) * 0.72);
      if ((overlapRatio >= 0.26 || distance <= tolerance) && distance < bestDistance) {
        bestRow = row;
        bestDistance = distance;
      }
    }

    if (!bestRow) {
      rows.push({
        top: region.y,
        bottom: region.y + region.height,
        centerY,
        regions: [region],
      });
      continue;
    }

    bestRow.regions.push(region);
    bestRow.top = Math.min(bestRow.top, region.y);
    bestRow.bottom = Math.max(bestRow.bottom, region.y + region.height);
    bestRow.centerY = bestRow.regions.reduce((sum, item) => sum + item.y + item.height / 2, 0) / bestRow.regions.length;
  }

  rows.sort((a, b) => a.top - b.top || a.centerY - b.centerY);
  return rows.flatMap((row) => row.regions.sort((a, b) => {
    const centerAX = a.x + a.width / 2;
    const centerBX = b.x + b.width / 2;
    return direction === "rtl" ? centerBX - centerAX : centerAX - centerBX;
  }));
}

export function calculateGuidedViewport(sourceWidth, sourceHeight, viewportWidth, viewportHeight, region, options = {}) {
  if (!sourceWidth || !sourceHeight || !viewportWidth || !viewportHeight || !region) {
    return { scale: 1, x: 0, y: 0 };
  }

  const mobile = options.mobile ?? viewportWidth <= 760;
  const topInset = options.topInset ?? (mobile ? 58 : 54);
  const bottomInset = options.bottomInset ?? (mobile ? 76 : 70);
  const usableHeight = Math.max(120, viewportHeight - topInset - bottomInset);
  const focusAreaWidth = viewportWidth * (mobile ? 0.94 : 0.8);
  const focusAreaHeight = usableHeight * (mobile ? 0.62 : 0.58);
  const focusAreaLeft = (viewportWidth - focusAreaWidth) / 2;
  const focusAreaTop = topInset + (usableHeight - focusAreaHeight) * 0.48;
  const baseScale = Math.min(viewportWidth / sourceWidth, viewportHeight / sourceHeight) * 0.96;
  const paddedWidth = region.width * (mobile ? 1.42 : 1.62) + sourceWidth * 0.012;
  const paddedHeight = region.height * (mobile ? 1.62 : 1.82) + sourceHeight * 0.008;
  const targetScale = Math.min(
    (viewportWidth * (mobile ? 0.88 : 0.76)) / paddedWidth,
    (usableHeight * (mobile ? 0.7 : 0.66)) / paddedHeight,
  );
  const coverageScale = Math.max(focusAreaWidth / sourceWidth, focusAreaHeight / sourceHeight);
  const minimumScale = Math.max(baseScale * (mobile ? 1.5 : 1.32), coverageScale);
  const maximumScale = Math.max(minimumScale, baseScale * (mobile ? 5.2 : 4.2));
  const scale = clamp(targetScale, minimumScale, maximumScale);
  const pageWidth = sourceWidth * scale;
  const pageHeight = sourceHeight * scale;
  const focusX = region.x + region.width / 2;
  const focusY = region.y + region.height / 2;
  const viewportFocusX = focusAreaLeft + focusAreaWidth / 2;
  const viewportFocusY = focusAreaTop + focusAreaHeight / 2;
  let x = viewportFocusX - focusX * scale;
  let y = viewportFocusY - focusY * scale;

  x = clamp(x, focusAreaLeft + focusAreaWidth - pageWidth, focusAreaLeft);
  y = clamp(y, focusAreaTop + focusAreaHeight - pageHeight, focusAreaTop);

  return { scale, x, y };
}

function deduplicate(regions) {
  const ordered = [...regions].sort((a, b) => b.confidence - a.confidence || a.width * a.height - b.width * b.height);
  const kept = [];
  for (const candidate of ordered) {
    if (kept.some((item) => overlapRatio(item, candidate) > 0.68)) continue;
    kept.push(candidate);
  }
  return kept;
}

function inspectDarkMarks(data, width, height, rect) {
  const left = clamp(Math.floor(rect.x), 0, width - 1);
  const top = clamp(Math.floor(rect.y), 0, height - 1);
  const right = clamp(Math.ceil(rect.x + rect.width), left + 1, width);
  const bottom = clamp(Math.ceil(rect.y + rect.height), top + 1, height);
  let dark = 0;
  let sampled = 0;
  let rowsWithInk = 0;
  let columnsWithInk = 0;

  for (let y = top; y < bottom; y += 2) {
    let rowInk = 0;
    for (let x = left; x < right; x += 2) {
      const offset = (y * width + x) * 4;
      const value = luminance(data[offset], data[offset + 1], data[offset + 2]);
      sampled += 1;
      if (value < 145) {
        dark += 1;
        rowInk += 1;
      }
    }
    if (rowInk >= Math.max(2, (right - left) / 70)) rowsWithInk += 1;
  }

  for (let x = left; x < right; x += 3) {
    let columnInk = 0;
    for (let y = top; y < bottom; y += 3) {
      const offset = (y * width + x) * 4;
      if (luminance(data[offset], data[offset + 1], data[offset + 2]) < 145) columnInk += 1;
    }
    if (columnInk >= 2) columnsWithInk += 1;
  }

  return {
    density: sampled ? dark / sampled : 0,
    rowsWithInk,
    columnsWithInk,
  };
}

function findLightBubbles(data, width, height) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const regions = [];
  const minimumPixels = Math.max(210, total * 0.00045);
  const maximumPixels = total * 0.31;

  const isLight = (index) => {
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const high = Math.max(r, g, b);
    const low = Math.min(r, g, b);
    return luminance(r, g, b) > 213 && high - low < 58;
  };

  for (let start = 0; start < total; start += 1) {
    if (visited[start]) continue;
    visited[start] = 1;
    if (!isLight(start)) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    let count = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let touchesEdge = false;

    while (head < tail) {
      const current = queue[head++];
      const y = Math.floor(current / width);
      const x = current - y * width;
      count += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) touchesEdge = true;

      const left = current - 1;
      const right = current + 1;
      const up = current - width;
      const down = current + width;
      if (x > 0 && !visited[left]) {
        visited[left] = 1;
        if (isLight(left)) queue[tail++] = left;
      }
      if (x < width - 1 && !visited[right]) {
        visited[right] = 1;
        if (isLight(right)) queue[tail++] = right;
      }
      if (y > 0 && !visited[up]) {
        visited[up] = 1;
        if (isLight(up)) queue[tail++] = up;
      }
      if (y < height - 1 && !visited[down]) {
        visited[down] = 1;
        if (isLight(down)) queue[tail++] = down;
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const boxArea = boxWidth * boxHeight;
    if (
      touchesEdge ||
      count < minimumPixels ||
      count > maximumPixels ||
      boxWidth < width * 0.035 ||
      boxHeight < height * 0.018 ||
      boxWidth > width * 0.82 ||
      boxHeight > height * 0.48 ||
      boxWidth / boxHeight > 9 ||
      boxHeight / boxWidth > 6 ||
      count / boxArea < 0.28
    ) continue;

    const marks = inspectDarkMarks(data, width, height, { x: minX, y: minY, width: boxWidth, height: boxHeight });
    if (
      marks.density < 0.006 ||
      marks.density > 0.48 ||
      marks.rowsWithInk < 2 ||
      marks.columnsWithInk < 3
    ) continue;

    const sizeBalance = 1 - Math.min(1, boxArea / (total * 0.34));
    regions.push({
      x: minX,
      y: minY,
      width: boxWidth,
      height: boxHeight,
      confidence: clamp(0.55 + marks.density * 1.6 + sizeBalance * 0.18, 0, 0.98),
    });
  }

  return regions;
}

function findTextBlocks(data, width, height) {
  const cell = 6;
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const ink = new Uint8Array(columns * rows);

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const offset = (y * width + x) * 4;
      const value = luminance(data[offset], data[offset + 1], data[offset + 2]);
      if (value < 125) ink[Math.floor(y / cell) * columns + Math.floor(x / cell)] += 1;
    }
  }

  const expanded = new Uint8Array(ink.length);
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < columns; gx += 1) {
      if (ink[gy * columns + gx] < 1) continue;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -2; ox <= 2; ox += 1) {
          const nx = gx + ox;
          const ny = gy + oy;
          if (nx >= 0 && nx < columns && ny >= 0 && ny < rows) expanded[ny * columns + nx] = 1;
        }
      }
    }
  }

  const visited = new Uint8Array(expanded.length);
  const queue = new Int32Array(expanded.length);
  const boxes = [];
  for (let start = 0; start < expanded.length; start += 1) {
    if (visited[start] || !expanded[start]) continue;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    let minX = columns;
    let minY = rows;
    let maxX = 0;
    let maxY = 0;
    let count = 0;

    while (head < tail) {
      const current = queue[head++];
      const gy = Math.floor(current / columns);
      const gx = current - gy * columns;
      count += 1;
      minX = Math.min(minX, gx);
      minY = Math.min(minY, gy);
      maxX = Math.max(maxX, gx);
      maxY = Math.max(maxY, gy);
      const neighbors = [current - 1, current + 1, current - columns, current + columns];
      for (const next of neighbors) {
        if (next < 0 || next >= expanded.length || visited[next] || !expanded[next]) continue;
        const nextY = Math.floor(next / columns);
        const nextX = next - nextY * columns;
        if (Math.abs(nextX - gx) + Math.abs(nextY - gy) !== 1) continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }

    const box = {
      x: minX * cell,
      y: minY * cell,
      width: Math.min(width, (maxX + 1) * cell) - minX * cell,
      height: Math.min(height, (maxY + 1) * cell) - minY * cell,
    };
    const areaRatio = (box.width * box.height) / (width * height);
    if (
      count < 7 ||
      box.width < width * 0.04 ||
      box.height < height * 0.012 ||
      box.width > width * 0.68 ||
      box.height > height * 0.28 ||
      areaRatio < 0.0007 ||
      areaRatio > 0.14
    ) continue;

    const marks = inspectDarkMarks(data, width, height, box);
    if (marks.density < 0.018 || marks.density > 0.42 || marks.rowsWithInk < 2) continue;
    boxes.push({ ...box, confidence: 0.43 });
  }
  return boxes;
}

export async function detectSpeechRegions(image, direction = "ltr") {
  if (!image?.naturalWidth || !image?.naturalHeight) return [];
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  const scale = Math.min(1, 900 / sourceWidth, 1200 / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);

  // Give the browser one frame before the pixel-heavy pass on slower phones.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const { data } = context.getImageData(0, 0, width, height);
  const bubbles = findLightBubbles(data, width, height);
  // Only enclosed, light speech balloons enter the automatic mode. Broad text
  // blocks are deliberately ignored so sound effects and artwork lettering do
  // not become tappable targets. Non-standard balloons remain available through
  // the manual selection tool.
  const combined = deduplicate(bubbles)
    .slice(0, 36)
    .map((region) => normalizeRegion(region, scale, sourceWidth, sourceHeight));

  return sortReadingOrder(combined, direction);
}

export function sortRegions(regions, direction = "ltr") {
  return sortReadingOrder(regions, direction);
}
