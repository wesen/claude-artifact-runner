import { RootState } from './index.ts';
import { TranscriptSegment, Topic, TimeRange } from '../utils/transcriptUtils.ts';
import { createSelector } from '@reduxjs/toolkit';

// Transcript selectors
export const selectRawTranscript = (state: RootState): string => state.transcript.rawTranscript;
export const selectParsedTranscript = (state: RootState): TranscriptSegment[] => state.transcript.parsedTranscript;
export const selectTranscriptLoading = (state: RootState): boolean => state.transcript.loading;
export const selectTranscriptError = (state: RootState): string | null => state.transcript.error;

// Topics selectors
export const selectSpecificTopics = (state: RootState): Topic[] => state.topics.specificTopics;
export const selectGeneralTopics = (state: RootState): Topic[] => state.topics.generalTopics;
export const selectSelectedTopic = (state: RootState): Topic | null => state.topics.selectedTopic;
export const selectSelectedTopicRanges = (state: RootState): TimeRange[] => state.topics.selectedTopicRanges;
export const selectTopicsLoading = (state: RootState): boolean => state.topics.loading;
export const selectTopicsError = (state: RootState): string | null => state.topics.error;

// UI selectors
export const selectShowDebugInfo = (state: RootState): boolean => state.ui.showDebugInfo;
export const selectPromptCopied = (state: RootState): boolean => state.ui.promptCopied;
export const selectTopicInfoCopied = (state: RootState): boolean => state.ui.topicInfoCopied;
export const selectTranscriptViewCopied = (state: RootState): boolean => state.ui.transcriptViewCopied;
export const selectBlogPromptCopied = (state: RootState): boolean => state.ui.blogPromptCopied;
export const selectSubtopicsPromptCopied = (state: RootState): boolean => state.ui.subtopicsPromptCopied;
export const selectShowPromptModal = (state: RootState): boolean => state.ui.showPromptModal;
export const selectPromptModalContent = (state: RootState): string => state.ui.promptModalContent;
export const selectPromptModalTitle = (state: RootState): string => state.ui.promptModalTitle;

// Combined selectors
export const selectAllTopics = createSelector(
  [selectSpecificTopics, selectGeneralTopics],
  (specificTopics, generalTopics) => ({
    specific_topics: specificTopics,
    general_topics: generalTopics
  })
);

// Selector for UI loading state
export const selectIsLoading = createSelector(
  [selectTranscriptLoading, selectTopicsLoading],
  (transcriptLoading, topicsLoading) => transcriptLoading || topicsLoading
); 