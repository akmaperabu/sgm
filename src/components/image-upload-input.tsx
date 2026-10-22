"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { Camera, X, RefreshCw } from "lucide-react";

export function ImageUploadInput({
  name = "photo",
  label = "Lampirkan Foto (Opsional)",
  helper = "Format JPG, PNG, atau WebP. Bisa langsung jepret dari kamera HP.",
}: {
  name?: string;
  label?: string;
  helper?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setFileSize(Number(sizeInMb) < 0.1 ? `${Math.round(file.size / 1024)} KB` : `${sizeInMb} MB`);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleClear() {
    setPreview(null);
    setFileName(null);
    setFileSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</label>

      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-2.5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img src={preview} alt="Pratinjau" className="h-full w-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-slate-800">{fileName}</div>
            <div className="text-[11px] font-mono text-slate-500 mt-0.5">{fileSize}</div>
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
