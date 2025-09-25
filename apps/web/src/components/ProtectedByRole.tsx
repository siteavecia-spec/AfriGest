import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import type { RootState } from '../store'

type Role = 'super_admin' | 'pdg' | 'dg' | 'employee'

export default function ProtectedByRole({ allow }: { allow: Role[] }) {
  const token = useSelector((s: RootState) => s.auth.accessToken)
  const role = useSelector((s: RootState) => s.auth.role) as Role | null
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('afrigest_token') : null

  if (!token && !localToken) return <Navigate to="/login" replace />
  if (!role) return <Navigate to="/login" replace />
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
