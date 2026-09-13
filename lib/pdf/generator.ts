export type PDFResult = { bytes: Buffer; checksum: string; sizeBytes: number };
export async function renderHTMLToPDF(_html: string): Promise<PDFResult> {
  throw new Error("PDF generation removed. Use browser print.");
}
