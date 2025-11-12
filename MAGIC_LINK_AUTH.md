# Magic Link Authentication - Implementation Guide

## Overview

The frontend now uses **passwordless authentication** via Supabase Auth's magic link (OTP) system. Users receive an email with a magic link that automatically signs them in when clicked.

---

## 🔐 Authentication Flow

### User Sign In/Sign Up Flow

```
1. User enters email address
   ↓
2. Frontend sends POST /auth/magic-link
   ↓
3. Backend calls Supabase Auth to send magic link
   ↓
4. Supabase sends email with magic link to user
   ↓
5. User clicks link in email
   ↓
6. Browser redirects to /auth/callback with token
   ↓
7. Frontend verifies token with backend
   ↓
8. Backend validates with Supabase and returns user + session
   ↓
9. Frontend stores tokens in localStorage
   ↓
10. User redirected to /home
```

### Subsequent Visits (Auto-authentication)

```
1. User opens app
   ↓
2. AuthContext checks localStorage for access_token
   ↓
3. If token exists and valid → User is authenticated
   ↓
4. If token expired → Auto-refresh with refresh_token
   ↓
5. If refresh fails → Redirect to login
```

---

## 📡 API Endpoints

### 1. Send Magic Link

**Endpoint:** `POST /auth/magic-link`

**Request:**
```json
{
  "email": "user@example.com",
  "redirect_to": "http://localhost:3000/auth/callback"
}
```

**Success Response (200):**
```json
{
  "message": "Magic link sent successfully",
  "email": "user@example.com"
}
```

**Error Response (400):**
```json
{
  "detail": "Invalid email address"
}
```

**Frontend Implementation:**
```typescript
// contexts/AuthContext.tsx
const sendMagicLink = async (email: string) => {
  const response = await fetch(`${API_BASE}/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      redirect_to: `${window.location.origin}/auth/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send magic link');
  }

  return await response.json();
};
```

---

### 2. Verify OTP Token

**Endpoint:** `POST /auth/verify-otp`

**Request:**
```json
{
  "token": "magic-link-token-from-url"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe"
    },
    "created_at": "2025-11-12T10:00:00Z"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "v2.local.xyz...",
    "expires_at": 1234567890,
    "expires_in": 3600
  }
}
```

**Error Response (401):**
```json
{
  "detail": "Invalid or expired token"
}
```

**Frontend Implementation:**
```typescript
// contexts/AuthContext.tsx
const verifyOtp = async (token: string) => {
  const response = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Token verification failed');
  }

  const data = await response.json();

  // Store tokens and user
  localStorage.setItem('access_token', data.session.access_token);
  localStorage.setItem('refresh_token', data.session.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};
```

---

### 3. Alternative: Direct Token Handling

Supabase may send tokens directly in the callback URL:

**Callback URL Format:**
```
http://localhost:3000/auth/callback?access_token=xxx&refresh_token=yyy&type=magiclink
```

**Frontend Handling:**
```typescript
// app/auth/callback/page.tsx
const access_token = searchParams.get('access_token');
const refresh_token = searchParams.get('refresh_token');

if (access_token && refresh_token) {
  // Store tokens directly
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('refresh_token', refresh_token);
  
  // Get user info from backend
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: { 'Authorization': `Bearer ${access_token}` },
  });

  const user = await response.json();
  localStorage.setItem('user', JSON.stringify(user));
  
  // Redirect to home
  router.push('/home');
}
```

---

## 🖥️ Frontend Implementation

### 1. Login Page (`app/login2/page.tsx`)

**Features:**
- Single email input field (no password)
- Sends magic link via backend
- Shows success message after sending
- Informs user to check their email

**UI Flow:**
```tsx
export default function LoginPage() {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await sendMagicLink(email);
      setSuccess('Check your email! We sent you a magic link to sign in.');
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {success && <div className="success">{success}</div>}
      <button type="submit">Send magic link</button>
    </form>
  );
}
```

---

### 2. Sign Up Page (`app/signup/page.tsx`)

**Features:**
- Identical to login page
- Single email input (no passwords needed)
- Same magic link flow
- New users automatically created on first sign in

