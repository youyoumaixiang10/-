export enum Screen {
  WELCOME = 'WELCOME',
  SELECTION = 'SELECTION',
  CONSULTATION = 'CONSULTATION',
}

export interface Master {
  id: string;
  name: string;
  title: string;
  description: string;
  systemInstruction: string; // The persona prompt
  avatarInitials: string;
  color: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  masterId?: string; // If null, it's a user message applicable to all context, or a system message
  timestamp: number;
}

export interface ConsultationSession {
  selectedMasterIds: string[];
  messages: Message[];
  isLoading: boolean;
}

export interface SavedSession {
  id: string;
  timestamp: number;
  problem: string;
  selectedMasterIds: string[];
  messages: Message[];
}