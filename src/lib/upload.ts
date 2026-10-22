import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

export async function saveUploadedFile(file: unknown, folder = "uploads"): Promise<string | null> {
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return null;
  const f = file as File;
  if (typeof f.size !== "number" || f.size <= 0) return null;

  try {
    const bytes = await f.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const rawExt = path.extname(f.name || "");
    const ext = rawExt ? rawExt.toLowerCase() : ".jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadDir, safeName);

    await fs.writeFile(filePath, buffer);
    return `/${folder}/${safeName}`;
  } catch (error) {
    console.error("Gagal menyimpan file upload:", error);
    return null;
  }
}
