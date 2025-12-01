export enum AnalysisMode {
  TEXT = 'TEXT',
  INSTAGRAM = 'INSTAGRAM',
  DASHBOARD = 'DASHBOARD',
  SETTINGS = 'SETTINGS'
}

export interface SentimentScores {
  neutral: number;
  positive: number;
  negative: number;
  compound: number;
}

export interface TextAnalysisResult {
  scores: SentimentScores;
  explanation: string;
}

export interface InstagramAnalysisResult {
  emotionalCategory: string[];
  explanation: string;
  averageSentimentScore: number;
  inferredContentSummary?: string;
  sources?: string[];
  caption?: string;
  sampleComments?: string[];
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

export interface HistoryItem {
  id: string;
  date: number; // timestamp
  type: 'TEXT' | 'INSTAGRAM';
  preview: string;
  result: TextAnalysisResult | InstagramAnalysisResult;
}

export interface InstagramSession {
  username: string;
  sessionId: string;
  avatarUrl?: string;
}