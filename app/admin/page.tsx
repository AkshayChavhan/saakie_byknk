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
  ShoppingCart,
  GitBranch,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Circle,
  X,
  Trash2
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
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

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  parent: Category | null
  children: Category[]
  isActive: boolean
  _count: {
    products: number
  }
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

  // Mapped View state
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [isMappedViewOpen, setIsMappedViewOpen] = useState(false)
  const [isClosingMappedView, setIsClosingMappedView] = useState(false)
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(new Set())
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'subcategory'
    id: string
    name: string
    isActive: boolean
    hasChildren: number
    hasProducts: number
  } | null>(null)
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false)
  const [isClosingDeletePopup, setIsClosingDeletePopup] = useState(false)
  const [isDeletingFromMap, setIsDeletingFromMap] = useState(false)

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

  // Mapped View functions
  const parentCategories = categories.filter(cat => !cat.parentId)
  const subCategories = categories.filter(cat => cat.parentId)
  const totalCategoryProducts = categories.reduce((sum, cat) => sum + (cat._count?.products ?? 0), 0)

  const fetchCategories = async () => {
    setIsLoadingCategories(true)
    try {
      const token = await getToken()
      const response = await fetchApi('/api/admin/categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        const categoriesData = Array.isArray(data) ? data : (data.categories ?? data.data ?? [])
        setCategories(categoriesData)
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error)
      toast.error('Failed to Load', 'Could not load categories.')
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const openMappedView = async () => {
    await fetchCategories()
    // Expand all nodes by default
    setTimeout(() => {
      const allIds = new Set<string>()
      categories.forEach(cat => {
        if (!cat.parentId) {
          allIds.add(cat.id)
          cat.children?.forEach(child => allIds.add(child.id))
        }
      })
      setExpandedTreeNodes(allIds)
    }, 100)
    setIsMappedViewOpen(true)
  }

  const closeMappedView = () => {
    setIsClosingMappedView(true)
    setTimeout(() => {
      setIsMappedViewOpen(false)
      setIsClosingMappedView(false)
    }, 250)
  }

  const toggleTreeNode = (id: string) => {
    setExpandedTreeNodes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const expandAllTreeNodes = () => {
    const allIds = new Set<string>()
    parentCategories.forEach(cat => {
      allIds.add(cat.id)
      cat.children?.forEach(child => allIds.add(child.id))
    })
    setExpandedTreeNodes(allIds)
  }

  const collapseAllTreeNodes = () => {
    setExpandedTreeNodes(new Set())
  }

  const openDeletePopup = (
    type: 'category' | 'subcategory',
    id: string,
    name: string,
    isActive: boolean,
    hasChildren: number,
    hasProducts: number
  ) => {
    setDeleteTarget({ type, id, name, isActive, hasChildren, hasProducts })
    setIsDeletePopupOpen(true)
  }

  const closeDeletePopup = () => {
    setIsClosingDeletePopup(true)
    setTimeout(() => {
      setIsDeletePopupOpen(false)
      setIsClosingDeletePopup(false)
      setDeleteTarget(null)
    }, 200)
  }

  const canDelete = (target: typeof deleteTarget) => {
    if (!target) return { allowed: false, reasons: ['No target selected'] }
    const reasons: string[] = []
    if (target.isActive) {
      reasons.push('Category is currently active. Please deactivate it first.')
    }
    if (target.type === 'category' && target.hasChildren > 0) {
      reasons.push(`Has ${target.hasChildren} sub-categor${target.hasChildren === 1 ? 'y' : 'ies'}. Delete them first.`)
    }
    if (target.hasProducts > 0) {
      reasons.push(`Has ${target.hasProducts} product${target.hasProducts === 1 ? '' : 's'} linked. Reassign or delete them first.`)
    }
    return { allowed: reasons.length === 0, reasons }
  }

  const handleDeleteFromMap = async () => {
    if (!deleteTarget) return
    const validation = canDelete(deleteTarget)
    if (!validation.allowed) return

    setIsDeletingFromMap(true)
    try {
      const token = await getToken()
      const response = await fetchApi(`/api/admin/categories/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== deleteTarget.id))
        toast.success('Deleted Successfully', `"${deleteTarget.name}" has been deleted.`)
        closeDeletePopup()
      } else {
        const error = await response.json()
        toast.error('Delete Failed', error.error || 'Failed to delete. Please try again.')
      }
    } catch (error) {
      console.error('Delete failed:', error)
      toast.error('Delete Failed', 'An unexpected error occurred.')
    } finally {
      setIsDeletingFromMap(false)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  href={action.href}
                  className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Icon className="h-8 w-8 text-red-600 mr-3" />
                  <span className="text-gray-900 font-medium">{action.name}</span>
                </Link>
              )
            })}
            {/* Mapped View Button */}
            <button
              onClick={openMappedView}
              disabled={isLoadingCategories}
              className="flex items-center p-4 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-lg hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 0C1.55228 0 2 0.447715 2 1C2 1.55228 1.55228 2 1 2C0.447715 2 0 1.55228 0 1C0 0.447715 0.447715 0 1 0Z\' fill=\'rgba(255,255,255,0.1)\'/%3E%3C/svg%3E')] opacity-60"></div>
              {/* Glow Effect */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
              <div className="relative flex items-center">
                {isLoadingCategories ? (
                  <div className="h-8 w-8 mr-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="p-1.5 bg-white/20 rounded-lg mr-3 group-hover:bg-white/30 group-hover:scale-110 transition-all duration-300">
                    <GitBranch className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <span className="text-white font-medium block">Category Map</span>
                  <span className="text-white/70 text-xs">View hierarchy</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70 ml-auto group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
            </button>
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

      {/* Mapped View Modal */}
      {isMappedViewOpen && (
        <div
          className={`fixed inset-0 bg-gradient-to-br from-black/70 via-purple-900/20 to-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-all duration-300 ${
            isClosingMappedView ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={(e) => e.target === e.currentTarget && closeMappedView()}
        >
          <div className={`bg-gradient-to-b from-white to-gray-50 w-full sm:max-w-5xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl ${
            isClosingMappedView
              ? 'animate-slide-down sm:animate-fade-out'
              : 'animate-slide-up sm:animate-fade-in'
          }`}>
            {/* Modal Header */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"></div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'30\' height=\'30\' viewBox=\'0 0 30 30\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z\' fill=\'rgba(255,255,255,0.07)\'/%3E%3C/svg%3E')] opacity-60"></div>
              <div className="relative flex items-center justify-between p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shadow-lg ring-1 ring-white/30 animate-pulse-slow">
                    <GitBranch className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Category Map</h2>
                    <p className="text-sm text-white/70 mt-0.5">Interactive hierarchy visualization</p>
                  </div>
                </div>
                <button
                  onClick={closeMappedView}
                  className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ring-1 ring-white/20"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200/80 bg-white/80 backdrop-blur-sm flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex gap-2">
                <button
                  onClick={expandAllTreeNodes}
                  className="group px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-xl hover:bg-purple-200 hover:shadow-md hover:shadow-purple-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2"
                >
                  <ChevronDown className="h-4 w-4 group-hover:animate-bounce" />
                  <span className="hidden sm:inline">Expand All</span>
                  <span className="sm:hidden">Expand</span>
                </button>
                <button
                  onClick={collapseAllTreeNodes}
                  className="group px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center gap-2"
                >
                  <ChevronUp className="h-4 w-4 group-hover:animate-bounce" />
                  <span className="hidden sm:inline">Collapse All</span>
                  <span className="sm:hidden">Collapse</span>
                </button>
              </div>
              <div className="ml-auto flex items-center gap-3 sm:gap-5 text-xs sm:text-sm">
                <span className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-sm shadow-blue-500/50 animate-pulse-slow"></div>
                  <span className="text-blue-700 font-medium hidden sm:inline">Category</span>
                  <span className="text-blue-700 font-medium sm:hidden">Cat</span>
                </span>
                <span className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-sm shadow-purple-500/50 animate-pulse-slow"></div>
                  <span className="text-purple-700 font-medium hidden sm:inline">Sub-Category</span>
                  <span className="text-purple-700 font-medium sm:hidden">Sub</span>
                </span>
                <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/50 animate-pulse-slow"></div>
                  <span className="text-emerald-700 font-medium hidden sm:inline">Products</span>
                  <span className="text-emerald-700 font-medium sm:hidden">Prod</span>
                </span>
              </div>
            </div>

            {/* Tree Diagram */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-gray-50/50 to-white">
              {isLoadingCategories ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading categories...</p>
                </div>
              ) : parentCategories.length === 0 ? (
                <div className="text-center py-16 animate-fade-in">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-purple-200 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                    <GitBranch className="relative h-16 w-16 text-purple-300 mx-auto mb-6" />
                  </div>
                  <p className="text-gray-500 text-lg">No categories to display</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first category to see it here</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {parentCategories.map((category, catIndex) => {
                    const isCatExpanded = expandedTreeNodes.has(category.id)
                    const hasContent = (category.children?.length ?? 0) > 0 || (category._count?.products ?? 0) > 0

                    return (
                      <div
                        key={category.id}
                        className="tree-node animate-fade-in-up"
                        style={{ animationDelay: `${catIndex * 50}ms` }}
                      >
                        {/* Parent Category Card */}
                        <div
                          className={`group relative flex items-center gap-3 p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl ${
                            isCatExpanded
                              ? 'bg-gradient-to-r from-blue-50 via-blue-50 to-indigo-50 border-blue-300 shadow-lg shadow-blue-500/10'
                              : 'bg-white border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 shadow-md'
                          }`}
                          onClick={() => toggleTreeNode(category.id)}
                        >
                          {/* Decorative line */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-400 via-blue-500 to-indigo-500 transition-opacity duration-300 ${isCatExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>

                          {/* Expand Button */}
                          <button className={`p-2 rounded-xl transition-all duration-300 ${
                            hasContent
                              ? 'bg-blue-100 hover:bg-blue-200 hover:shadow-md group-hover:scale-110'
                              : 'bg-gray-100'
                          }`}>
                            {hasContent ? (
                              <ChevronRight className={`h-5 w-5 text-blue-600 transition-transform duration-300 ${isCatExpanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
                            ) : (
                              <Circle className="h-3 w-3 text-gray-400" />
                            )}
                          </button>

                          {/* Category Icon */}
                          <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                            isCatExpanded
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-500/30'
                              : 'bg-blue-100 group-hover:bg-blue-200'
                          }`}>
                            <Folder className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-300 ${isCatExpanded ? 'text-white' : 'text-blue-600'}`} />
                          </div>

                          {/* Category Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 text-base sm:text-lg truncate group-hover:text-blue-900 transition-colors">
                              {category.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">/{category.slug}</p>
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                              category.isActive
                                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
                            }`}>
                              {category.isActive ? '● Active' : '○ Inactive'}
                            </span>
                            {(category._count?.products ?? 0) > 0 && (
                              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold ring-1 ring-blue-200">
                                <Package className="h-3 w-3" />
                                {category._count?.products}
                              </span>
                            )}
                            {(category.children?.length ?? 0) > 0 && (
                              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold ring-1 ring-purple-200">
                                <FolderOpen className="h-3 w-3" />
                                {category.children?.length}
                              </span>
                            )}
                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openDeletePopup(
                                  'category',
                                  category.id,
                                  category.name,
                                  category.isActive,
                                  category.children?.length ?? 0,
                                  category._count?.products ?? 0
                                )
                              }}
                              className="opacity-0 group-hover:opacity-100 p-2 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
                              title="Delete category"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Children Container */}
                        <div className={`overflow-hidden transition-all duration-500 ease-out ${
                          isCatExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}>
                          <div className="ml-4 sm:ml-8 mt-3 pl-4 sm:pl-6 border-l-[3px] border-dashed border-blue-200 space-y-3 relative">
                            {/* Connecting dot */}
                            <div className="absolute -left-[7px] top-0 w-3 h-3 rounded-full bg-blue-300 border-2 border-white shadow-sm"></div>

                            {/* Sub-categories */}
                            {category.children?.map((subCat, subIndex) => {
                              const isSubExpanded = expandedTreeNodes.has(subCat.id)
                              const hasProducts = (subCat._count?.products ?? 0) > 0

                              return (
                                <div
                                  key={subCat.id}
                                  className="tree-node animate-fade-in-left"
                                  style={{ animationDelay: `${subIndex * 30}ms` }}
                                >
                                  {/* Sub-category Card */}
                                  <div
                                    className={`group relative flex items-center gap-2.5 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg ${
                                      isSubExpanded
                                        ? 'bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-300 shadow-md shadow-purple-500/10'
                                        : 'bg-white border-purple-200 hover:border-purple-300 hover:bg-purple-50/50 shadow-sm'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleTreeNode(subCat.id)
                                    }}
                                  >
                                    {/* Decorative line */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-purple-400 to-fuchsia-400 transition-opacity duration-300 ${isSubExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></div>

                                    {/* Expand Button */}
                                    <button className={`p-1.5 rounded-lg transition-all duration-300 ${
                                      hasProducts
                                        ? 'bg-purple-100 hover:bg-purple-200 group-hover:scale-110'
                                        : 'bg-gray-100'
                                    }`}>
                                      {hasProducts ? (
                                        <ChevronRight className={`h-4 w-4 text-purple-600 transition-transform duration-300 ${isSubExpanded ? 'rotate-90' : ''}`} />
                                      ) : (
                                        <Circle className="h-2 w-2 text-gray-400" />
                                      )}
                                    </button>

                                    {/* Icon */}
                                    <div className={`p-2 rounded-lg transition-all duration-300 ${
                                      isSubExpanded
                                        ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-md shadow-purple-500/30'
                                        : 'bg-purple-100 group-hover:bg-purple-200'
                                    }`}>
                                      <FolderOpen className={`h-4 w-4 transition-colors duration-300 ${isSubExpanded ? 'text-white' : 'text-purple-600'}`} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate group-hover:text-purple-900 transition-colors">
                                        {subCat.name}
                                      </h4>
                                      <p className="text-xs text-gray-500 truncate hidden sm:block">/{subCat.slug}</p>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        subCat.isActive
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {subCat.isActive ? '●' : '○'}
                                      </span>
                                      {hasProducts && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                          <Package className="h-3 w-3" />
                                          {subCat._count?.products}
                                        </span>
                                      )}
                                      {/* Delete Button */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openDeletePopup(
                                            'subcategory',
                                            subCat.id,
                                            subCat.name,
                                            subCat.isActive,
                                            0,
                                            subCat._count?.products ?? 0
                                          )
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
                                        title="Delete sub-category"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Products under sub-category */}
                                  <div className={`overflow-hidden transition-all duration-400 ease-out ${
                                    isSubExpanded && hasProducts ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                                  }`}>
                                    <div className="ml-6 sm:ml-10 mt-2 pl-4 border-l-2 border-dashed border-purple-200">
                                      <div
                                        className="group flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:shadow-md hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toast.info('Products', `${subCat._count?.products ?? 0} product(s) linked to "${subCat.name}". Manage products in the Products section.`)
                                        }}
                                      >
                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                                          <Package className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                          <span className="text-sm font-bold text-emerald-800">
                                            {subCat._count?.products} Product{(subCat._count?.products ?? 0) !== 1 ? 's' : ''}
                                          </span>
                                          <p className="text-xs text-emerald-600">linked to this sub-category</p>
                                        </div>
                                        <div className="ml-auto flex -space-x-1">
                                          {[...Array(Math.min(3, subCat._count?.products ?? 0))].map((_, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200 border-2 border-white flex items-center justify-center">
                                              <Package className="h-3 w-3 text-emerald-600" />
                                            </div>
                                          ))}
                                          {(subCat._count?.products ?? 0) > 3 && (
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700">
                                              +{(subCat._count?.products ?? 0) - 3}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Direct products under parent category */}
                            {(category._count?.products ?? 0) > 0 && (
                              <div
                                className="group flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 hover:shadow-md hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-0.5 animate-fade-in-left cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toast.info('Products', `${category._count?.products ?? 0} product(s) linked to "${category.name}". Manage products in the Products section.`)
                                }}
                              >
                                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                                  <Package className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <span className="text-sm font-bold text-emerald-800">
                                    {category._count?.products} Product{(category._count?.products ?? 0) !== 1 ? 's' : ''}
                                  </span>
                                  <p className="text-xs text-emerald-600">
                                    {(category.children?.length ?? 0) > 0 ? 'directly in this category' : 'in this category'}
                                  </p>
                                </div>
                                <div className="ml-auto flex -space-x-1">
                                  {[...Array(Math.min(3, category._count?.products ?? 0))].map((_, i) => (
                                    <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-200 to-teal-200 border-2 border-white flex items-center justify-center">
                                      <Package className="h-3 w-3 text-emerald-600" />
                                    </div>
                                  ))}
                                  {(category._count?.products ?? 0) > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-xs font-bold text-emerald-700">
                                      +{(category._count?.products ?? 0) - 3}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Empty state */}
                            {(!category.children || category.children.length === 0) && (!category._count || category._count.products === 0) && (
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 animate-fade-in">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                  <Circle className="h-4 w-4 text-gray-400" />
                                </div>
                                <span className="text-sm italic">No sub-categories or products yet</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="relative overflow-hidden border-t border-gray-200">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-white to-blue-50"></div>
              <div className="relative p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Stats */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-blue-100">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <Folder className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <span className="text-lg font-bold text-gray-900">{parentCategories.length}</span>
                        <p className="text-xs text-gray-500">Categories</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-purple-100">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <FolderOpen className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="text-center">
                        <span className="text-lg font-bold text-gray-900">{subCategories.length}</span>
                        <p className="text-xs text-gray-500">Sub-Categories</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-emerald-100">
                      <div className="p-1.5 bg-emerald-100 rounded-lg">
                        <Package className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="text-center">
                        <span className="text-lg font-bold text-gray-900">{totalCategoryProducts}</span>
                        <p className="text-xs text-gray-500">Products</p>
                      </div>
                    </div>
                  </div>
                  {/* Close Button */}
                  <button
                    onClick={closeMappedView}
                    className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 hover:shadow-xl hover:shadow-gray-900/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 font-semibold flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Close Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {isDeletePopupOpen && deleteTarget && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 transition-all duration-200 ${
            isClosingDeletePopup ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={(e) => e.target === e.currentTarget && closeDeletePopup()}
        >
          <div className={`bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 ${
            isClosingDeletePopup
              ? 'scale-95 opacity-0 translate-y-4'
              : 'scale-100 opacity-100 translate-y-0 animate-bounce-in'
          }`}>
            {/* Header */}
            <div className="relative overflow-hidden">
              <div className={`absolute inset-0 ${
                deleteTarget.type === 'category'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                  : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'
              }`}></div>
              <div className="relative p-6 text-center">
                <div className="inline-flex p-4 bg-white/20 backdrop-blur-sm rounded-full mb-4 animate-shake">
                  <Trash2 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">Delete {deleteTarget.type === 'category' ? 'Category' : 'Sub-Category'}?</h3>
                <p className="text-white/80 mt-1 text-sm">This action cannot be undone</p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Target Info */}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl mb-4">
                <div className={`p-2.5 rounded-xl ${
                  deleteTarget.type === 'category' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  {deleteTarget.type === 'category' ? (
                    <Folder className="h-6 w-6 text-blue-600" />
                  ) : (
                    <FolderOpen className="h-6 w-6 text-purple-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{deleteTarget.name}</h4>
                  <p className="text-sm text-gray-500 capitalize">{deleteTarget.type}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  deleteTarget.isActive
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {deleteTarget.isActive ? '● Active' : '○ Inactive'}
                </span>
              </div>

              {/* Validation Messages */}
              {(() => {
                const validation = canDelete(deleteTarget)
                return (
                  <div className="space-y-3">
                    {!validation.allowed ? (
                      <>
                        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200 animate-fade-in">
                          <div className="p-1.5 bg-red-100 rounded-lg flex-shrink-0 mt-0.5">
                            <X className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-medium text-red-800">Cannot Delete</p>
                            <p className="text-sm text-red-600 mt-1">Please resolve the following issues first:</p>
                          </div>
                        </div>
                        <ul className="space-y-2">
                          {validation.reasons.map((reason, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800 animate-fade-in-left"
                              style={{ animationDelay: `${index * 100}ms` }}
                            >
                              <span className="text-amber-500 flex-shrink-0">⚠</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200 animate-fade-in">
                        <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0 mt-0.5">
                          <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-green-800">Ready to Delete</p>
                          <p className="text-sm text-green-600 mt-1">
                            This {deleteTarget.type} can be safely deleted.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeDeletePopup}
                disabled={isDeletingFromMap}
                className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100 hover:border-gray-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFromMap}
                disabled={isDeletingFromMap || !canDelete(deleteTarget).allowed}
                className={`flex-1 px-4 py-3 font-medium rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-200 ${
                  canDelete(deleteTarget).allowed
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:shadow-red-500/30'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isDeletingFromMap ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles for Animations */}
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-down {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes fade-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-out {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }
        @keyframes fade-in-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fade-in-left {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5) translateY(50px); opacity: 0; }
          50% { transform: scale(1.05) translateY(-10px); }
          70% { transform: scale(0.98) translateY(5px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-5deg); }
          20%, 40%, 60%, 80% { transform: rotate(5deg); }
        }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-out { animation: fade-out 0.2s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in-left { animation: fade-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  )
}