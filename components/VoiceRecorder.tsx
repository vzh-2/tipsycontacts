import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
  onAudioReady: (base64Audio: string) => void;
  onClear?: () => void;
  hasAudio: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAudioReady, onClear, hasAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      if (!isPaused) {
        // Start fresh
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64String = reader.result as string;
            onAudioReady(base64String);
          };
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setRecordingTime(0);
      } else {
        // Resume
        mediaRecorderRef.current?.resume();
      }

      setIsRecording(true);
      setIsPaused(false);

      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasAudio) {
    return (
      <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg w-full">
        <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 rounded-full text-indigo-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
        </div>
        <span className="text-sm font-medium text-indigo-900">Voice Note Recorded</span>
        <button 
          onClick={onClear}
          className="ml-auto text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      {!isRecording && !isPaused ? (
        <button
          onClick={startRecording}
          className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-white border border-slate-300 rounded-lg shadow-sm text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
          Record Voice Note
        </button>
      ) : (
        <div className="flex items-center gap-2 w-full bg-red-50 border border-red-200 rounded-lg p-1 pr-1">
            {/* Minimal timer section */}
            <div className="flex items-center gap-2 px-3">
              <div className={`w-2 h-2 bg-red-600 rounded-full ${!isPaused ? 'animate-pulse' : ''}`}></div>
              <span className="text-red-700 font-mono text-xs font-medium w-8">{formatTime(recordingTime)}</span>
            </div>
            
            <div className="flex gap-1 flex-1">
              {isPaused ? (
                  <button onClick={startRecording} className="p-2 bg-red-100 rounded hover:bg-red-200 text-red-700" title="Resume">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </button>
              ) : (
                  <button onClick={pauseRecording} className="p-2 bg-red-100 rounded hover:bg-red-200 text-red-700" title="Pause">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  </button>
              )}
              
              <button onClick={stopRecording} className="flex-1 px-4 py-2 bg-red-600 text-white rounded text-base font-bold uppercase tracking-wide hover:bg-red-700 transition-colors shadow-sm">
                  Done
              </button>
            </div>
        </div>
      )}
    </div>
  );
};