**Note:** Supabase Auth creates new users automatically when they click a magic link for the first time.

---

### 3. Callback Page (`app/auth/callback/page.tsx`)

**Features:**
- Handles redirect after user clicks magic link
- Verifies token with backend
- Stores session data in localStorage
- Redirects to home page
- Shows loading/success/error states

**Implementation:**
```tsx
export default function AuthCallbackPage() {
  const { verifyOtp } = useAuth();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const verifyToken = async () => {
      // Check for direct tokens in URL
      const access_token = searchParams.get('access_token');
      const refresh_token = searchParams.get('refresh_token');
      
      if (access_token && refresh_token) {
        // Direct token method
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        router.push('/home');
        return;
      }

      // Otherwise verify token via backend
      const token = searchParams.get('token');
      if (token) {
        await verifyOtp(token);
        router.push('/home');
      }
    };
    
    verifyToken();
  }, []);
  
  return <div>Verifying...</div>;
}
```

---

### 4. AuthContext Updates (`contexts/AuthContext.tsx`)

**New Functions:**
- `sendMagicLink(email)` - Sends magic link to email
- `verifyOtp(token)` - Verifies token and creates session
- Removed: `signIn(email, password)`, `signUp(email, password, name)`

**Interface:**
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendMagicLink: (email: string) => Promise<void>;
  verifyOtp: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  isAuthenticated: boolean;
}
```

---

## 🔄 Token Management

### Storage
Same as before:
- `localStorage.setItem('access_token', token)`
- `localStorage.setItem('refresh_token', token)`
- `localStorage.setItem('user', JSON.stringify(user))`

### Automatic Token Refresh
- When `access_token` expires (401 response)
- Frontend automatically uses `refresh_token` to get new tokens
- Retry original request with new token
- Seamless user experience

### Session Persistence
- Tokens survive page refreshes
- On app load, AuthContext checks localStorage
- If valid token exists, user is auto-authenticated
- No need to log in again

---

## 📧 Email Template

### What Users Receive

**Subject:** Sign in to OneDrive Clone

**Body:**
```
Hi there!

Click the link below to sign in to your account:

[Sign In] (magic link button/URL)

This link will expire in 15 minutes.

If you didn't request this email, you can safely ignore it.

Thanks,
OneDrive Clone Team
```

The magic link URL looks like:
```
http://localhost:3000/auth/callback?token=abc123xyz...
```

---

## 🧪 Testing the Flow

### Manual Testing

#### 1. Test Sign Up (New User)
```bash
1. Go to http://localhost:3000/signup
2. Enter email: newuser@example.com
3. Click "Get started"
4. Check email inbox
5. Click magic link in email
6. Should redirect to /auth/callback
7. Should show "Verifying..." then redirect to /home
8. Should be signed in automatically
```

#### 2. Test Sign In (Existing User)
```bash
1. Go to http://localhost:3000/login2
2. Enter email: existinguser@example.com
3. Click "Send magic link"
4. See success message: "Check your email!"
5. Check email inbox
6. Click magic link
7. Should redirect to /home
8. Should be signed in
```

#### 3. Test Auto-Authentication
```bash
1. Sign in via magic link
2. Close browser tab
3. Open new tab to http://localhost:3000
4. Should automatically be signed in (no redirect to login)
5. Can access /home, /myfiles, /gallery without re-authenticating
```

#### 4. Test Token Expiration
```bash
1. Sign in via magic link
2. Wait for token to expire (or manually delete access_token from localStorage)
3. Try to access /myfiles or upload a file
4. Should see "Token expired, attempting refresh..." in console
5. Should auto-refresh and continue without redirect
6. User doesn't notice anything
```

#### 5. Test Logout
```bash
1. Sign in via magic link
2. Click profile avatar
3. Click "Sign out"
4. Should redirect to /login2
5. localStorage should be cleared
6. Try accessing /home → should redirect to /login2
```

---

## 🛠️ Backend Requirements

### What Backend Must Implement

#### 1. **POST /auth/magic-link** Endpoint
```python
@app.post("/auth/magic-link")
async def send_magic_link(data: dict):
    email = data.get("email")
    redirect_to = data.get("redirect_to")
    
    # Call Supabase Auth to send magic link
    supabase.auth.sign_in_with_otp({
        "email": email,
        "options": {
            "email_redirect_to": redirect_to
        }
    })
    
    return {"message": "Magic link sent successfully", "email": email}
