import { writeFile, readFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
const LOCAL_DIR = join(process.cwd(), ".transcripts");
export type UploadResult = {
  fileKey: string;
  provider: "local";
  sizeBytes: number;
};
export async function uploadPDF(f: string, b: Buffer): Promise<UploadResult> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, f), b);
  return { fileKey: f, provider: "local", sizeBytes: b.length };
}
export async function downloadPDF(k: string): Promise<Buffer> {
  return readFile(join(LOCAL_DIR, k));
}
export async function deletePDF(k: string): Promise<void> {
  try {
    await unlink(join(LOCAL_DIR, k));
  } catch {}
}
export async function getPresignedUrl(_k: string): Promise<null> {
  return null;
}
