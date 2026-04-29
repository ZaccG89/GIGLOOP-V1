// Build a portrait PNG that visually represents a gig for native sharing.
// Pure browser Canvas — no dependencies. Designed as a static poster: the
// real interactivity comes from the URL in the share text and the OG meta
// preview that platforms render when the URL is pasted.

export interface ShareCardInput {
  name: string;
  venueName?: string | null;
  city?: string | null;
  startTime?: string | Date | null;
  imageBlob?: Blob | null;
  locationLabel?: string | null;
  shareUrl?: string | null;
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
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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

function shortDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || "gigloop";
  }
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

  // Image area (top portion of card) — taller now since no fake buttons below
  const imgX = cardX;
  const imgY = cardY;
  const imgW = cardW;
  const imgH = 1050;

  ctx.save();
  roundedRectPath(ctx, imgX, imgY, imgW, imgH, 40);
  ctx.clip();

  if (input.imageBlob) {
    try {
      const img = await loadImageFromBlob(input.imageBlob);
      drawCover(ctx, img, imgX, imgY, imgW, imgH);
    } catch {
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

  // Bottom gradient overlay on the photo
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
  const locText =
    input.locationLabel ||
    [input.venueName, input.city].filter(Boolean).join(" • ") ||
    "";
  if (locText) {
    drawPill(ctx, imgX + imgW - 32, imgY + imgH - 70, locText, 30, true);
  }

  // ---------- Text content over the bottom of the photo ----------
  const textX = cardX + 50;
  const textW = cardW - 100;

  // We want title block to sit just above the image's bottom edge
  let y = imgY + imgH - 280;

  // Title (white, bold, up to 2 lines)
  ctx.fillStyle = "#fff";
  ctx.font = `700 60px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 18;
  const titleLines = wrapLines(ctx, input.name || "Live gig", textW, 2);
  for (const line of titleLines) {
    ctx.fillText(line, textX, y);
    y += 70;
  }

  // Venue
  if (input.venueName) {
    y += 4;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `500 36px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(input.venueName, textX, y);
    y += 46;
  }

  // Date / time
  if (input.startTime) {
    const d = new Date(input.startTime as any);
    if (!Number.isNaN(d.getTime())) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `400 32px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(fmtDate(d), textX, y);
    }
  }
  ctx.shadowBlur = 0;

  // ---------- Footer band: GigLoop branding + visible URL ----------
  // This sits below the photo, inside the dark card, so the URL reads clearly.
  const footerY = imgY + imgH + 36;
  const footerH = cardH - (footerY - cardY) - 36;

  // Centered "Open in GigLoop" wordmark
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  ctx.font = `400 28px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("Open in", W / 2, footerY + 50);

  ctx.fillStyle = "rgba(168,85,247,1)";
  ctx.font = `800 64px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText("GigLoop", W / 2, footerY + 120);

  // Visible URL so users can read & type it even if the link in the message
  // gets truncated by the chat client.
  if (input.shareUrl) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `500 26px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(shortDomain(input.shareUrl), W / 2, footerY + 165);
  }

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png", 0.92);
  });
}
