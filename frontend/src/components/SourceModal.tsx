"use client";

import React, { useState, useEffect } from "react";

interface SourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUrlUpload: () => void;
  onVideoUpload: () => void;
  webUrl: string;
  setWebUrl: (val: string) => void;
  youtubeUrl: string;
  setYoutubeUrl: (val: string) => void;
  loading: boolean;
}

export default function SourceModal({
  isOpen,
  onClose,
  onFileUpload,
  onUrlUpload,
  onVideoUpload,
  webUrl,
  setWebUrl,
  youtubeUrl,
  setYoutubeUrl,
  loading,
}: SourceModalProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: string; msg: string } | null>(null);

  // Success message handler
  const triggerSuccess = (msg: string) => {
    setStatus({ type: "success", msg });
    setTimeout(() => setStatus(null), 4000);
  };

  // Jab Modal band ho, state clear kar do
  useEffect(() => {
    if (!isOpen) {
      setSelectedFileName(null);
      setStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFileName(e.target.files[0].name);
      setStatus(null);
    }
  };

  const handlePdfUpload = async () => {
    const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
    if (fileInput?.files?.[0]) {
      const name = fileInput.files[0].name;
      // Step 1: Backend upload trigger
      await onFileUpload({ target: fileInput } as any);
      // Step 2: Clear selection & Show Success immediately
      setSelectedFileName(null);
      triggerSuccess(`"${name}" uploaded successfully! ✅`);
    }
  };

  const handleWebSubmit = async () => {
    if (!webUrl) return;
    await onUrlUpload();
    triggerSuccess("Website indexed successfully! 🌐");
  };

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl) return;
    await onVideoUpload();
    triggerSuccess("YouTube transcript added! 🎥");
  };

  return (
    <div className="fixed inset-0 bg-[#000000aa] backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1f20] w-full max-w-[440px] rounded-[24px] border border-[#3c4043] shadow-2xl overflow-hidden">
        
        <div className="px-6 pt-6 pb-2 flex justify-between items-center">
          <h2 className="text-lg font-medium text-[#e3e3e3]">Add sources</h2>
          <button onClick={onClose} className="text-[#9aa0a6] hover:text-white transition-colors p-1">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* PDF Section */}
          <div className="space-y-3">
            <div className="relative border border-[#3c4043] hover:border-[#a8c7fa]/50 rounded-xl p-8 bg-[#131314]/40 flex flex-col items-center justify-center text-center cursor-pointer group">
              <input id="pdf-upload" type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" accept=".pdf" onChange={handleFileChange} />
              <div className="w-12 h-12 bg-[#282a2c] rounded-full flex items-center justify-center text-2xl mb-2">📄</div>
              <p className="text-sm font-medium text-[#e3e3e3] truncate max-w-[300px]">
                {selectedFileName || "Choose PDF file"}
              </p>
            </div>

            {selectedFileName && (
              <button 
                onClick={handlePdfUpload} 
                disabled={loading}
                className="w-full bg-[#a8c7fa] hover:bg-white text-black text-xs font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? "UPLOADING..." : "UPLOAD FILE"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3"><div className="h-[1px] flex-1 bg-[#3c4043]"></div><span className="text-[9px] font-bold text-[#5f6368] uppercase">Links</span><div className="h-[1px] flex-1 bg-[#3c4043]"></div></div>

          {/* Web Section */}
          <div className="space-y-2">
            <div className="flex items-center bg-[#131314] border border-[#3c4043] rounded-xl pl-4 pr-2 py-1.5 focus-within:border-[#a8c7fa]/50">
              <span className="text-xs opacity-40">🌐</span>
              <input type="text" placeholder="Website URL" value={webUrl} onChange={(e) => setWebUrl(e.target.value)} className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#e3e3e3] outline-none" />
              {webUrl && <button onClick={handleWebSubmit} disabled={loading} className="bg-[#282a2c] text-[#a8c7fa] text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#3c4043]">ADD</button>}
            </div>
          </div>

          {/* YouTube Section */}
          <div className="space-y-2">
            <div className="flex items-center bg-[#131314] border border-[#3c4043] rounded-xl pl-4 pr-2 py-1.5 focus-within:border-[#f28b82]/50">
              <span className="text-xs opacity-40">🎥</span>
              <input type="text" placeholder="YouTube link" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#e3e3e3] outline-none" />
              {youtubeUrl && <button onClick={handleYoutubeSubmit} disabled={loading} className="bg-[#282a2c] text-[#f28b82] text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#3c4043]">ADD</button>}
            </div>
          </div>

          {/* Success Notification Box */}
          {status && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-lg animate-in fade-in slide-in-from-bottom-2 text-center">
              <p className="text-[11px] text-emerald-400 font-semibold">{status.msg}</p>
            </div>
          )}
        </div>

        {loading && <div className="h-[2px] w-full bg-[#3c4043] overflow-hidden"><div className="h-full bg-[#a8c7fa] animate-progress origin-left"></div></div>}
      </div>
    </div>
  );
}