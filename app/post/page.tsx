'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SareeLoader } from '@/components/ui/saree-loader'
import {
  Instagram,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Play,
  Grid3X3,
  Film,
  ExternalLink,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { formatInstagramDate } from '@/lib/instagram'

// Instagram profile info
const INSTAGRAM_HANDLE = 'saakie_byknk'
const INSTAGRAM_PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_HANDLE}/`

interface InstagramMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  username: string
}

interface InstagramUser {
  id: string
  username: string
  account_type: string
  media_count: number
}

interface InstagramData {
  user: InstagramUser
  media: InstagramMedia[]
  cached_at: string
}

export default function InstagramPostsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setupRequired, setSetupRequired] = useState(false)
  const [instagramData, setInstagramData] = useState<InstagramData | null>(null)
  const [selectedPost, setSelectedPost] = useState<InstagramMedia | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts')
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [savedPosts, setSavedPosts] = useState<string[]>([])

  const fetchInstagramData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/instagram?limit=24')
      const data = await response.json()

      if (!response.ok) {
        if (data.setup_required) {
          setSetupRequired(true)
          return
        }
        throw new Error(data.error || 'Failed to fetch Instagram data')
      }

      setInstagramData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching Instagram data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstagramData()
  }, [])

  const toggleLike = (postId: string) => {
    setLikedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  const toggleSave = (postId: string) => {
    setSavedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  // Filter media by type
  const posts = instagramData?.media.filter(m => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM') || []
  const reels = instagramData?.media.filter(m => m.media_type === 'VIDEO') || []

  // Setup Required Screen
  if (setupRequired) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <SetupGuide />
        <Footer />
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-32">
          <SareeLoader size="lg" text="Loading Instagram feed..." />
        </div>
        <Footer />
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-32">
          <div className="max-w-md mx-auto text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Feed</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchInstagramData}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={20} />
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 py-16 sm:py-24 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-float" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-white/10 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col items-center text-center">
            {/* Instagram Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl animate-bounce-soft">
              <Instagram className="w-12 h-12 sm:w-14 sm:h-14 text-pink-500" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              Follow Us on Instagram
            </h1>
            <p className="text-white/90 text-lg sm:text-xl max-w-2xl mb-8">
              Stay updated with our latest collections, behind-the-scenes moments, and styling inspiration
            </p>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl max-w-md w-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-[3px]">
                    <div className="w-full h-full rounded-full bg-white p-[2px]">
                      <Image
                        src="/images/saakie.jpg"
                        alt="Saakie by KNK"
                        width={80}
                        height={80}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    @{instagramData?.user.username || INSTAGRAM_HANDLE}
                    <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </h2>
                  <p className="text-gray-500">Saakie by KNK</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-around mb-6 py-4 border-y border-gray-100">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{instagramData?.user.media_count || 0}</p>
                  <p className="text-sm text-gray-500">Posts</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{posts.length}</p>
                  <p className="text-sm text-gray-500">Photos</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{reels.length}</p>
                  <p className="text-sm text-gray-500">Reels</p>
                </div>
              </div>

              {/* Follow Button */}
              <a
                href={INSTAGRAM_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Instagram size={20} />
                Follow on Instagram
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="flex justify-center gap-16">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'posts'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid3X3 size={18} />
              <span className="font-medium">POSTS ({posts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('reels')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                activeTab === 'reels'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Film size={18} />
              <span className="font-medium">REELS ({reels.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4">
          {(activeTab === 'posts' ? posts : reels).length === 0 ? (
            <div className="text-center py-16">
              <Instagram className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No {activeTab} available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-4">
              {(activeTab === 'posts' ? posts : reels).map((post, index) => (
                <div
                  key={post.id}
                  className="relative aspect-square group cursor-pointer overflow-hidden rounded-none sm:rounded-lg animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedPost(post)}
                >
                  {/* Media */}
                  <Image
                    src={post.media_type === 'VIDEO' ? (post.thumbnail_url || post.media_url) : post.media_url}
                    alt={post.caption?.slice(0, 50) || 'Instagram post'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />

                  {/* Video indicator */}
                  {post.media_type === 'VIDEO' && (
                    <div className="absolute top-2 right-2 z-10">
                      <Play className="w-6 h-6 text-white drop-shadow-lg" fill="white" />
                    </div>
                  )}

                  {/* Carousel indicator */}
                  {post.media_type === 'CAROUSEL_ALBUM' && (
                    <div className="absolute top-2 right-2 z-10">
                      <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-7l-3 3.5h6L12 12z"/>
                      </svg>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                      <Heart className="w-6 h-6" fill="white" />
                      <span className="font-semibold">View</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more placeholder */}
          <div className="mt-12 text-center">
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-900 text-gray-900 font-semibold rounded-full hover:bg-gray-900 hover:text-white transition-colors"
            >
              View More on Instagram
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* Post Modal */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media */}
            <div className="md:w-3/5 aspect-square md:aspect-auto bg-black flex items-center justify-center relative">
              {selectedPost.media_type === 'VIDEO' ? (
                <video
                  src={selectedPost.media_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain"
                  poster={selectedPost.thumbnail_url}
                />
              ) : (
                <Image
                  src={selectedPost.media_url}
                  alt={selectedPost.caption?.slice(0, 50) || 'Instagram post'}
                  fill
                  className="object-contain"
                />
              )}
            </div>

            {/* Details */}
            <div className="md:w-2/5 flex flex-col max-h-[50vh] md:max-h-none">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 border-b">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-[2px]">
                  <Image
                    src="/images/saakie.jpg"
                    alt="Saakie"
                    width={40}
                    height={40}
                    className="w-full h-full rounded-full object-cover bg-white"
                  />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">@{selectedPost.username}</p>
                  <p className="text-xs text-gray-500">{formatInstagramDate(selectedPost.timestamp)}</p>
                </div>
              </div>

              {/* Caption */}
              <div className="flex-1 p-4 overflow-y-auto">
                <p className="text-gray-800 whitespace-pre-line text-sm">
                  {selectedPost.caption || 'No caption'}
                </p>
              </div>

              {/* Actions */}
              <div className="border-t p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(selectedPost.id)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Heart
                        className={`w-7 h-7 ${likedPosts.includes(selectedPost.id) ? 'text-red-500 fill-red-500' : 'text-gray-700'}`}
                      />
                    </button>
                    <button className="hover:scale-110 transition-transform">
                      <MessageCircle className="w-7 h-7 text-gray-700" />
                    </button>
                    <button className="hover:scale-110 transition-transform">
                      <Send className="w-7 h-7 text-gray-700" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleSave(selectedPost.id)}
                    className="hover:scale-110 transition-transform"
                  >
                    <Bookmark
                      className={`w-7 h-7 ${savedPosts.includes(selectedPost.id) ? 'text-gray-900 fill-gray-900' : 'text-gray-700'}`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(selectedPost.timestamp).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>

              {/* View on Instagram */}
              <div className="p-4 border-t">
                <a
                  href={selectedPost.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  View on Instagram
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-gray-700 hover:bg-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Join Our Community
          </h2>
          <p className="text-white/90 text-lg max-w-2xl mx-auto mb-8">
            Be part of our growing family of saree lovers. Share your looks, get styling tips, and stay updated with our latest collections.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-gray-100 transition-colors"
            >
              <Instagram size={24} />
              Follow @{instagramData?.user.username || INSTAGRAM_HANDLE}
            </a>
            <Link
              href="/products"
              className="flex items-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition-colors"
            >
              Shop Our Collection
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

// Setup Guide Component
function SetupGuide() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Instagram className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Instagram Integration Setup
          </h1>
          <p className="text-gray-600">
            Follow these steps to connect your Instagram account and display your posts.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create a Facebook/Meta Developer App
              </h3>
              <p className="text-gray-600 mb-3">
                Go to the Meta for Developers portal and create a new app with Instagram Basic Display.
              </p>
              <a
                href="https://developers.facebook.com/apps/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                Go to Meta Developers
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add Instagram Basic Display Product
              </h3>
              <p className="text-gray-600 mb-3">
                In your app settings, add the &quot;Instagram Basic Display&quot; product and configure the OAuth settings.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Valid OAuth Redirect URIs: <code className="bg-gray-100 px-2 py-1 rounded">https://your-domain.com/api/instagram/callback</code></li>
                <li>• Deauthorize Callback URL: Your app URL</li>
                <li>• Data Deletion Request URL: Your app URL</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add Instagram Test User
              </h3>
              <p className="text-gray-600 mb-3">
                In the &quot;Roles&quot; section, add your Instagram account as a test user and accept the invitation.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Generate Access Token
              </h3>
              <p className="text-gray-600 mb-3">
                Generate a long-lived access token for your Instagram account from the Token Generator in your app settings.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              5
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add to Environment Variables
              </h3>
              <p className="text-gray-600 mb-3">
                Add the access token to your <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> file:
              </p>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token_here
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">Important Notes</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Long-lived tokens are valid for 60 days and need to be refreshed</li>
                  <li>• The Instagram Basic Display API only works with Instagram personal accounts (not Business accounts)</li>
                  <li>• For Business accounts, you&apos;ll need to use the Instagram Graph API instead</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative: Quick Setup with Embed */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 mb-4">
            Want a quicker solution? You can also embed posts directly without API setup.
          </p>
          <a
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            Visit our Instagram page directly
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  )
}
