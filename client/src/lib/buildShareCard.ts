// Build a portrait PNG that visually represents a gig card for native sharing.
// Pure browser Canvas — no dependencies, no server round-trip.

export interface ShareCardInput {
  name: string;
  venueName?: string | null;
  city?: string | null;
  startTime?: string | Date | null;
  imageBlob?: Blob | null;
  locationLabel?: string | null;
}

const W = 1080;
const H = 1620;
const PAD = 56;

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const ar = img.width / img.height;
  const tar = dw / dh;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ar > tar) {
    sw = img.height * tar;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tar;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  fontSize = 30,
  alignRight = false,
) {
  ctx.font = `${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const padX = 22;
  const h = fontSize + 22;
  const w = ctx.measureText(text).width + padX * 2;
  const px = alignRight ? x - w : x;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  roundedRectPath(ctx, px, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(text, px + padX, y + h / 2);
  return { w, h };
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (ctx.measureText(trial).width <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) {
        // Force ellipsis on last allowed line
        let last = line;
        while (
          ctx.measureText(last + "…").width > maxWidth &&
          last.length > 0
        ) {
          last = last.slice(0, -1);
        }
        lines.push(last + "…");
        return lines;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fmtDate(d: Date) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = days[d.getDay()];
  const dom = d.getDate();
  const mon = months[d.getMonth()];
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const min = m.toString().padStart(2, "0");
  return `${day}, ${mon} ${dom} • ${h}${m === 0 ? "" : `:${min}`}${ampm}`;
}

export async function buildShareCard(
  input: ShareCardInput,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Outer background
  ctx.fillStyle = "#06070d";
  ctx.fillRect(0, 0, W, H);

  // Card body
  const cardX = PAD;
  const cardY = PAD;
  const cardW = W - PAD * 2;
  const cardH = H - PAD * 2;
  ctx.fillStyle = "#0d0d18";
  roundedRectPath(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fill();

  // Image area (top portion of card)
  const imgX = cardX;
  const imgY = cardY;
  const imgW = cardW;
  const imgH = 720;

  ctx.save();
  roundedRectPath(ctx, imgX, imgY, imgW, imgH, 40);
  ctx.clip();

  if (input.imageBlob) {
    try {
      const img = await loadImageFromBlob(input.imageBlob);
      drawCover(ctx, img, imgX, imgY, imgW, imgH);
    } catch {
      // Fallback: gradient
      const g = ctx.createLinearGradient(imgX, imgY, imgX, imgY + imgH);
      g.addColorStop(0, "#1a1d2e");
      g.addColorStop(1, "#3b1d6b");
      ctx.fillStyle = g;
      ctx.fillRect(imgX, imgY, imgW, imgH);
    }
  } else {
    const g = ctx.createLinearGradient(imgX, imgY, imgX, imgY + imgH);
    g.addColorStop(0, "#1a1d2e");
    g.addColorStop(1, "#3b1d6b");
    ctx.fillStyle = g;
    ctx.fillRect(imgX, imgY, imgW, imgH);
  }

  // Bottom gradient overlay
  const overlay = ctx.createLinearGradient(
    0,
    imgY + imgH * 0.4,
    0,
    imgY + imgH,
  );
  overlay.addColorStop(0, "rgba(0,0,0,0)");
  overlay.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = overlay;
  ctx.fillRect(imgX, imgY, imgW, imgH);
  ctx.restore();

  // Nearby pill (top-left)
  drawPill(ctx, imgX + 32, imgY + 32, "Nearby", 32);

  // Location pill (bottom-right of image)
  if (input.locationLabel) {
    drawPill(
      ctx,
      imgX + imgW - 32,
      imgY + imgH - 70,
      input.locationLabel,
      30,
      true,
    );
  } else {
    const loc =
      [input.venueName, input.city].filter(Boolean).join(" • ") || "";
    if (loc) {
      drawPill(ctx, imgX + imgW - 32, imgY + imgH - 70, loc, 30, true);
    }
  }

  // ---------- Text content ----------
  const textX = cardX + 50;
  const textW = cardW - 100;
  let y = imgY + imgH + 70;

  // Title
  ctx.fillStyle = "#fff";
  ctx.font = `700 56px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const titleLines = wrapLines(ctx, input.name || "Live gig", textW, 2);
  for (const line of titleLines) {
    ctx.fillText(line, textX, y);
    y += 64;
  }

  // Venue
  if (input.venueName) {
    y += 12;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = `500 36px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(input.venueName, textX, y);
    y += 44;
  }

  // Date / time
  if (input.startTime) {
    const d = new Date(input.startTime as any);
    if (!Number.isNaN(d.getTime())) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = `400 32px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(fmtDate(d), textX, y);
      y += 40;
    }
  }

  // Action row (Soundcheck / Save / Share)
  y += 36;
  const rowH = 96;
  const gap = 18;
  const btnW = (textW - gap * 2) / 3;

  // Soundcheck button
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  roundedRectPath(ctx, textX, y, btnW, rowH, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `500 30px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎧  Soundcheck", textX + btnW / 2, y + rowH / 2);

  // Save button
  const saveX = textX + btnW + gap;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundedRectPath(ctx, saveX, y, btnW, rowH, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("🔖  Save", saveX + btnW / 2, y + rowH / 2);

  // Share button (filled purple)
  const shareX = saveX + btnW + gap;
  ctx.fillStyle = "rgba(168,85,247,0.95)";
  roundedRectPath(ctx, shareX, y, btnW, rowH, 24);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText("⤴  Share", shareX + btnW / 2, y + rowH / 2);

  y += rowH + 22;

  // Get Tickets CTA
  ctx.fillStyle = "rgba(168,85,247,0.95)";
  roundedRectPath(ctx, textX, y, textW, 110, 26);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `700 40px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("Get Tickets", textX + textW / 2, y + 55);

  // GigLoop wordmark / footer
  ctx.fillStyle = "rgba(168,85,247,1)";
  ctx.font = `700 38px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Open in GigLoop", W / 2, cardY + cardH - 60);

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}
