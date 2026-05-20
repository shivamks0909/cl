'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Shield, Key, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { regenerateAdminCredentials, getAdminCredentials } from './actions'
import { generateStrongPassword } from './password-utils'

export default function SecuritySettings() {
  const router = useRouter()
  const [currentUsername, setCurrentUsername] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  // Load current admin username
  useEffect(() => {
    async function loadAdmin() {
      try {
        const admin = await getAdminCredentials()
        if (admin) {
          setCurrentUsername(admin.username)
          setNewUsername(admin.username)
        }
      } catch (err) {
        console.error('Failed to load admin:', err)
      } finally {
        setIsLoadingAdmin(false)
      }
    }
    loadAdmin()
  }, [])

  const handleGeneratePassword = useCallback(() => {
    const password = generateStrongPassword(14)
    setGeneratedPassword(password)
    setNewPassword(password)
    setConfirmPassword(password)
    setShowPassword(true)
    setError(null)
    setSuccess('Strong password generated! Copy it and save credentials.')
  }, [])

  const handleCopyPassword = useCallback(() => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword)
      setSuccess('Password copied to clipboard!')
    }
  }, [generatedPassword])

  const validateForm = useCallback((): string | null => {
    if (!newUsername.trim()) {
      return 'Username is required'
    }
    if (!newPassword) {
      return 'Password is required'
    }
    if (newPassword.length < 10) {
      return 'Password must be at least 10 characters'
    }
    if (!/[A-Z]/.test(newPassword)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(newPassword)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(newPassword)) {
      return 'Password must contain at least one number'
    }
    if (!/[!@#$%^&*?+\-=]/.test(newPassword)) {
      return 'Password must contain at least one special character (!@#$%^&*?+-=)'
    }
    if (newPassword !== confirmPassword) {
      return 'Passwords do not match'
    }
    return null
  }, [newUsername, newPassword, confirmPassword])

  const handleSave = useCallback(async () => {
    setError(null)
    setSuccess(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    try {
      const result = await regenerateAdminCredentials(
        newUsername.trim(),
        newPassword,
        confirmPassword
      )

      if (result.success) {
        setSuccess('Credentials updated successfully! You are being logged out...')
        setGeneratedPassword(null)
        
        // Force logout after short delay to show success message
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } else {
        setError(result.error || 'Failed to update credentials')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [newUsername, newPassword, confirmPassword, validateForm])

  if (isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-500">Loading...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Shield className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
          <p className="text-sm text-gray-500">Manage your admin credentials</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">Success</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        {/* Current Username (Readonly) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Username
          </label>
          <input
            type="text"
            value={currentUsername}
            readOnly
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-500 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-500">Your current admin username</p>
        </div>

        {/* New Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Username
          </label>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Enter new username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Password Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center gap-2">
              <span className={newPassword.length >= 10 ? 'text-green-500' : 'text-gray-400'}>
                {newPassword.length >= 10 ? '✓' : '○'}
              </span>
              At least 10 characters
            </li>
            <li className="flex items-center gap-2">
              <span className={/[A-Z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>
                {/[A-Z]/.test(newPassword) ? '✓' : '○'}
              </span>
              One uppercase letter (A-Z)
            </li>
            <li className="flex items-center gap-2">
              <span className={/[a-z]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>
                {/[a-z]/.test(newPassword) ? '✓' : '○'}
              </span>
              One lowercase letter (a-z)
            </li>
            <li className="flex items-center gap-2">
              <span className={/[0-9]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>
                {/[0-9]/.test(newPassword) ? '✓' : '○'}
              </span>
              One number (0-9)
            </li>
            <li className="flex items-center gap-2">
              <span className={/[!@#$%^&*?+\-=]/.test(newPassword) ? 'text-green-500' : 'text-gray-400'}>
                {/[!@#$%^&*?+\-=]/.test(newPassword) ? '✓' : '○'}
              </span>
              One special character (!@#$%^&*?+-=)
            </li>
          </ul>
        </div>

        {/* Generated Password Display */}
        {generatedPassword && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-indigo-800">Generated Password:</p>
              <button
                onClick={handleCopyPassword}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline"
              >
                Copy
              </button>
            </div>
            <code className="block bg-white px-3 py-2 rounded border border-indigo-200 text-sm font-mono break-all">
              {generatedPassword}
            </code>
            <p className="mt-2 text-xs text-indigo-600">
              Save this password somewhere safe! It will only be shown once.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleGeneratePassword}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Key className="h-4 w-4" />
            Generate Strong Password
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Save Credentials
              </>
            )}
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Important:</strong> After saving, you will be automatically logged out and must 
            re-login with your new credentials. Make sure to save your new password before saving.
          </p>
        </div>
      </div>
    </div>
  )
}
