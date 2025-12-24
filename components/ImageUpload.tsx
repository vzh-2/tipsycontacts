import React, { useCallback, useState } from 'react';

interface ImageUploadProps {
  onImagesSelected: (base64s: string[]) => void;
  compact?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ onImagesSelected, compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFiles(Array.from(files));
    e.target.value = '';
  };

  const processFiles = (files: File[]) => {
    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(base64s => {
      onImagesSelected(base64s);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) processFiles(Array.from(files));
  }, [onImagesSelected]);

  // Common styling for both modes, but full size has slightly more padding than compact
  const containerClasses = compact
    ? `flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50`
    : `relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ease-in-out cursor-pointer group ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`;

  if (compact) {
    return (
      <label className={containerClasses}>
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
         Add Photo
         <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </label>
    );
  }

  return (
    <div className="w-full">
      <div
        className={containerClasses}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
        />
        
        <div className="flex flex-row items-center justify-center gap-4">
          <div className="p-2 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
            <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-base font-medium text-slate-700">Upload or Take Photo</p>
            <p className="text-xs text-slate-400">Library, Camera, or Files</p>
          </div>
        </div>
      </div>
    </div>
  );
};