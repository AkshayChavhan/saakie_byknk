const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function getPublicMetadata(userId: string) {
  try {
    if (!userId) {
      return null
    }

    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/metadata`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    return {
      role: data.role,
      email: data.email,
      name: data.name
    }
  } catch (error) {
    console.error('Error fetching user metadata:', error)
    return null
  }
}
