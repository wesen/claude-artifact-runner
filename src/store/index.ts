import { configureStore } from '@reduxjs/toolkit';
import transcriptReducer from './transcriptSlice.ts';
import topicsReducer from './topicsSlice.ts';
import uiReducer from './uiSlice.ts';

export const store = configureStore({
  reducer: {
    transcript: transcriptReducer,
    topics: topicsReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 