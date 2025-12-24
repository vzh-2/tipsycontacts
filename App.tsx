import React, { useState, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { ContactEditor } from './components/ContactEditor';
import { VoiceRecorder } from './components/VoiceRecorder';
import { processContactInfo } from './services/geminiService';
import { ContactData, ProcessingStatus } from './types';
import { INITIAL_CONTACT_DATA, CONTACT_FIELDS } from './constants';
import { Spinner } from './components/Spinner';

// Helper to calculate future date
const getFutureDate = (dateStr: string, months: number = 4) => {
    try {
        const d = new Date(dateStr);
        d.setMonth(d.getMonth() + months);
        return d.toISOString().split('T')[0];
    } catch {
        return '';
    }
};

const GOOGLE_SCRIPT_CODE = `function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Wait up to 10s for other processes to finish

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // We expect JSON string in the post body
    var data = JSON.parse(e.postData.contents);
    
    // Configuration: Map nice Headers to internal Keys
    var columns = [
      { header: "Meet When", key: "meetWhen" },
      { header: "First Name", key: "firstName" },
      { header: "Last Name", key: "lastName" },
      { header: "Title", key: "title" },
      { header: "Company", key: "company" },
      { header: "School", key: "school" },
      { header: "Industry", key: "industry" },
      { header: "Current Resident", key: "currentResident" },
      { header: "Nationality", key: "nationality" },
      { header: "Age Range", key: "ageRange" },
      { header: "Birthday", key: "birthday" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "phone" },
      { header: "Link", key: "link" },
      { header: "First Impression", key: "firstImpression" },
      { header: "Importance", key: "importance" },
      { header: "Contact Frequency", key: "contactFrequency" },
      { header: "Last Contact", key: "lastContact" },
      { header: "Last Contact Notes", key: "lastContactNotes" },
      { header: "Notes", key: "notes" },
      { header: "Next Contact Due", key: "nextContactDue" }
    ];
    
    var headerNames = columns.map(function(c) { return c.header; });
    
    // Smart Header Check:
    // If the sheet is empty OR the first header looks like a raw key (e.g. "meetWhen"),
    // we overwrite row 1 with the nice Human Readable headers.
    
    var firstCell = "";
    if (sheet.getLastRow() > 0) {
      firstCell = sheet.getRange(1, 1).getValue();
    }
    
    if (sheet.getLastRow() === 0 || firstCell === "meetWhen" || firstCell === "meetwhen") {
      // If updating existing, we just set values, if new we append
      if (sheet.getLastRow() > 0) {
        sheet.getRange(1, 1, 1, headerNames.length).setValues([headerNames]);
      } else {
        sheet.appendRow(headerNames);
      }
      // Apply Formatting (Bold, Grey Background, Borders)
      sheet.getRange(1, 1, 1, headerNames.length)
           .setFontWeight("bold")
           .setBackground("#f3f4f6") // Light gray
           .setBorder(true, true, true, true, true, true, "#e5e7eb", SpreadsheetApp.BorderStyle.SOLID);
      sheet.setFrozenRows(1);
    }
    
    // Map incoming data
    var row = columns.map(function(c) {
      return data[c.key] || "";
    });
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({"result":"success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({"result":"error", "error": e.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}`;

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Sheet Settings
  const [showSettings, setShowSettings] = useState(false);
  // Persistent states for webhook and sheet view URLs
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('tipsyContactsWebhookUrl') || '');
  const [sheetViewUrl, setSheetViewUrl] = useState(() => localStorage.getItem('tipsyContactsSheetViewUrl') || '');

  // Temporary states for inputs within the settings modal
  const [tempWebhookUrl, setTempWebhookUrl] = useState('');
  const [tempSheetViewUrl, setTempSheetViewUrl] = useState('');
  const [showSavedConfirmation, setShowSavedConfirmation] = useState(false); // New state for confirmation

  const [showScriptHelp, setShowScriptHelp] = useState(false);

  // Effect to synchronize temporary states when the settings modal opens
  useEffect(() => {
    if (showSettings) {
      setTempWebhookUrl(webhookUrl);
      setTempSheetViewUrl(sheetViewUrl);
      setShowSavedConfirmation(false); // Hide confirmation when opening settings
    }
  }, [showSettings, webhookUrl, sheetViewUrl]);

  // Handler to save settings and persist to localStorage
  const handleSaveSettings = () => {
    setWebhookUrl(tempWebhookUrl);
    localStorage.setItem('tipsyContactsWebhookUrl', tempWebhookUrl);

    setSheetViewUrl(tempSheetViewUrl);
    localStorage.setItem('tipsyContactsSheetViewUrl', tempSheetViewUrl);
    
    setShowSavedConfirmation(true); // Show confirmation
    setTimeout(() => setShowSavedConfirmation(false), 2500); // Hide after 2.5 seconds
    // setShowSettings(false); // Keep modal open for user to see confirmation
  };

  // Handler to close settings without saving (discards temporary changes)
  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  // Initialize data
  const [data, setData] = useState<ContactData>(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
        ...INITIAL_CONTACT_DATA,
        lastContact: today,
        contactFrequency: 'Every 4 months',
        nextContactDue: getFutureDate(today, 4)
    };
  });

  // Input States
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [inputAudio, setInputAudio] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAnalyze = async () => {
    if (inputImages.length === 0 && !inputAudio) return;

    setStatus('analyzing');
    setError(null);
    try {
      const result = await processContactInfo({
        imagesBase64: inputImages,
        audioBase64: inputAudio
      });
      
      setData(prev => ({
          ...prev,
          ...result,
          lastContact: result.lastContact || prev.lastContact,
          contactFrequency: result.contactFrequency || prev.contactFrequency,
          nextContactDue: getFutureDate(result.lastContact || prev.lastContact, 4)
      }));
      
      setStatus('review');
    } catch (err) {
      setError("Failed to process input. Please try again.");
      setStatus('idle');
    }
  };

  const handleSmartUpdateWrapper = async (params: { image?: string[]; audio?: string }) => {
    if ((!params.image || params.image.length === 0) && !params.audio) return;
    
    setIsUpdating(true);
    try {
        const result = await processContactInfo({
            imagesBase64: params.image,
            audioBase64: params.audio,
            currentData: data
        });
        
        setData(prev => {
            const nextLastContact = result.lastContact || prev.lastContact;
            return {
                ...prev,
                ...result,
                nextContactDue: getFutureDate(nextLastContact, 4)
            };
        });

    } catch (err) {
        alert("Could not update contact info. Please try again.");
    } finally {
        setIsUpdating(false);
    }
  };

  const handleSaveToSheet = async () => {
    if (!webhookUrl) {
      alert("Please connect your Google Sheet in Settings first.");
      setShowSettings(true); // Open settings to prompt user to connect
      return;
    }

    setStatus('saving');
    
    try {
        // IMPORTANT: We use text/plain to avoid CORS preflight issues with Google Apps Script
        await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(data)
        });
        
        // Add a small artificial delay for UX since no-cors doesn't wait for true confirmation
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus('success');
    } catch (e) {
        console.error("Webhook error", e);
        setError("Could not send data to Google Sheet. Check your URL.");
        setStatus('review');
    }
  };

  const removeInputImage = (index: number) => {
    setInputImages(prev => prev.filter((_, i) => i !== index));
  };

  const resetAll = () => {
    setStatus('idle');
    setInputImages([]);
    setInputAudio(null);
    const today = new Date().toISOString().split('T')[0];
    setData({
        ...INITIAL_CONTACT_DATA,
        lastContact: today,
        contactFrequency: 'Every 4 months',
        nextContactDue: getFutureDate(today, 4)
    });
    setIsUpdating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetAll}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">T</div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">TipsyContacts</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm text-slate-500 hidden sm:block">AI Contact Digitizer</div>
             <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                title="Settings"
             >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Connection Settings</h2>
                    <button onClick={handleCloseSettings} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 </div>
                 
                 {showSavedConfirmation && (
                   <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center gap-2">
                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                     <span>Settings Saved!</span>
                   </div>
                 )}

                 <div className="space-y-6 mb-8">
                    {/* Connection Status Indicator */}
                    <div className={`p-4 rounded-lg border ${webhookUrl ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center gap-3">
                             <div className={`w-3 h-3 rounded-full ${webhookUrl ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
                             <p className={`font-medium ${webhookUrl ? 'text-green-800' : 'text-orange-800'}`}>
                                 {webhookUrl ? 'Connected to Google Sheet' : 'Not Connected'}
                             </p>
                        </div>
                        {!webhookUrl && <p className="text-xs text-orange-700 mt-1 ml-6">You must complete the setup below to save data.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">Google Apps Script Web App URL</label>
                        <input 
                            type="text" 
                            value={tempWebhookUrl}
                            onChange={(e) => setTempWebhookUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..." 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-800 mb-2">Google Sheet View Link (Optional)</label>
                        <input 
                            type="text" 
                            value={tempSheetViewUrl}
                            onChange={(e) => setTempSheetViewUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..." 
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {/* Instructions Accordion */}
                    <div className="border rounded-lg border-slate-200 overflow-hidden">
                        <button 
                            onClick={() => setShowScriptHelp(!showScriptHelp)}
                            className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left"
                        >
                            <span className="font-medium text-slate-700 text-sm">How to get the Web App URL?</span>
                            <svg className={`w-5 h-5 text-slate-500 transform transition-transform ${showScriptHelp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {showScriptHelp && (
                            <div className="p-4 bg-white space-y-4">
                                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600 marker:font-bold">
                                    <li>Open your Google Sheet. <span className="text-indigo-600 font-medium">(It's okay if it is empty!)</span></li>
                                    <li>Go to <span className="font-semibold">Extensions &gt; Apps Script</span>.</li>
                                    <li>Delete any code there and paste the code below.</li>
                                    <li className="bg-yellow-50 p-1 rounded">Click <span className="font-semibold">Deploy &gt; New deployment</span>. <span className="text-xs text-yellow-700">(Essential: Do not just Save!)</span></li>
                                    <li>Click the gear icon next to "Select type" and choose <span className="font-semibold">Web app (Web 应用)</span>.</li>
                                    <li>Set <strong>Execute as:</strong> <span className="text-indigo-600 font-medium">Me</span>.</li>
                                    <li>Set <strong>Who has access:</strong> <span className="text-indigo-600 font-medium">Anyone (任何人)</span> (Important!).</li>
                                    <li>Click <strong>Deploy</strong>, copy the <span className="font-mono bg-slate-100 px-1">Web App URL</span>, and paste it above.</li>
                                </ol>
                                
                                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg mb-2">
                                    <strong>Note:</strong> The script will automatically fix ugly headers (like "firstName") to readable ones (like "First Name").
                                </div>

                                <div className="relative group">
                                    <textarea 
                                        readOnly 
                                        className="w-full h-48 p-3 bg-slate-800 text-slate-100 font-mono text-xs rounded-lg outline-none resize-none"
                                        value={GOOGLE_SCRIPT_CODE}
                                    />
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(GOOGLE_SCRIPT_CODE)}
                                        className="absolute top-2 right-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded backdrop-blur-sm transition-colors"
                                    >
                                        Copy Code
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                    <button 
                        onClick={handleSaveSettings}
                        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm"
                    >
                        Save Connection
                    </button>
                    <button 
                        onClick={handleCloseSettings}
                        className="px-6 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm"
                    >
                        Close
                    </button>
                 </div>
             </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {status === 'idle' && (
          <div className="animate-fade-in flex flex-col items-center justify-center min-h-[50vh]">
            <div className="text-center mb-10 max-w-3xl">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Elite Networking. <br/>
                <span className="text-indigo-600">Zero Amnesia.</span>
              </h2>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6 text-left">
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Stop stuffing business cards into your pockets or fumbling with screenshots after a few drinks. 
                    Just snap a photo of their card or LinkedIn profile, record a quick voice memo about why they're 
                    awesome (<span className="text-indigo-500 font-medium italic">slurring is okay!</span>), and let our AI magically extract 
                    the details and sync them directly to your Google Sheet.
                  </p>
                  <p className="mt-4 font-semibold text-slate-800">
                    Focus on the mingling, forget the morning-after data entry.
                  </p>
              </div>
            </div>
            
            <div className="w-full max-w-xl space-y-6">
              {/* Image Input Section */}
              <ImageUpload onImagesSelected={(imgs) => setInputImages(prev => [...prev, ...imgs])} />
              
              {/* Selected Images Gallery */}
              {inputImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3 animate-fade-in">
                    {inputImages.map((img, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden border border-indigo-200 h-24 bg-slate-100 group">
                            <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <button 
                                onClick={() => removeInputImage(idx)}
                                className="absolute top-1 right-1 bg-white text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    ))}
                    <div className="col-span-3 text-right text-xs text-slate-500">{inputImages.length} image(s) selected</div>
                </div>
              )}

              {/* Voice Input Section */}
              <div className="flex flex-col items-center justify-center pt-2">
                 <p className="text-sm text-slate-400 mb-3 uppercase tracking-wider font-semibold">Optionally Add Context</p>
                 <VoiceRecorder 
                    onAudioReady={setInputAudio} 
                    onClear={() => setInputAudio(null)} 
                    hasAudio={!!inputAudio}
                 />
              </div>

              {/* Action Button */}
              <div className="pt-4 flex justify-center">
                 <button
                    onClick={handleAnalyze}
                    disabled={inputImages.length === 0 && !inputAudio}
                    className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg transform transition-all 
                        ${(inputImages.length === 0 && !inputAudio) 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95'}`}
                 >
                    Analyze Connection
                 </button>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-center text-sm">
                    {error}
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'analyzing' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <Spinner />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-800">Analyzing Content...</h3>
              <p className="text-slate-500 mt-2">Extracting info from {inputImages.length} image(s) and {inputAudio ? 'audio' : 'no audio'}.</p>
            </div>
          </div>
        )}

        {status === 'review' && (
          <ContactEditor 
            data={data} 
            onChange={setData}
            onConfirm={handleSaveToSheet}
            onReset={resetAll}
            onSmartUpdate={handleSmartUpdateWrapper}
            isUpdating={isUpdating}
          />
        )}
        
        {status === 'saving' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <Spinner />
            <div className="text-center">
              <h3 className="text-xl font-semibold text-slate-800">Saving...</h3>
              <p className="text-slate-500 mt-2">Recording data to your Google Sheet.</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Saved to Google Sheet!</h2>
            <p className="text-slate-600 mb-8 max-w-md text-center">
               Your connection has been automatically recorded.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              {sheetViewUrl && (
                  <a 
                    href={sheetViewUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-md transition-colors"
                  >
                    <span>Open Google Sheet</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
              )}
              <button 
                onClick={resetAll}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 shadow-sm"
              >
                Scan Another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;