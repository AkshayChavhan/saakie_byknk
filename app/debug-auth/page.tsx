'use client'

import { useUser } from '@clerk/nextjs'
import { Header } from '@/components/layout/header'
import Link from 'next/link'

export default function DebugAuthPage() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  const userRole = (user?.publicMetadata as any)?.role
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Authentication Debug Page</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Information</h2>
          <div className="space-y-2">
            <p><strong>Is Signed In:</strong> {user ? 'Yes' : 'No'}</p>
            <p><strong>User ID:</strong> {user?.id || 'Not available'}</p>
            <p><strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress || 'Not available'}</p>
            <p><strong>First Name:</strong> {user?.firstName || 'Not available'}</p>
            <p><strong>Last Name:</strong> {user?.lastName || 'Not available'}</p>
            <p><strong>Role:</strong> {userRole || 'Not set'}</p>
            <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Public Metadata</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(user?.publicMetadata, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Admin Link Test</h2>
          <div className="space-y-4">
            <p>
              <strong>Admin Link Visibility:</strong> {isAdmin ? 'Should be visible' : 'Should be hidden'}
            </p>
            <div className="space-x-4">
              <Link 
                href="/admin" 
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Test Admin Link
              </Link>
              <Link 
                href="/" 
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">Troubleshooting Steps</h2>
          <ul className="space-y-2 text-yellow-700">
            <li>1. If role is not 'ADMIN' or 'SUPER_ADMIN', you need to set the role in Clerk dashboard</li>
            <li>2. Go to Clerk dashboard → Users → Select user → Public metadata</li>
            <li>3. Add: {JSON.stringify({role: 'ADMIN'}, null, 2)}</li>
            <li>4. Sign out and sign back in to refresh the session</li>
            <li>5. The middleware protects /admin routes and redirects non-admin users to home</li>
          </ul>
        </div>
      </div>
    </div>
  )
}