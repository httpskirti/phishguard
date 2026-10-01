import React, { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export default function ImageUpload({ onScanImage, isLoading, isOnline }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      clearSelection();
      setErrorMsg('Use a PNG or JPG screenshot.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      clearSelection();
      setErrorMsg('The screenshot must be smaller than 10 MB.');
      return;
    }
    setErrorMsg('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  return (
    <form className="image-inspector" onSubmit={(event) => { event.preventDefault(); if (selectedFile) onScanImage(selectedFile); }}>
      <div
        className={isDragOver ? 'image-drop active' : 'image-drop'}
        onDrop={(event) => { event.preventDefault(); setIsDragOver(false); handleFile(event.dataTransfer.files?.[0]); }}
        onDragOver={(event) => { event.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={(event) => handleFile(event.target.files?.[0])} hidden />
        {selectedFile ? (
          <><img src={previewUrl} alt="Selected browser screenshot" /><div><strong>{selectedFile.name}</strong><span>{(selectedFile.size / 1048576).toFixed(2)} MB / ready for OCR</span></div><button type="button" onClick={(event) => { event.stopPropagation(); clearSelection(); }} title="Remove screenshot"><X /></button></>
        ) : (
          <><Upload /><div><strong>Drop a browser screenshot</strong><span>PNG or JPG / address bar visible / 10 MB maximum</span></div></>
        )}
      </div>
      <div className="image-actions">
        <p><AlertCircle /> OCR reads the URL from the browser address bar.</p>
        <button type="submit" disabled={!selectedFile || isLoading || !isOnline}>
          {isLoading ? <><Loader2 className="spin" /> Scanning</> : <><ImageIcon /> Inspect screenshot <ArrowRight /></>}
        </button>
      </div>
      {errorMsg && <p className="input-error">{errorMsg}</p>}
    </form>
  );
}
