// Debug script to check user authentication state
console.log('Testing user authentication...')

// Test by opening the browser console and running:
// 1. Check if user is signed in
// 2. Check user role in publicMetadata
// 3. Test the admin link

const debugUserState = () => {
  // This would need to be run in browser console
  console.log('User object:', window.Clerk?.user)
  console.log('Public metadata:', window.Clerk?.user?.publicMetadata)
  console.log('Role:', window.Clerk?.user?.publicMetadata?.role)
}

// Instructions for debugging:
console.log(`
To debug the admin link issue:

1. Open browser console on localhost:3002
2. Run: debugUserState()
3. Check if user.publicMetadata.role is 'ADMIN' or 'SUPER_ADMIN'
4. If not, the user needs to be assigned an admin role
5. Test clicking the admin link

The middleware at /middleware.ts protects admin routes and redirects users without admin roles to home page.
`)