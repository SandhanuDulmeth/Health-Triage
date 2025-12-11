import React, { useRef, useState, useEffect } from 'react';
import { Camera, Mic, Square, Video, X, Image as ImageIcon } from 'lucide-react';
import { blobToBase64 } from '../utils/mediaUtils';
import { MediaAttachment } from '../types';

interface RecorderProps {
  onCapture: (attachment: MediaAttachment) => void;
  disabled: boolean;
}

const Recorder: React.FC<RecorderProps> = ({ onCapture, disabled }) => {
  const [mode, setMode] = useState<'audio' | 'video' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream && mode === 'video') {
      videoRef.current.srcObject = stream;
    }
  }, [stream, mode]);

  const cleanupStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setMode(null);
    setIsRecording(false);
  };

  const startStream = async (type: 'audio' | 'video') => {
    try {
      const constraints = type === 'video' 
        ? { video: { facingMode: 'user' }, audio: true }
        : { audio: true };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setMode(type);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      alert("We need permission to use your camera/microphone to see or hear you.");
    }
  };

  const startRecording = () => {
    if (!stream) return;
    
    chunksRef.current = [];
    // Use supported MIME types
    const mimeType = mode === 'video' ? 'video/webm' : 'audio/webm';
    const options = MediaRecorder.isTypeSupported(mimeType) ? { mimeType } : undefined;

    const recorder = new MediaRecorder(stream, options);
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const base64 = await blobToBase64(blob);
        
        onCapture({
          id: Date.now().toString(),
          type: mode as 'audio' | 'video',
          mimeType: blob.type,
          data: base64,
          previewUrl: URL.createObjectURL(blob)
        });
        
        cleanupStream();
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (mode) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in">
        <div className="relative w-full max-w-lg bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-700 ring-1 ring-white/10">
          {mode === 'video' && (
             <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted 
               className="w-full h-[50vh] object-cover bg-black"
             />
          )}
          {mode === 'audio' && (
            <div className="w-full h-[40vh] flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
               <div className="relative">
                 <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full animate-pulse-slow"></div>
                 <Mic className="relative w-24 h-24 text-blue-400" />
               </div>
               <p className="mt-8 text-xl font-medium text-blue-200">Listening...</p>
            </div>
          )}

          <div className="p-8 flex flex-col items-center gap-6 bg-slate-900 border-t border-slate-800">
             <div className="text-slate-300 font-medium tracking-wide">
               {isRecording ? <span className="text-red-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Recording</span> : "Ready to start"}
             </div>
             
             <div className="flex gap-8 items-center">
                <button 
                  onClick={cleanupStream}
                  className="p-4 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all transform hover:scale-105 active:scale-95"
                  title="Cancel"
                >
                  <X className="w-6 h-6" />
                </button>

                {!isRecording ? (
                  <button 
                    onClick={startRecording}
                    className="p-1 rounded-full border-4 border-slate-700 hover:border-slate-600 transition-colors"
                  >
                    <div className="w-16 h-16 bg-red-500 rounded-full hover:bg-red-600 transition-all transform active:scale-90 shadow-[0_0_20px_rgba(239,68,68,0.4)]"></div>
                  </button>
                ) : (
                   <button 
                    onClick={stopRecording}
                    className="p-1 rounded-full border-4 border-slate-700"
                  >
                    <div className="w-16 h-16 bg-white rounded-xl transform scale-50 hover:scale-55 transition-all shadow-[0_0_20px_rgba(255,255,255,0.4)] flex items-center justify-center">
                       <Square className="w-8 h-8 text-black fill-black" />
                    </div>
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Modern Card-based buttons
  const ButtonCard = ({ 
    icon: Icon, 
    label, 
    onClick, 
    colorClass, 
    subLabel,
    disabled 
  }: { 
    icon: any, 
    label: string, 
    onClick?: () => void, 
    colorClass: string,
    subLabel: string,
    disabled: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex-1 flex flex-col items-center justify-center p-4 h-32 rounded-2xl border transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:-translate-y-1 hover:shadow-lg cursor-pointer'} ${colorClass}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
      <div className="mb-3 p-3 rounded-full bg-white/60 dark:bg-black/20 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6" />
      </div>
      <span className="font-semibold text-sm tracking-wide">{label}</span>
      <span className="text-[10px] opacity-70 mt-1 font-medium uppercase tracking-wider">{subLabel}</span>
    </button>
  );

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      <ButtonCard 
        icon={Mic} 
        label="Voice" 
        subLabel="Speak"
        onClick={() => startStream('audio')}
        disabled={disabled}
        colorClass="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300"
      />
      
      <ButtonCard 
        icon={Video} 
        label="Video" 
        subLabel="Record"
        onClick={() => startStream('video')}
        disabled={disabled}
        colorClass="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300"
      />

      <label className={`group relative flex-1 flex flex-col items-center justify-center p-4 h-32 rounded-2xl border transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : 'hover:-translate-y-1 hover:shadow-lg cursor-pointer'} bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
        <div className="mb-3 p-3 rounded-full bg-white/60 dark:bg-black/20 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
          <ImageIcon className="w-6 h-6" />
        </div>
        <span className="font-semibold text-sm tracking-wide">Photo</span>
        <span className="text-[10px] opacity-70 mt-1 font-medium uppercase tracking-wider">Upload</span>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              const base64 = await blobToBase64(file);
              onCapture({
                id: Date.now().toString(),
                type: 'image',
                mimeType: file.type,
                data: base64,
                previewUrl: URL.createObjectURL(file)
              });
            }
          }}
        />
      </label>
    </div>
  );
};

export default Recorder;