import React, { useRef, useState, useEffect } from 'react';
import { Camera, Mic, Square, Video, X } from 'lucide-react';
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
    
    // Check if the browser supports the mimeType, fallback if needed
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
          mimeType: blob.type, // Use actual blob type
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
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
          {mode === 'video' && (
             <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted 
               className="w-full h-64 md:h-96 object-cover bg-black"
             />
          )}
          {mode === 'audio' && (
            <div className="w-full h-64 flex flex-col items-center justify-center bg-gray-800 text-white">
               <Mic className="w-24 h-24 text-blue-400 animate-pulse" />
               <p className="mt-4 text-xl">Listening...</p>
            </div>
          )}

          <div className="p-6 flex flex-col items-center gap-4 bg-gray-900 border-t border-gray-800">
             <div className="text-white font-medium text-lg">
               {isRecording ? "Recording in progress..." : "Ready to record"}
             </div>
             
             <div className="flex gap-6 items-center">
                <button 
                  onClick={cleanupStream}
                  className="p-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition"
                  title="Cancel"
                >
                  <X className="w-6 h-6" />
                </button>

                {!isRecording ? (
                  <button 
                    onClick={startRecording}
                    className="p-6 rounded-full bg-red-600 text-white hover:bg-red-700 transition shadow-lg scale-110"
                    title="Start Recording"
                  >
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </button>
                ) : (
                   <button 
                    onClick={stopRecording}
                    className="p-6 rounded-full bg-white text-red-600 hover:bg-gray-200 transition shadow-lg scale-110"
                    title="Stop Recording"
                  >
                    <Square className="w-5 h-5 fill-current" />
                  </button>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 w-full justify-center">
      <button
        onClick={() => startStream('audio')}
        disabled={disabled}
        className="flex-1 py-4 flex flex-col items-center justify-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-800/60 transition disabled:opacity-50 border-2 border-blue-200 dark:border-blue-800"
      >
        <Mic className="w-8 h-8" />
        <span className="font-semibold">Voice</span>
      </button>
      
      <button
        onClick={() => startStream('video')}
        disabled={disabled}
        className="flex-1 py-4 flex flex-col items-center justify-center gap-2 bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 rounded-xl hover:bg-teal-200 dark:hover:bg-teal-800/60 transition disabled:opacity-50 border-2 border-teal-200 dark:border-teal-800"
      >
        <Video className="w-8 h-8" />
        <span className="font-semibold">Video</span>
      </button>

      <label className={`flex-1 py-4 flex flex-col items-center justify-center gap-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-800/60 transition border-2 border-indigo-200 dark:border-indigo-800 cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <Camera className="w-8 h-8" />
        <span className="font-semibold">Photo</span>
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