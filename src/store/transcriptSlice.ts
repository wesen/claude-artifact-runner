import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TranscriptSegment, parseTranscript } from '../utils/transcriptUtils';

export interface TranscriptState {
  rawTranscript: string;
  parsedTranscript: TranscriptSegment[];
  loading: boolean;
  error: string | null;
}

const initialState: TranscriptState = {
  rawTranscript: '',
  parsedTranscript: [],
  loading: false,
  error: null,
};

export const transcriptSlice = createSlice({
  name: 'transcript',
  initialState,
  reducers: {
    setTranscriptLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setTranscriptData: (state, action: PayloadAction<string>) => {
      state.rawTranscript = action.payload;
      try {
        const isDebug = process.env.NODE_ENV === 'development';
        state.parsedTranscript = parseTranscript(action.payload, isDebug);
        state.loading = false;
        state.error = null;
      } catch (error) {
        state.loading = false;
        state.error = error instanceof Error ? error.message : 'Unknown error parsing transcript';
      }
    },
    setTranscriptError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearTranscript: (state) => {
      state.rawTranscript = '';
      state.parsedTranscript = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const { 
  setTranscriptLoading,
  setTranscriptData,
  setTranscriptError,
  clearTranscript,
} = transcriptSlice.actions;

export default transcriptSlice.reducer; 