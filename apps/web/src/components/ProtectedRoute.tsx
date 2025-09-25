import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import type { RootState } from '../store'

export default function ProtectedRoute() {
  const token = useSelector((s: RootState) => s.auth.accessToken)
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('afrigest_token') : null
  if (!token && !localToken) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
