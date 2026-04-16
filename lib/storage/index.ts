// /**
//  * PDF file storage — S3-compatible with local filesystem fallback.
//  *
//  * In development (no S3 env vars): files are saved to .transcripts/ locally.
//  * In production: files are stored in S3 (or any S3-compatible service).
//  *
//  * Supported providers:
//  *   AWS S3         — set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
//  *   Cloudflare R2  — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//  *   MinIO          — set MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
//  *
//  * All providers use the same AWS SDK v3 (S3-compatible API).
//  *
//  * Install:  pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
//  */

// import { writeFile, readFile, mkdir, unlink } from "fs/promises";
// import { join }   from "path";

// // ─── Types ────────────────────────────────────────────────────────────────────

// export type StorageProvider = "local" | "s3";

// export type UploadResult = {
//   fileKey:  string;   // The key stored in the DB (path or S3 object key)
//   provider: StorageProvider;
//   sizeBytes: number;
// };

// // ─── Provider detection ───────────────────────────────────────────────────────

// function getProvider(): StorageProvider {
//   if (
//     process.env.AWS_ACCESS_KEY_ID ||
//     process.env.R2_ACCESS_KEY_ID ||
//     process.env.MINIO_ACCESS_KEY
//   ) {
//     return "s3";
//   }
//   return "local";
// }

// // ─── S3 client (lazy-loaded to avoid import errors when AWS SDK not installed) ─

// async function getS3Client() {
//   const { S3Client } = await import("@aws-sdk/client-s3");

//   // Cloudflare R2
//   if (process.env.R2_ACCOUNT_ID) {
//     return {
//       client: new S3Client({
//         region: "auto",
//         endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
//         credentials: {
//           accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
//           secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
//         },
//       }),
//       bucket: process.env.R2_BUCKET!,
//     };
//   }

//   // MinIO or other S3-compatible
//   if (process.env.MINIO_ENDPOINT) {
//     return {
//       client: new S3Client({
//         region:   "us-east-1",
//         endpoint: process.env.MINIO_ENDPOINT,
//         credentials: {
//           accessKeyId:     process.env.MINIO_ACCESS_KEY!,
//           secretAccessKey: process.env.MINIO_SECRET_KEY!,
//         },
//         forcePathStyle: true,
//       }),
//       bucket: process.env.MINIO_BUCKET!,
//     };
//   }

//   // AWS S3 (default)
//   return {
//     client: new S3Client({
//       region: process.env.AWS_REGION ?? "us-east-1",
//       credentials: {
//         accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
//         secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//       },
//     }),
//     bucket: process.env.S3_BUCKET!,
//   };
// }

// // ─── Public API ───────────────────────────────────────────────────────────────

// /**
//  * Upload a PDF buffer.
//  * Returns the fileKey to store in the transcripts table.
//  */
// export async function uploadPDF(
//   filename: string,
//   bytes:    Buffer
// ): Promise<UploadResult> {
//   const provider = getProvider();

//   if (provider === "s3") {
//     return uploadToS3(filename, bytes);
//   }
//   return uploadToLocal(filename, bytes);
// }

// /**
//  * Download a PDF by its fileKey.
//  */
// export async function downloadPDF(fileKey: string): Promise<Buffer> {
//   const provider = getProvider();

//   if (provider === "s3") {
//     return downloadFromS3(fileKey);
//   }
//   return downloadFromLocal(fileKey);
// }

// /**
//  * Delete a PDF by its fileKey.
//  */
// export async function deletePDF(fileKey: string): Promise<void> {
//   const provider = getProvider();

//   if (provider === "s3") {
//     await deleteFromS3(fileKey);
//   } else {
//     await deleteFromLocal(fileKey);
//   }
// }

// /**
//  * Generate a pre-signed URL for direct S3 download (bypasses your server).
//  * Returns null in local mode (use the /api/transcript/[id] route instead).
//  */
// export async function getPresignedUrl(
//   fileKey:       string,
//   expiresInSecs: number = 300
// ): Promise<string | null> {
//   if (getProvider() === "local") return null;

