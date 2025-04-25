import { configureStore } from '@reduxjs/toolkit';
import transcriptReducer from './transcriptSlice';
import topicsReducer from './topicsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    transcript: transcriptReducer,
    topics: topicsReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 