import React, { useState } from 'react';
import { Globe, Image as ImageIcon } from 'lucide-react';
import UrlForm from './UrlForm';
import ImageUpload from './ImageUpload';

export default function ScanPanel({ onScanUrl, onScanImage, isLoading, isOnline }) {
  const [activeTab, setActiveTab] = useState('URL'); // 'URL' | 'IMAGE'

  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('URL')}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'URL'
              ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Globe className="w-4 h-4" />
          Check a URL
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('IMAGE')}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'IMAGE'
              ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Upload Screenshot (OCR)
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'URL' ? (
        <UrlForm
          onScanUrl={onScanUrl}
          isLoading={isLoading}
          isOnline={isOnline}
        />
      ) : (
        <ImageUpload
          onScanImage={onScanImage}
          isLoading={isLoading}
          isOnline={isOnline}
        />
      )}
    </section>
  );
}
