import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

export async function saveUploadedFile(file: unknown, folder = "uploads"): Promise<string | null> {
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return null;
  const f = file as File;
  if (typeof f.size !== "number" || f.size <= 0) return null;

  try {
    const bytes = await f.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const rawExt = path.extname(f.name || "");
    const ext = rawExt ? rawExt.toLowerCase() : ".jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    // 1. Jika Supabase Storage dikonfigurasi (untuk Production Vercel / Cloud)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const filePath = `${folder}/${safeName}`;
      const contentType = f.type || (ext === ".webp" ? "image/webp" : "image/jpeg");

      const { error } = await supabase.storage.from("sgm-uploads").upload(filePath, buffer, {
        contentType,
        upsert: true,
      });

      if (!error) {
        const { data } = supabase.storage.from("sgm-uploads").getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
      } else {
        console.warn("Supabase upload error, fallback to local:", error.message);
      }
    }

    // 2. Fallback ke filesystem lokal (untuk Development di Laptop)
    const uploadDir = path.join(process.cwd(), "public", folder);
    await fs.mkdir(uploadDir, { recursive: true });
    const localFilePath = path.join(uploadDir, safeName);
    await fs.writeFile(localFilePath, buffer);
    return `/${folder}/${safeName}`;
  } catch (error) {
    console.error("Gagal menyimpan file upload:", error);
    return null;
  }
}
