"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { Camera, X, RefreshCw, Sparkles, Loader2 } from "lucide-react";

/**
 * Kompresi foto otomatis di browser (Client-side):
 * - Membatasi dimensi maksimum (max 1400px) agar teks nota/faktur tetap tajam dan jelas.
 * - Mengonversi ke format WebP berkualitas optimal (quality 0.78).
 * - Menurunkan ukuran file dari 5-10 MB menjadi hanya ~80-180 KB (hemat 95%+ storage).
 */
async function compressImage(file: File, maxDimension = 1400, quality = 0.78): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);

      // Bersihkan background (untuk PNG transparan)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          if (blob.size >= file.size && file.size < 300 * 1024) {
            return resolve(file);
          }
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const compressed = new File([blob], `${baseName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => resolve(file);
    img.src = url;
  });
}

function fmtSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.round(bytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export function ImageUploadInput({
  name = "photo",
  label = "Lampirkan Foto (Opsional)",
  helper = "Foto otomatis dikompres hemat penyimpanan namun tetap tajam.",
}: {
  name?: string;
  label?: string;
  helper?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSizeInfo, setFileSizeInfo] = useState<string | null>(null);
  const [compressRatio, setCompressRatio] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsCompressing(true);
    try {
      const originalSize = rawFile.size;
      const compressed = await compressImage(rawFile);

      // Pasang file terkompresi kembali ke input form
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(compressed);
        fileInputRef.current.files = dt.files;
      }

      setFileName(compressed.name);
      const newSize = compressed.size;
      const ratio = Math.max(0, Math.round(((originalSize - newSize) / originalSize) * 100));

      setFileSizeInfo(
        ratio > 5
          ? `${fmtSize(newSize)} (hemat dari ${fmtSize(originalSize)})`
          : fmtSize(newSize)
      );
      setCompressRatio(ratio > 5 ? ratio : null);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error("Gagal kompresi foto:", err);
    } finally {
      setIsCompressing(false);
    }
  }

  function handleClear() {
    setPreview(null);
    setFileName(null);
    setFileSizeInfo(null);
    setCompressRatio(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <Sparkles className="h-3 w-3" /> Auto Compress (Hemat Kuota)
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {isCompressing ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs font-semibold text-slate-600 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
          <span>Mengompres &amp; mengoptimalkan foto...</span>
        </div>
      ) : preview ? (
        <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img src={preview} alt="Pratinjau" className="h-full w-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-slate-800">{fileName}</div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>{fileSizeInfo}</span>
              {compressRatio && (
                <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-bold">
                  -{compressRatio}%
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                Ganti Foto
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            title="Hapus Foto"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-4 px-3 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20 active:scale-[0.99]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
            <Camera className="h-4.5 w-4.5" />
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-700 group-hover:text-blue-700">
            Pilih Foto atau Jepret Kamera
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">{helper}</div>
        </button>
      )}
    </div>
  );
}
