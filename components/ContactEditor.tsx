import React, { useEffect, useState } from 'react';
import { CONTACT_FIELDS } from '../constants';
import { ContactData } from '../types';
import { VoiceRecorder } from './VoiceRecorder';
import { ImageUpload } from './ImageUpload';

interface ContactEditorProps {
  data: ContactData;
  onChange: (data: ContactData) => void;
  onConfirm: () => void;
  onReset: () => void;
  onSmartUpdate: (params: { image?: string[]; audio?: string }) => void;
  isUpdating: boolean;
}

export const ContactEditor: React.FC<ContactEditorProps> = ({ 
  data, 
  onChange, 
  onConfirm, 
  onReset,
  onSmartUpdate,
  isUpdating
}) => {
  const [initialMissingKeys, setInitialMissingKeys] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Update State
  const [updateImages, setUpdateImages] = useState<string[]>([]);
  const [updateAudio, setUpdateAudio] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      const missing = CONTACT_FIELDS
        .filter(field => !data[field.key])
        .map(field => field.key as string);
      setInitialMissingKeys(missing);
      setInitialized(true);
    }
  }, [data, initialized]);

  // Calculation Helper
  const calculateNextDue = (lastContactStr: string, frequencyStr: string): string => {
    if (!lastContactStr) return '';
    
    let monthsToAdd = 4; // Default
    const match = frequencyStr.match(/(\d+)/);
    
    if (match) {
        monthsToAdd = parseInt(match[1], 10);
    } else {
        const lower = frequencyStr.toLowerCase();
        if (lower.includes('month')) monthsToAdd = 1;
        else if (lower.includes('year')) monthsToAdd = 12;
    }

    try {
        const date = new Date(lastContactStr);
        if (isNaN(date.getTime())) return '';
        date.setMonth(date.getMonth() + monthsToAdd);
        return date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
  };

  const handleChange = (key: keyof ContactData, value: string) => {
    let newData = { ...data, [key]: value };

    // Auto-calculation logic for dates
    if (key === 'lastContact' || key === 'contactFrequency') {
        const lastContact = key === 'lastContact' ? value : data.lastContact;
        const frequency = key === 'contactFrequency' ? value : data.contactFrequency;
        const nextDue = calculateNextDue(lastContact, frequency);
        newData.nextContactDue = nextDue;
    }

    onChange(newData);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const triggerUpdate = () => {
    if (updateImages.length > 0 || updateAudio) {
      onSmartUpdate({ image: updateImages.length > 0 ? updateImages : undefined, audio: updateAudio || undefined });
      setUpdateImages([]);
      setUpdateAudio(null);
    }
  };

  const removeUpdateImage = (index: number) => {
    setUpdateImages(prev => prev.filter((_, i) => i !== index));
  };

  const currentMissingCount = CONTACT_FIELDS.filter(f => !data[f.key]).length;
  const filledCount = CONTACT_FIELDS.length - currentMissingCount;
  const progress = Math.round((filledCount / CONTACT_FIELDS.length) * 100);

  const extractedFields = CONTACT_FIELDS.filter(f => !initialMissingKeys.includes(f.key as string));
  const missingFieldsList = CONTACT_FIELDS.filter(f => initialMissingKeys.includes(f.key as string));

  const renderInput = (field: any, isFilled: boolean, isMissingSection: boolean) => {
    const commonClasses = `w-full px-3 py-2 rounded-md transition-all outline-none border ${
        field.readOnly 
            ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
            : isMissingSection
                ? (isFilled 
                    ? 'bg-green-50 border-green-300 text-green-900 focus:ring-2 focus:ring-green-500' 
                    : 'bg-white border-yellow-300 text-slate-800 focus:ring-2 focus:ring-yellow-500')
                : 'bg-slate-50 border-slate-200 text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
    }`;

    if (field.type === 'select' && field.options) {
        return (
            <select
                value={data[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                onKeyDown={handleKeyDown}
                className={`${commonClasses} appearance-none bg-no-repeat bg-[right_0.5rem_center] pr-8`}
                disabled={field.readOnly}
            >
                <option value="" disabled>Select option</option>
                {field.options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    if (field.type === 'datalist' && field.options) {
      return (
        <>
          <input
            list={`${field.key}-list`}
            value={data[field.key]}
            placeholder={field.placeholder}
            onChange={(e) => handleChange(field.key, e.target.value)}
            onKeyDown={handleKeyDown}
            className={commonClasses}
            readOnly={field.readOnly}
          />
          <datalist id={`${field.key}-list`}>
            {field.options.map((opt: string) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </>
      );
    }

    return (
        <input
            type={field.type}
            value={data[field.key]}
            readOnly={field.readOnly}
            placeholder={field.placeholder}
            onChange={(e) => handleChange(field.key, e.target.value)}
            onKeyDown={handleKeyDown}
            className={commonClasses}
        />
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in relative pb-12">
      
      {isUpdating && (
        <div className="absolute inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-sm rounded-xl">
           <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center border border-indigo-100">
             <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="font-medium text-slate-800">Updating info...</p>
           </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Review Contact</h2>
          <p className="text-slate-500 text-sm">Review data or add more details.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Start Over
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2"
          >
            <span>Save to Google Sheet</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
          <span>Data Completeness</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-indigo-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Extracted Data */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Extracted Information</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {extractedFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 flex justify-between">
                    {field.label}
                    {field.readOnly && <span className="text-slate-400 text-[10px] bg-slate-100 px-1 rounded">Auto</span>}
                  </label>
                  {renderInput(field, false, false)}
                </div>
              ))}
              {extractedFields.length === 0 && (
                 <div className="col-span-2 text-center text-slate-400 py-4">No data extracted yet. Please fill details manually or use voice.</div>
              )}
            </div>
          </div>
        </div>

        {/* Missing Data Questions */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Smart Update Box */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 shadow-sm">
             <h3 className="font-semibold text-indigo-900 mb-2 text-sm flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               Smart Update
             </h3>
             <p className="text-xs text-indigo-700 mb-4 leading-relaxed">
               Add screenshots (e.g. phone number) or record a voice note to update fields automatically.
             </p>

             <div className="space-y-3">
                {/* Tools Row */}
                <div className="flex gap-2">
                    <ImageUpload 
                        compact 
                        onImagesSelected={(imgs) => setUpdateImages(prev => [...prev, ...imgs])} 
                    />
                </div>
                
                {/* Preview Area for Images */}
                {updateImages.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {updateImages.map((img, idx) => (
                        <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-indigo-200 bg-slate-100">
                            <img src={img} className="w-full h-full object-cover" alt={`Update preview ${idx}`} />
                            <button 
                                onClick={() => removeUpdateImage(idx)}
                                className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl hover:bg-red-600"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                  </div>
                )}
                
                {/* Voice Recorder */}
                <VoiceRecorder 
                   onAudioReady={setUpdateAudio} 
                   onClear={() => setUpdateAudio(null)} 
                   hasAudio={!!updateAudio}
                />

                {/* Apply Button */}
                <button
                  onClick={triggerUpdate}
                  disabled={updateImages.length === 0 && !updateAudio}
                  className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    (updateImages.length > 0 || updateAudio) 
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' 
                      : 'bg-indigo-200 text-indigo-50 cursor-not-allowed'
                  }`}
                >
                  Analyze & Update
                </button>
             </div>
          </div>

          <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden sticky top-6">
            <div className="bg-yellow-100/50 px-6 py-4 border-b border-yellow-200">
              <h3 className="font-semibold text-yellow-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Missing Details
              </h3>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-yellow-800 mb-4">
                Fill these out manually or use the Smart Update tool above.
              </p>
              {missingFieldsList.length === 0 && (
                <div className="text-center py-8 text-green-600 font-medium">
                  All fields started with values!
                </div>
              )}
              {missingFieldsList.map((field) => {
                const isFilled = !!data[field.key];
                return (
                  <div key={field.key} className="relative">
                    <label className="block text-xs font-medium text-yellow-800/70 uppercase tracking-wide mb-1 flex justify-between">
                      {field.label}
                      {isFilled && <span className="text-green-600 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Filled
                      </span>}
                    </label>
                    {renderInput(field, isFilled, true)}
                  </div>
                );
              })}
              
              {/* Manual Update Action Button */}
              {missingFieldsList.length > 0 && (
                  <div className="pt-4 border-t border-yellow-100">
                      <button 
                        onClick={onConfirm}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
                      >
                         <span>Save to Google Sheet</span>
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </button>
                  </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};