```

#### 2. **POST /auth/verify-otp** Endpoint
```python
@app.post("/auth/verify-otp")
async def verify_otp(data: dict):
    token = data.get("token")
    
    # Verify token with Supabase
    response = supabase.auth.verify_otp({
        "token": token,
        "type": "magiclink"
    })
    
    if not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return {
        "user": {
            "id": response.user.id,
            "email": response.user.email,
            "user_metadata": response.user.user_metadata
        },
        "session": {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
            "expires_in": response.session.expires_in
        }
    }
```

#### 3. **Configure Supabase Email Templates**
- Go to Supabase Dashboard → Authentication → Email Templates
- Customize "Magic Link" template
- Set redirect URL to: `http://localhost:3000/auth/callback`
- For production: `https://yourdomain.com/auth/callback`

---

## 🔒 Security Considerations

### ✅ Implemented
- Magic links expire after 15 minutes (Supabase default)
- One-time use tokens (can't be reused)
- Tokens validated by Supabase Auth
- User isolation enforced (users only see their own data)
- Automatic token refresh
- Secure logout

### 🚨 Important Notes
1. **HTTPS in Production:** Magic links should only be sent over HTTPS in production
2. **Email Security:** Users must have secure email accounts
3. **Token Expiration:** Tokens expire quickly to prevent misuse
4. **Rate Limiting:** Backend should rate limit magic link requests to prevent spam

---

## 🎨 User Experience Benefits

### Advantages of Magic Link Auth
- ✅ **No passwords to remember** - Users just need their email
- ✅ **More secure** - No password to steal or guess
- ✅ **Faster sign up** - Just enter email, no password creation
- ✅ **No "forgot password" flow** - Every sign in is like password reset
- ✅ **Better UX** - Modern, clean authentication experience
- ✅ **Works on all devices** - Can sign in from email on any device

### User Journey
1. Enter email → Get link → Click link → Signed in ✨
2. Next time: Already signed in (token persists) 🎉

---

## 📚 Summary for Backend Developer

### What Frontend Sends

**1. Send Magic Link Request:**
```json
POST /auth/magic-link
{
  "email": "user@example.com",
  "redirect_to": "http://localhost:3000/auth/callback"
}
```

**2. Verify Token Request:**
```json
POST /auth/verify-otp
{
  "token": "magic-link-token-from-url"
}
```

### What Backend Should Return

**1. Magic Link Response:**
```json
{
  "message": "Magic link sent successfully",
  "email": "user@example.com"
}
```

**2. Verify Token Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {}
  },
  "session": {
    "access_token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_at": 1234567890,
    "expires_in": 3600
  }
}
```

### Backend Must:
1. ✅ Implement `/auth/magic-link` endpoint
2. ✅ Implement `/auth/verify-otp` endpoint
3. ✅ Call Supabase Auth to send magic links
4. ✅ Verify tokens with Supabase
5. ✅ Return user + session data
6. ✅ Keep existing protected endpoints as-is (still use Bearer tokens)

---

## 🚀 Ready to Test!

The frontend is fully configured for magic link authentication. To test:

1. **Start backend:** Make sure it implements the two new endpoints
2. **Start frontend:** `npm run dev`
3. **Go to:** `http://localhost:3000/login2`
4. **Enter email** and click "Send magic link"
5. **Check email** and click the link
6. **Get signed in** automatically! 🎉

---

## 📝 Environment Variables

Make sure `.env` has:
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

For production:
```env
NEXT_PUBLIC_API_BASE=https://api.yourdomain.com
```

---

## ✨ Conclusion

The frontend now uses **passwordless magic link authentication** via Supabase Auth. Users receive an email, click a link, and are instantly signed in. The implementation is clean, secure, and provides an excellent user experience. All existing file operations continue to work with the same JWT token authentication.

**Happy testing! 🚀**

