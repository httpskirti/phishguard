import React, { useState } from 'react';
import { Globe2, Image as ImageIcon } from 'lucide-react';
import UrlForm from './UrlForm';
import ImageUpload from './ImageUpload';

export default function ScanPanel({ onScanUrl, onScanImage, isLoading, isOnline }) {
  const [activeTab, setActiveTab] = useState('URL');
  return (
    <div className="scan-workbench">
      <div className="workbench-head">
        <div><span>Target input</span><strong>Start a new inspection</strong></div>
        <div className="scan-tabs" role="tablist" aria-label="Scan source">
          <button role="tab" aria-selected={activeTab === 'URL'} onClick={() => setActiveTab('URL')} disabled={isLoading}><Globe2 /> URL</button>
          <button role="tab" aria-selected={activeTab === 'IMAGE'} onClick={() => setActiveTab('IMAGE')} disabled={isLoading}><ImageIcon /> Screenshot</button>
        </div>
      </div>
      <div className="workbench-body">
        {activeTab === 'URL'
          ? <UrlForm onScanUrl={onScanUrl} isLoading={isLoading} isOnline={isOnline} />
          : <ImageUpload onScanImage={onScanImage} isLoading={isLoading} isOnline={isOnline} />}
      </div>
    </div>
  );
}
