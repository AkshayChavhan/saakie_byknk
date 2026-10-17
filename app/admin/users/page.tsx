'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Filter, Edit, Trash2, Eye, UserPlus, MoreVertical, ArrowLeft, Users, ShieldCheck, Crown, ShoppingBag } from 'lucide-react'
import { SareeLoader } from '@/components/ui/saree-loader'
import { fetchApi } from '@/lib/api'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

interface User {
  id: string
  email: string
  name: string | null
  phone: string | null
  imageUrl: string | null
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  createdAt: string
  updatedAt: string
  _count: {
    orders: number
    reviews: number
  }
}

export default function UsersManagement() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const usersPerPage = 10
  // Search, the role filter and pages are applied by the API, so the table
  // covers the whole directory; the client used to filter its first 20 rows.
  const debouncedSearch = useDebouncedValue(searchTerm, 300)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalCount: 0, totalPages: 0 })
  const [stats, setStats] = useState({ total: 0, USER: 0, ADMIN: 0, SUPER_ADMIN: 0, orders: 0 })

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(currentPage), limit: String(usersPerPage) })
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      if (roleFilter !== 'all') params.set('role', roleFilter)

      const response = await fetchApi(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users ?? [])
        if (data.pagination) setPagination(data.pagination)
        if (data.stats) setStats((prev) => ({ ...prev, ...data.stats }))
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, usersPerPage, debouncedSearch, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // A changed search or role filter starts again from the first page.
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, roleFilter])

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await fetchApi(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          await fetchUsers()
        }
      } catch (error) {
        console.error('Failed to delete user:', error)
      }
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetchApi(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      })
      if (response.ok) {
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newRole as User['role'] } : user
        ))
      }
    } catch (error) {
      console.error('Failed to update user role:', error)
    }
  }

  // Already searched, filtered and paged by the API.
  const filteredUsers = users ?? []
  const paginatedUsers = filteredUsers
  const totalPages = pagination.totalPages

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800'
      case 'ADMIN': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SareeLoader size="lg" text="Loading users..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage all users and their permissions</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl group-hover:bg-blue-200 group-hover:scale-105 transition-all duration-200">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-green-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 rounded-xl group-hover:bg-green-200 group-hover:scale-105 transition-all duration-200">
                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Admins</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stats.ADMIN}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-red-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl group-hover:bg-red-200 group-hover:scale-105 transition-all duration-200">
                <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Super Admins</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stats.SUPER_ADMIN}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 border border-gray-100 hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 rounded-xl group-hover:bg-purple-200 group-hover:scale-105 transition-all duration-200">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {stats.orders}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
          <div className="flex flex-col gap-4">
            {/* Search and Add Button */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors duration-200" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2.5 text-base border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent hover:border-gray-300 transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all duration-200 font-medium shadow-lg shadow-red-500/25">
                <UserPlus className="h-5 w-5" />
                <span>Add User</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white min-w-[140px] hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all duration-200"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="USER">Users</option>
                <option value="ADMIN">Admins</option>
                <option value="SUPER_ADMIN">Super Admins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Reviews
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.imageUrl ? (
                            <Image
                              src={user.imageUrl}
                              alt={user.name || 'User avatar'}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full ring-1 ring-gray-100 hover:ring-2 hover:ring-red-200 transition-all duration-200 object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {user.name?.charAt(0) || user.email.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'No name'}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-500">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-0 cursor-pointer hover:shadow-sm transition-all duration-200 ${getRoleBadgeColor(user.role)}`}
                        value={user.role}
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{user._count?.orders || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{user._count?.reviews || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90">
                          <Eye className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                        </button>
                        <button className="p-2 text-emerald-600 hover:bg-emerald-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90">
                          <Edit className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 text-red-600 hover:bg-red-50 hover:shadow-sm rounded-lg transition-all duration-200 active:scale-90"
                        >
                          <Trash2 className="h-4 w-4 transition-transform duration-200 hover:scale-110" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50/50 px-4 py-4 border-t border-gray-100 sm:px-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * usersPerPage + 1} - {Math.min(currentPage * usersPerPage, pagination.totalCount)} of {pagination.totalCount}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-gray-200 transition-all duration-200 active:scale-95"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="hidden sm:flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${
                            currentPage === pageNum
                              ? 'bg-red-600 text-white shadow-md shadow-red-500/25 hover:bg-red-700'
                              : 'hover:bg-gray-100 text-gray-700 hover:shadow-sm'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <span className="sm:hidden text-sm font-medium text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-gray-200 transition-all duration-200 active:scale-95"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}