//   const { getSignedUrl }   = await import("@aws-sdk/s3-request-presigner");
//   const { GetObjectCommand } = await import("@aws-sdk/client-s3");
//   const { client, bucket } = await getS3Client();

//   return getSignedUrl(
//     client,
//     new GetObjectCommand({ Bucket: bucket, Key: fileKey }),
//     { expiresIn: expiresInSecs }
//   );
// }

// // ─── Local implementation ─────────────────────────────────────────────────────

// const LOCAL_DIR = join(process.cwd(), ".transcripts");

// async function uploadToLocal(filename: string, bytes: Buffer): Promise<UploadResult> {
//   await mkdir(LOCAL_DIR, { recursive: true });
//   await writeFile(join(LOCAL_DIR, filename), bytes);
//   return { fileKey: filename, provider: "local", sizeBytes: bytes.length };
// }

// async function downloadFromLocal(fileKey: string): Promise<Buffer> {
//   return readFile(join(LOCAL_DIR, fileKey));
// }

// async function deleteFromLocal(fileKey: string): Promise<void> {
//   try {
//     await unlink(join(LOCAL_DIR, fileKey));
//   } catch {
//     // File already gone — not a fatal error
//   }
// }

// // ─── S3 implementation ────────────────────────────────────────────────────────

// async function uploadToS3(filename: string, bytes: Buffer): Promise<UploadResult> {
//   const { PutObjectCommand } = await import("@aws-sdk/client-s3");
//   const { client, bucket }  = await getS3Client();

//   // Prefix with year/month for easy archiving
//   const now    = new Date();
//   const prefix = `transcripts/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
//   const key    = `${prefix}/${filename}`;

//   await client.send(new PutObjectCommand({
//     Bucket:      bucket,
//     Key:         key,
//     Body:        bytes,
//     ContentType: "application/pdf",
//     // Server-side encryption
//     ServerSideEncryption: "AES256",
//     // Prevent public access
//     ACL: "private",
//   }));

//   return { fileKey: key, provider: "s3", sizeBytes: bytes.length };
// }

// async function downloadFromS3(fileKey: string): Promise<Buffer> {
//   const { GetObjectCommand } = await import("@aws-sdk/client-s3");
//   const { client, bucket }  = await getS3Client();

//   const response = await client.send(new GetObjectCommand({
//     Bucket: bucket,
//     Key:    fileKey,
//   }));

//   if (!response.Body) throw new Error("Empty S3 response body");

//   // Stream → Buffer
//   const chunks: Uint8Array[] = [];
//   for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
//     chunks.push(chunk);
//   }
//   return Buffer.concat(chunks);
// }

// async function deleteFromS3(fileKey: string): Promise<void> {
//   const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
//   const { client, bucket }     = await getS3Client();

//   await client.send(new DeleteObjectCommand({
//     Bucket: bucket,
//     Key:    fileKey,
//   }));
// }

/**
 * PDF file storage — local filesystem only.
 *
 * Files are saved to .transcripts/ in the project root (auto-created).
 * This directory is gitignored and persists across dev restarts.
 *
 * To add S3/R2/MinIO support in future, replace this file with the
 * full storage implementation from the production update zip.
 */

import { writeFile, readFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

const LOCAL_DIR = join(process.cwd(), ".transcripts");

export type UploadResult = {
  fileKey: string;
  provider: "local";
  sizeBytes: number;
};

export async function uploadPDF(
  filename: string,
  bytes: Buffer,
): Promise<UploadResult> {
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(join(LOCAL_DIR, filename), bytes);
  return { fileKey: filename, provider: "local", sizeBytes: bytes.length };
}

export async function downloadPDF(fileKey: string): Promise<Buffer> {
  return readFile(join(LOCAL_DIR, fileKey));
}

export async function deletePDF(fileKey: string): Promise<void> {
  try {
    await unlink(join(LOCAL_DIR, fileKey));
  } catch {
    // File already gone — not fatal
  }
}

/**
 * Pre-signed URLs are S3-only. Always returns null in local mode.
 * The /api/transcript/[id] route handles streaming instead.
 */
export async function getPresignedUrl(_fileKey: string): Promise<null> {
  return null;
}
