import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type Role = 'super_admin' | 'pdg' | 'dg' | 'employee' | null

interface AuthState {
  accessToken: string | null
  role: Role
}

const initialState: AuthState = {
  accessToken: null,
  role: null
}

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ token: string; role: NonNullable<Role> }>) => {
      state.accessToken = action.payload.token
      state.role = action.payload.role
    },
    logout: (state) => {
      state.accessToken = null
      state.role = null
    }
  }
})

export const { setCredentials, logout } = slice.actions
export default slice.reducer
