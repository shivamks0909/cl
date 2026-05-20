'use server'

import { cookies } from 'next/headers'
import { getUnifiedDb } from '@/lib/unified-db'
import bcrypt from 'bcryptjs'
import { unstable_noStore as noStore } from 'next/cache'
import * as crypto from 'crypto'
import { generateStrongPassword, validatePassword } from './password-utils'

// Rate limiting for credentials change (in-memory)
const credentialChangeAttempts = new Map<string, { attempts: number; lastAttempt: number }>()
const MAX_CHANGE_ATTEMPTS = 3
const CHANGE_LOCKOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get current admin credentials from database
 */
export async function getAdminCredentials(): Promise<{ username: string } | null> {
  noStore()
  
  try {
    const { database: db } = await getUnifiedDb()

    // Try 'admins' table first (local SQLite), then 'users'
    let admin: any = null
    for (const table of ['admins', 'users']) {
      try {
        const { data, error } = await db.from(table).select('id, email').limit(1).maybeSingle()
        if (error) continue
        if (data) {
          admin = data
          break
        }
      } catch {
        continue
      }
    }

    if (!admin) return null

    return {
      username: admin.email
    }
  } catch (err) {
    console.error('[AdminCredentials] Error fetching admin:', err)
    return null
  }
}

/**
 * Regenerate admin credentials (username and/or password)
 */
export async function regenerateAdminCredentials(
  newUsername: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string; newPassword?: string }> {
  noStore()

  // Validation
  if (!newUsername || !newUsername.trim()) {
    return { success: false, error: 'Username is required' }
  }

  if (!newPassword) {
    return { success: false, error: 'Password is required' }
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match' }
  }

  const passwordValidation = validatePassword(newPassword)
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error }
  }

  // Rate limiting check
  const now = Date.now()
  const key = 'admin_credential_change'
  const attempt = credentialChangeAttempts.get(key)
  
  if (attempt && (now - attempt.lastAttempt) < CHANGE_LOCKOUT_MS && attempt.attempts >= MAX_CHANGE_ATTEMPTS) {
    const remainingMinutes = Math.ceil((CHANGE_LOCKOUT_MS - (now - attempt.lastAttempt)) / 60000)
    return { success: false, error: `Too many attempts. Please try again in ${remainingMinutes} minutes.` }
  }

  function recordFailure() {
    const a = credentialChangeAttempts.get(key)
    credentialChangeAttempts.set(key, { 
      attempts: (a?.attempts ?? 0) + 1, 
      lastAttempt: now 
    })
  }

  try {
    const { database: db } = await getUnifiedDb()
    
    // Find the admin user (single admin only)
    let adminUser: any = null
    let adminTable = 'admins'
    
    for (const table of ['admins', 'users']) {
      try {
        const { data } = await db.from(table).select('id, email').limit(1).maybeSingle()
        if (data) {
          adminUser = data
          adminTable = table
          break
        }
      } catch {
        continue
      }
    }

    if (!adminUser) {
      recordFailure()
      return { success: false, error: 'Admin account not found' }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    const trimmedUsername = newUsername.trim().toLowerCase()
    const updatedAt = new Date().toISOString()

    // Update admin credentials
    const updateData: Record<string, any> = {
      password_hash: hashedPassword,
      updated_at: updatedAt
    }

    // Also update email field if it exists
    if (adminTable === 'users') {
      updateData.email = trimmedUsername
    }

    // For admins table, check if email field exists or use name field
    if (adminTable === 'admins') {
      // Check table structure to determine username field
      const { database: dbCheck } = await getUnifiedDb()
      try {
        // Try to update with email field
        await db.from(adminTable).update({ 
          ...updateData,
          email: trimmedUsername 
        }).eq('id', adminUser.id)
      } catch {
        // If email field doesn't exist, try name field
        await db.from(adminTable).update({
          ...updateData,
          name: trimmedUsername
        }).eq('id', adminUser.id)
      }
    } else {
      await db.from(adminTable).update(updateData).eq('id', adminUser.id)
    }

    // Clear rate limit on success
    credentialChangeAttempts.delete(key)

    // Invalidate all sessions immediately
    const cookieStore = await cookies()
    cookieStore.delete({
      name: 'admin_session',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })

    console.log('[AdminCredentials] Admin credentials updated successfully')
    return { success: true }

  } catch (err: any) {
    console.error('[AdminCredentials] Error updating credentials:', err)
    recordFailure()
    return { success: false, error: 'Failed to update credentials. Please try again.' }
  }
}

/**
 * Force logout - clear session and require re-login
 */
export async function forceAdminLogout(): Promise<{ success: boolean }> {
  const cookieStore = await cookies()
  cookieStore.delete({
    name: 'admin_session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })
  return { success: true }
}
