import type { Account } from '@shared/types'

// Step 2: Microsoft login via msmc, refresh token stored with Electron safeStorage.
export async function currentAccount(): Promise<Account | null> {
  return null
}

export async function login(): Promise<Account> {
  throw new Error('Microsoft login arrives in the next build step.')
}

export async function logout(): Promise<void> {}
