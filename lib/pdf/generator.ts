/**
 * PDF generation service.
 *
 * Wraps Puppeteer with:
 *  - Concurrency control (max 2 simultaneous browser instances)
 *  - Deterministic render settings for consistent output
 *  - SHA-256 checksum of the produced bytes for tamper detection
 *
 * This module is Node.js only — never import in middleware or Edge routes.
 *
 * Deployment note:
 *  On Vercel, use @sparticuz/chromium (a stripped Chromium build for Lambda).
 *  Self-hosted / Docker: install Chromium via apt and point PUPPETEER_EXECUTABLE_PATH.
 *
 *  PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser (Docker)
 *  No env var needed on local dev (Puppeteer bundles Chromium).
 */

import puppeteer, { type Browser } from "puppeteer";
import { createHash } from "crypto";

// ─── Concurrency control ──────────────────────────────────────────────────────

const MAX_CONCURRENT = 2;

let activeBrowsers = 0;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (activeBrowsers < MAX_CONCURRENT) {
      activeBrowsers++;
      resolve();
    } else {
      queue.push(() => {
        activeBrowsers++;
        resolve();
      });
    }
  });
}

function releaseSlot(): void {
  activeBrowsers--;
  const next = queue.shift();
  if (next) next();
}

// ─── PDF generation ───────────────────────────────────────────────────────────

export type PDFResult = {
  bytes: Buffer;
  /** SHA-256 hex digest of the PDF bytes. Store this for tamper detection. */
  checksum: string;
  /** File size in bytes for logging/monitoring. */
  sizeBytes: number;
};

/**
 * Render an HTML string to a PDF buffer.
 *
 * Uses A4 format with print media emulation so @page rules take effect.
 * Background graphics are disabled (cleaner output on most printers).
 *
 * @throws If Puppeteer fails to launch or the page times out.
 */
export async function renderHTMLToPDF(html: string): Promise<PDFResult> {
  await acquireSlot();

  let browser: Browser | null = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? undefined,
      args: [
        "--no-sandbox", // Required in Docker / Lambda
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Prevents crashes in low-memory environments
        "--disable-gpu",
        "--no-zygote", // Required on some Linux environments
        "--single-process", // Reduces memory in serverless contexts
      ],
    });

    const page = await browser.newPage();

    // Restrict network to prevent SSRF — the page should be self-contained
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      const url = req.url();

      // Allow: document, stylesheet (inline), fonts, images (data URIs)
      // Block: external scripts, XHR, WebSockets, frames
      if (
        resourceType === "document" ||
        resourceType === "stylesheet" ||
        resourceType === "font" ||
        (resourceType === "image" &&
          (url.startsWith("data:") || url.startsWith("file:")))
      ) {
        req.continue();
      } else {
        req.abort("blockedbyclient");
      }
    });

    // Set content and wait for fonts + layout
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });

    // Emulate print media so @page CSS takes effect
    await page.emulateMediaType("print");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: false,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      timeout: 30_000,
    });

    const bytes = Buffer.from(pdfBuffer);
    const checksum = createHash("sha256").update(bytes).digest("hex");

    return {
      bytes,
      checksum,
      sizeBytes: bytes.length,
    };
  } finally {
    // Always close the browser and release the slot — even on error
    await browser?.close();
    releaseSlot();
  }
}
