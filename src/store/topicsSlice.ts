import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Topic, TimeRange, parseTimestamp } from '../utils/transcriptUtils.ts';

export interface TopicsState {
  specificTopics: Topic[];
  generalTopics: Topic[];
  selectedTopic: Topic | null;
  selectedTopicRanges: TimeRange[];
  loading: boolean;
  error: string | null;
}

const initialState: TopicsState = {
  specificTopics: [],
  generalTopics: [],
  selectedTopic: null,
  selectedTopicRanges: [],
  loading: false,
  error: null,
};

export const topicsSlice = createSlice({
  name: 'topics',
  initialState,
  reducers: {
    setTopicsLoading: (state) => {
      state.loading = true;
      state.error = null;
    },
    setTopicsData: (state, action: PayloadAction<{ specific_topics: Topic[]; general_topics: Topic[] }>) => {
      state.specificTopics = action.payload.specific_topics;
      state.generalTopics = action.payload.general_topics;
      state.loading = false;
      state.error = null;
      
      // Reset selection when new data is loaded
      state.selectedTopic = null;
      state.selectedTopicRanges = [];
    },
    setTopicsError: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setSelectedTopic: (state, action: PayloadAction<{ topic: Topic; category: string } | null>) => {
      if (action.payload === null) {
        state.selectedTopic = null;
        state.selectedTopicRanges = [];
        return;
      }
      
      const { topic, category } = action.payload;
      
      // If clicking the same topic, deselect it
      if (state.selectedTopic && state.selectedTopic.name === topic.name) {
        state.selectedTopic = null;
        state.selectedTopicRanges = [];
        return;
      }
      
      // Set the selected topic with its category
      state.selectedTopic = { ...topic, category };
      
      // Parse time ranges for the topic
      const ranges: TimeRange[] = [];
      topic.time_ranges.forEach((range: { start: string; end: string }) => {
        const start = parseTimestamp(range.start);
        const end = parseTimestamp(range.end);
        ranges.push({ start, end });
      });
      
      state.selectedTopicRanges = ranges;
    },
    clearTopics: (state) => {
      state.specificTopics = [];
      state.generalTopics = [];
      state.selectedTopic = null;
      state.selectedTopicRanges = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const { 
  setTopicsLoading,
  setTopicsData,
  setTopicsError,
  setSelectedTopic,
  clearTopics,
} = topicsSlice.actions;

export default topicsSlice.reducer; 