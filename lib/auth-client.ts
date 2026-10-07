'use client'

import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

/**
 * Client-side session, backed by Clerk.
 *
 * The client half of the auth seam (the server half is auth.ts). It exposes
 * the same `useSession()` / `signOut()` the app used from `next-auth/react`,
 * with the same shapes, so components do not know which provider is behind
 * them. Going back to Auth.js is a one-line change here:
 *
 *   export { useSession, signOut } from 'next-auth/react'
 *
 * Clerk answers "is someone signed in"; everything shown about them (name,
 * photo, role) comes from the store's own user record via /api/users/profile,
 * so `session.user.id` is the store user id, exactly as before.
 */

export interface SessionUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
}

export interface Session {
  user: SessionUser
}

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface Profile {
  id: string
  name: string | null
  email: string | null
  imageUrl: string | null
  role: string
}

const profileKey = (clerkId: string | null | undefined) => ['session-user', clerkId ?? null]

// The Clerk instance of whichever component last rendered `useSession()`, so
// `signOut()` can stay a plain function like the next-auth one it replaces.
let activeClerk: ReturnType<typeof useClerk> | null = null

export function useSession(): {
  data: Session | null
  status: SessionStatus
  update: (patch?: { name?: string | null; image?: string | null }) => Promise<void>
} {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user: clerkUser } = useUser()
  const clerk = useClerk()
  activeClerk = clerk
  const queryClient = useQueryClient()

  // One request shared by every component on the page; it is also what links
  // a brand-new Clerk user to a store account on their first page load.
  const profile = useQuery<Profile>({
    queryKey: profileKey(userId),
    queryFn: async () => {
      const response = await fetch('/api/users/profile', { credentials: 'same-origin' })
      if (!response.ok) throw new Error(`Profile request failed (${response.status})`)
      return response.json()
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  // Mirrors next-auth's `update()`: fold a profile edit into the live session
  // so the header follows a new name or photo without a reload.
  const update = useCallback(
    async (patch?: { name?: string | null; image?: string | null }) => {
      if (!patch) {
        await queryClient.invalidateQueries({ queryKey: profileKey(userId) })
        return
      }
      queryClient.setQueryData<Profile>(profileKey(userId), (current) =>
        current
          ? {
              ...current,
              name: patch.name !== undefined ? patch.name : current.name,
              imageUrl: patch.image !== undefined ? patch.image : current.imageUrl,
            }
          : current
      )
    },
    [queryClient, userId]
  )

  if (!isLoaded) return { data: null, status: 'loading', update }
  if (!isSignedIn) return { data: null, status: 'unauthenticated', update }
  // Hold "loading" until the role is known — admin screens decide on it.
  if (profile.isPending) return { data: null, status: 'loading', update }

  if (profile.data) {
    const { id, name, email, imageUrl, role } = profile.data
    return {
      data: { user: { id, name, email, image: imageUrl, role } },
      status: 'authenticated',
      update,
    }
  }

  // The profile request failed but Clerk is certain someone is signed in.
  // Reporting "signed out" would bounce them between /sign-in and the page, so
  // show what Clerk knows, with no elevated role.
  return {
    data: {
      user: {
        id: '',
        name: clerkUser?.fullName ?? null,
        email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
        image: clerkUser?.hasImage ? clerkUser.imageUrl : null,
        role: 'USER',
      },
    },
    status: 'authenticated',
    update,
  }
}

/**
 * Sign out, then load `callbackUrl` as a full page so every cached per-user
 * query (cart, wishlist, profile) is dropped with the old document.
 */
export async function signOut(options?: { callbackUrl?: string }): Promise<void> {
  const target = options?.callbackUrl ?? '/'
  if (!activeClerk) {
    window.location.assign(target)
    return
  }
  await activeClerk.signOut(() => {
    window.location.assign(target)
  })
}

/**
 * Open Clerk's account panel: change password, connected Google/GitHub
 * accounts, active devices, delete account. No Auth.js equivalent.
 */
export function openAccountSecurity(): void {
  activeClerk?.openUserProfile()
}
