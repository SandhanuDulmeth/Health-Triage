export interface MediaAttachment {
  id: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  data: string; // Base64 string
  previewUrl?: string; // For displaying to user
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text?: string;
  attachments?: MediaAttachment[];
  painLevel?: number | null;
  groundingChunks?: any[];
  timestamp: number;
}

export interface AnalysisResult {
  text: string;
  groundingChunks?: any[];
}

export enum AppState {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}