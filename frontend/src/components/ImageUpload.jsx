import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, XCircle, Loader2, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export default function ImageUpload({ onScanImage, isLoading, isOnline }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;

    // Check mime type (PNG or JPG)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Invalid file format. Please upload a PNG or JPG/JPEG screenshot.");
      clearSelection();
      return;
    }

    // Check size limit (10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg(`File exceeds 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a smaller screenshot.`);
      clearSelection();
      return;
    }

    setErrorMsg('');
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const clearSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Please select a screenshot first.");
      return;
    }
    onScanImage(selectedFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drag & Drop Area */}
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-primary-500 bg-primary-50 text-primary-900'
              : 'border-gray-300 hover:border-primary-400 bg-gray-50/70 hover:bg-gray-50'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          aria-label="Upload website screenshot"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 text-gray-500 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <UploadCloud className="w-6 h-6 text-primary-600" />
          </div>

          <p className="text-sm font-medium text-gray-800">
            Drag & drop a website screenshot here, or <span className="text-primary-600 underline">browse files</span>
          </p>
          <p className="text-xs text-gray-500 mt-1 font-mono">
            PNG or JPG up to 10 MB &bull; <strong>Must clearly capture browser address bar</strong>
          </p>
        </div>
      ) : (
        /* Image Preview Box */
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-36 h-24 bg-white rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Uploaded website screenshot preview"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex-1 min-w-0 text-xs font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-900 font-semibold truncate block max-w-xs">{selectedFile.name}</span>
              <button
                type="button"
                onClick={clearSelection}
                disabled={isLoading}
                className="text-gray-400 hover:text-phish transition-colors ml-2"
                title="Remove image"
                aria-label="Remove image"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <p className="text-gray-500">
              Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Type: {selectedFile.type}
            </p>
            <p className="text-legit-dark mt-1 text-[11px] font-medium">
              Ready for address bar OCR extraction and model classification.
            </p>
          </div>
        </div>
      )}

      {/* Helpful Hint on Address Bar */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-[11px] text-gray-600 font-mono">
        <AlertCircle className="w-4 h-4 text-warn-dark flex-shrink-0 mt-0.5" />
        <span>
          <strong>Screenshot Tip:</strong> The OCR parser extracts the hostname from the browser address bar at the top of the image. If the URL bar is missing or obscured, the server returns an error (HTTP 422).
        </span>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-phish-bg border border-phish-border text-phish-dark text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {/* Action Trigger */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={!selectedFile || isLoading || !isOnline}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold font-sans flex items-center justify-center gap-2 transition-all shadow-xs ${
            selectedFile && !isLoading && isOnline
              ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer'
              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Scanning Screenshot…
            </>
          ) : (
            <>
              <ImageIcon className="w-3.5 h-3.5" />
              Scan Screenshot
            </>
          )}
        </button>
      </div>
    </form>
  );
}
