'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser, useAuth } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import {
  Users,
  ShoppingBag,
  Package,
  TrendingUp,
  DollarSign,
  Eye,
  Calendar,
  ShoppingCart
} from 'lucide-react'
import { fetchApi } from '@/lib/api'

interface Product {
  id: string
  name: string
  price: number
  stock: number
  images: { url: string }[]
  _count: { orderItems: number }
}

interface Order {
  id: string
  orderNumber: string
  total: number
  status: string
  createdAt: string
  user: {
    name: string | null
    email: string
  }
}

interface DashboardStats {
  totalUsers: number
  totalOrders: number
  totalProducts: number
  totalRevenue: number
  monthlyRevenue: number
  pendingOrders: number
  activeUsers: number
  lowStockProducts: number
  topProducts: Product[]
  recentOrders: Order[]
}

export default function AdminDashboard() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingOrders: 0,
    activeUsers: 0,
    lowStockProducts: 0,
    topProducts: [],
    recentOrders: []
  })
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  const fetchDashboardStats = useCallback(async () => {
    try {
      const token = await getToken()
      const response = await fetchApi('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  const checkAuthorization = useCallback(async () => {
    try {
      const token = await getToken()
      console.log('[Admin] Token exists:', !!token)
      setDebugInfo(prev => prev + `\nToken exists: ${!!token}`)

      if (!token) {
        console.log('[Admin] No token')
        setDebugInfo(prev => prev + '\nNo token - not signed in')
        setLoading(false)
        return
      }

      setDebugInfo(prev => prev + '\nCalling /api/auth/check-role...')

      const response = await fetchApi('/api/auth/check-role', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('[Admin] Response status:', response.status)
      setDebugInfo(prev => prev + `\nResponse status: ${response.status}`)

      if (response.ok) {
        const data = await response.json()
        console.log('[Admin] Role data:', data)
        setDebugInfo(prev => prev + `\nRole data: ${JSON.stringify(data, null, 2)}`)

        if (data.role === 'ADMIN' || data.role === 'SUPER_ADMIN') {
          setAuthorized(true)
          setDebugInfo(prev => prev + '\nAuthorized! Loading dashboard...')
          fetchDashboardStats()
        } else {
          console.log('[Admin] Not admin role:', data.role)
          setDebugInfo(prev => prev + `\nNot admin role: ${data.role}`)
          setLoading(false)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.log('[Admin] API error:', response.status, errorData)
        setDebugInfo(prev => prev + `\nAPI error: ${response.status} - ${JSON.stringify(errorData)}`)
        setLoading(false)
      }
    } catch (error) {
      console.error('[Admin] Authorization check failed:', error)
      setDebugInfo(prev => prev + `\nError: ${error instanceof Error ? error.message : String(error)}`)
      setLoading(false)
    }
  }, [getToken, fetchDashboardStats])

  useEffect(() => {
    checkAuthorization()
  }, [checkAuthorization])

  useEffect(() => {
    setMounted(true)
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12% from last month'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      icon: ShoppingBag,
      color: 'bg-green-500',
      change: '+8% from last month'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-purple-500',
      change: '+3% from last month'
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats.totalRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+15% from last month'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${(stats.monthlyRevenue ?? 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-red-500',
      change: '+23% from last month'
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: ShoppingCart,
      color: 'bg-orange-500',
      change: '-5% from last month'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: Eye,
      color: 'bg-indigo-500',
      change: '+18% from last month'
    },
    {
      title: 'Low Stock Products',
      value: stats.lowStockProducts,
      icon: Package,
      color: 'bg-pink-500',
      change: 'Needs attention'
    }
  ]

  const quickActions = [
    { name: 'Manage Users', href: '/admin/users', icon: Users },
    { name: 'Manage Products', href: '/admin/products', icon: Package },
    { name: 'Manage Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Manage Categories', href: '/admin/categories', icon: Calendar },
  ]

  // Helper function to format time ago
  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffInMs = now.getTime() - then.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
    } else {
      return then.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authorization...</p>
          {debugInfo && (
            <pre className="mt-4 p-4 bg-gray-800 text-green-400 text-left text-xs rounded-lg max-w-xl overflow-auto">
              {debugInfo}
            </pre>
          )}
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to access the admin dashboard.</p>
          <div className="bg-gray-100 rounded-lg p-4 mb-4">
            <h2 className="font-semibold text-gray-800 mb-2">Debug Info:</h2>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-64">
              {debugInfo || 'No debug info available'}
            </pre>
          </div>
          <Link href="/" className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.firstName || 'Admin'}! Here&apos;s what&apos;s happening with your store.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-full ${card.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm text-gray-500">{card.change}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {card.title}
                </h3>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Icon className="h-8 w-8 text-red-600 mr-3" />
                  <span className="text-gray-900 font-medium">{action.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {(stats.recentOrders ?? []).length > 0 ? (
                (stats.recentOrders ?? []).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div>
                      <p className="font-medium text-gray-900">Order #{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">{order.user.name || order.user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{(order.total ?? 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">
                        {mounted ? formatTimeAgo(order.createdAt) : new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent orders</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Products</h2>
            <div className="space-y-3">
              {(stats.topProducts ?? []).length > 0 ? (
                (stats.topProducts ?? []).map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                    <div className="flex items-center">
                      {(product.images ?? []).length > 0 && (
                        <Image
                          src={product.images[0].url}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 object-cover rounded mr-3"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product._count?.orderItems ?? 0} sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{(product.price ?? 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">In stock: {product.stock ?? 0}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No products yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}