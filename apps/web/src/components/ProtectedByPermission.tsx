import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import type { RootState } from '../store'
import { can, type ModuleKey, type Action, type Role } from '../utils/acl'

export default function ProtectedByPermission({ moduleKey, action }: { moduleKey: ModuleKey; action: Action }) {
  const token = useSelector((s: RootState) => s.auth.accessToken)
  const role = useSelector((s: RootState) => s.auth.role) as Role | null
  const localToken = typeof window !== 'undefined' ? localStorage.getItem('afrigest_token') : null

  if (!token && !localToken) return <Navigate to="/login" replace />
  if (!role) return <Navigate to="/login" replace />
  if (!can(role, moduleKey, action)) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
