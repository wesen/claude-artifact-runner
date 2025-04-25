import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch } from './index';

export interface UiState {
  showDebugInfo: boolean;
  promptCopied: boolean;
  topicInfoCopied: boolean;
  transcriptViewCopied: boolean;
  blogPromptCopied: boolean;
  subtopicsPromptCopied: boolean;
  showPromptModal: boolean;
  promptModalContent: string;
  promptModalTitle: string;
}

const initialState: UiState = {
  showDebugInfo: false,
  promptCopied: false,
  topicInfoCopied: false,
  transcriptViewCopied: false,
  blogPromptCopied: false,
  subtopicsPromptCopied: false,
  showPromptModal: false,
  promptModalContent: '',
  promptModalTitle: '',
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDebugInfo: (state) => {
      state.showDebugInfo = !state.showDebugInfo;
    },
    setCopyStatus: (state, action: PayloadAction<{field: keyof Pick<UiState, 'promptCopied' | 'topicInfoCopied' | 'transcriptViewCopied' | 'blogPromptCopied' | 'subtopicsPromptCopied'>; status: boolean}>) => {
      const { field, status } = action.payload;
      // Only update if the field exists in our state
      if (field in state) {
        state[field as keyof Pick<UiState, 'promptCopied' | 'topicInfoCopied' | 'transcriptViewCopied' | 'blogPromptCopied' | 'subtopicsPromptCopied'>] = status;
      }
    },
    resetAllCopyStatus: (state) => {
      state.promptCopied = false;
      state.topicInfoCopied = false;
      state.transcriptViewCopied = false;
      state.blogPromptCopied = false;
      state.subtopicsPromptCopied = false;
    },
    setPromptModal: (state, action: PayloadAction<{show: boolean; content?: string; title?: string}>) => {
      const { show, content, title } = action.payload;
      state.showPromptModal = show;
      if (content !== undefined) state.promptModalContent = content;
      if (title !== undefined) state.promptModalTitle = title;
    },
  },
});

// Function to handle copy with timeout to reset status
export const copyWithFeedback = (text: string, fieldName: keyof Pick<UiState, 'promptCopied' | 'topicInfoCopied' | 'transcriptViewCopied' | 'blogPromptCopied' | 'subtopicsPromptCopied'>) => (dispatch: AppDispatch) => {
  navigator.clipboard.writeText(text)
    .then(() => {
      dispatch(setCopyStatus({ field: fieldName, status: true }));
      // Reset after 2 seconds
      setTimeout(() => {
        dispatch(setCopyStatus({ field: fieldName, status: false }));
      }, 2000);
    })
    .catch((err) => {
      console.error('Failed to copy: ', err);
      alert('Failed to copy text.');
    });
};

export const { toggleDebugInfo, setCopyStatus, resetAllCopyStatus, setPromptModal } = uiSlice.actions;

export default uiSlice.reducer; 