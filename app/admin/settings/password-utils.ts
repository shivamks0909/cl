/**
 * Generate a cryptographically secure strong password
 * Requirements: uppercase, lowercase, number, special char, min 10 chars
 */
export function generateStrongPassword(length: number = 14): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // Removed I, O to avoid confusion
  const lowercase = 'abcdefghjkmnpqrstuvwxyz'   // Removed i, l, o
  const numbers = '23456789'                      // Removed 0, 1
  const special = '!@#$%^&*?+-='

  // Ensure at least one of each required character type
  const getRandomChar = (charset: string): string => {
    const array = new Uint8Array(1)
    crypto.getRandomValues(array)
    return charset[array[0] % charset.length]
  }

  let password = ''
  password += getRandomChar(uppercase)
  password += getRandomChar(lowercase)
  password += getRandomChar(numbers)
  password += getRandomChar(special)

  // Fill remaining length with random chars from all sets
  const allChars = uppercase + lowercase + numbers + special
  for (let i = password.length; i < length; i++) {
    const array = new Uint8Array(1)
    crypto.getRandomValues(array)
    password += allChars[array[0] % allChars.length]
  }

  // Shuffle the password characters
  const passwordArray = password.split('')
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const array = new Uint8Array(1)
    crypto.getRandomValues(array)
    const j = array[0] % (i + 1)
    ;[passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]]
  }

  return passwordArray.join('')
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }

  if (password.length < 10) {
    return { valid: false, error: 'Password must be at least 10 characters' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' }
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }

  if (!/[!@#$%^&*?+\-=]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character (!@#$%^&*?+-=)' }
  }

  return { valid: true }
}
