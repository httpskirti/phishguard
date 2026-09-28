import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { validateFeatures, EXPECTED_FEATURES } from '../lib/features';

/**
 * UploadPanel Component
 * Handles CSV drag-and-drop, client-side preview via PapaParse,
 * 30-feature validation against schema, row-count warnings (>5000), and scan triggering.
 */
export default function UploadPanel({ onScanFile, isLoading, isOnline }) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [validationResult, setValidationResult] = useState(null);
  const [parseError, setParseError] = useState(null);
  const fileInputRef = useRef(null);

  // Process chosen file using PapaParse
  const processFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setParseError("Only .csv files are supported. Please select a valid CSV file.");
      setSelectedFile(null);
      setPreviewRows([]);
      setValidationResult(null);
      return;
    }

    setParseError(null);
    setSelectedFile(file);

    // Stream-parse with PapaParse to preview first 5 rows and extract column headers
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      complete: (results) => {
        if (results.errors && results.errors.length > 0 && results.data.length === 0) {
          setParseError(`Failed to parse CSV: ${results.errors[0].message}`);
          return;
        }

        const cols = results.meta.fields || [];
        setHeaders(cols);
        setPreviewRows(results.data);

        // Validate headers against 30 UCI features
        const validation = validateFeatures(cols);
        setValidationResult(validation);

        // Count total rows by quick full-text line count or secondary quick parse
        // Use full parse only for total row counting without retaining memory
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (fullResults) => {
            setRowCount(fullResults.data.length);
          }
        });
      },
      error: (err) => {
        setParseError(`PapaParse error: ${err.message}`);
      }
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewRows([]);
    setHeaders([]);
    setRowCount(0);
    setValidationResult(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isFormValid = selectedFile && validationResult?.isValid && isOnline;

  return (
    <section className="bg-navy-900 border border-navy-700 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white font-sans flex items-center gap-2">
            <svg className="w-5 h-5 text-legit" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Dataset Ingestion & Batch Scan
          </h2>
          <p className="text-xs text-slate-400">
            Upload CSV containing 30 URL & webpage features to run model inference
          </p>
        </div>

        {selectedFile && (
          <button
            onClick={clearSelection}
            disabled={isLoading}
            className="text-xs text-slate-400 hover:text-phish-light underline transition-colors self-start sm:self-auto"
          >
            Clear and pick another file
          </button>
        )}
      </div>

      {/* Drag & Drop Zone */}
      {!selectedFile && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? "border-legit bg-legit-bg/40 text-legit-light"
              : "border-navy-600 hover:border-navy-500 bg-navy-950/60 hover:bg-navy-950"
          }`}
          role="button"
          tabIndex={0}
          aria-label="Upload CSV file by clicking or dropping it here"
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-navy-800 border border-navy-700 text-slate-300 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <p className="text-sm font-medium text-slate-200">
            Drag and drop your website features CSV here, or <span className="text-legit underline">browse files</span>
          </p>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Expects 30 columns without target 'Result' (RFC-4180 CSV format)
          </p>
        </div>
      )}

      {/* Parse Error Box */}
      {parseError && (
        <div className="mt-4 p-3 rounded-lg bg-phish-bg border border-phish-border text-phish-light text-xs font-mono flex items-start gap-2">
          <svg className="w-4 h-4 text-phish flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{parseError}</span>
        </div>
      )}

      {/* Selected File Details & Preview */}
      {selectedFile && (
        <div className="space-y-4">
          {/* File Meta Pill */}
          <div className="p-3 bg-navy-950/80 rounded-lg border border-navy-700 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">File:</span>
              <span className="text-slate-100 font-semibold">{selectedFile.name}</span>
              <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                Rows: <strong className="text-white">{rowCount.toLocaleString() || previewRows.length}</strong>
              </span>
              <span className="text-slate-400">
                Columns: <strong className="text-white">{headers.length} / 30 expected</strong>
              </span>
            </div>
          </div>

          {/* Validation Status & Error Alert */}
          {validationResult && !validationResult.isValid && (
            <div className="p-4 rounded-lg bg-phish-bg border border-phish-border text-xs">
              <div className="flex items-center gap-2 font-semibold text-phish-light mb-1">
                <svg className="w-4 h-4 text-phish" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Schema Validation Error: Missing {validationResult.missingColumns.length} Required Feature(s)
              </div>
              <p className="text-slate-300 mb-2">
                The model requires all 30 features to compute predictions. Please add the following missing columns:
              </p>
              <div className="max-h-24 overflow-y-auto p-2 rounded bg-navy-950 font-mono text-[11px] text-phish-light border border-navy-700 flex flex-wrap gap-1.5">
                {validationResult.missingColumns.map((col) => (
                  <span key={col} className="px-1.5 py-0.5 rounded bg-phish-dark/30 border border-phish-border">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Large File Warning (> 5,000 rows) */}
          {rowCount > 5000 && (
            <div className="p-3 rounded-lg bg-warn-bg border border-warn-border text-warn text-xs font-mono flex items-start gap-2">
              <svg className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                <strong>Large dataset warning:</strong> This file contains {rowCount.toLocaleString()} records. Browser inference may take several seconds.
              </span>
            </div>
          )}

          {/* 5-Row Data Preview */}
          {previewRows.length > 0 && (
            <div className="border border-navy-700 rounded-lg overflow-hidden">
              <div className="bg-navy-800/80 px-3 py-1.5 text-xs text-slate-300 font-mono flex items-center justify-between border-b border-navy-700">
                <span>First 5 Rows Preview</span>
                <span className="text-[10px] text-slate-400">Horizontal scroll for all features</span>
              </div>
              <div className="overflow-x-auto max-h-48 bg-navy-950">
                <table className="min-w-full text-[11px] font-mono divide-y divide-navy-800">
                  <thead className="bg-navy-900 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      {headers.slice(0, 10).map((h) => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                      ))}
                      {headers.length > 10 && (
                        <th className="px-3 py-2 text-left text-slate-400">+{headers.length - 10} more...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/60 text-slate-300">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-navy-900/40">
                        <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                        {headers.slice(0, 10).map((h) => (
                          <td key={h} className="px-3 py-1.5 whitespace-nowrap">{row[h]}</td>
                        ))}
                        {headers.length > 10 && (
                          <td className="px-3 py-1.5 text-slate-400">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {!isOnline && (
              <span className="text-xs text-phish-light font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-phish"></span>
                Backend offline. Run FastAPI on port 8000 to enable scan.
              </span>
            )}
            {isOnline && validationResult?.isValid && (
              <span className="text-xs text-legit-light font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-legit"></span>
                Schema validated: all 30 features recognized
              </span>
            )}

            <button
              onClick={() => onScanFile(selectedFile)}
              disabled={!isFormValid || isLoading}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold font-sans flex items-center justify-center gap-2 transition-all shadow-md ${
                isFormValid && !isLoading
                  ? "bg-legit hover:bg-legit-dark text-navy-950 font-bold cursor-pointer"
                  : "bg-navy-800 text-slate-400 border border-navy-700 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-200" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Inference...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run Security Scan
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
