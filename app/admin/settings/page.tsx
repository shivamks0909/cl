export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import SecuritySettings from './SecuritySettings'
import { headers } from 'next/headers'

export default async function AdminSettingsPage() {
  // Check admin session
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie') || ''
  
  // Simple auth check based on session cookie
  const hasSession = cookieHeader.includes('admin_session=')
  
  if (!hasSession) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your admin account and preferences</p>
      </div>
      
      <SecuritySettings />
    </div>
  )
}
