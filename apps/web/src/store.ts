import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/auth/slice'
import messagingReducer from './features/messaging/slice'
import { messagingMiddleware } from './features/messaging/wsMiddleware'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    messaging: messagingReducer
  },
  middleware: (getDefault) => getDefault().concat(messagingMiddleware)
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
