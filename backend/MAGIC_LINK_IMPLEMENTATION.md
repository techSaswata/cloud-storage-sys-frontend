# Magic Link Authentication Implementation

## ✅ Backend Implementation Complete

The backend now supports **passwordless magic link authentication** via Supabase Auth.

---

## 🔐 How It Works

### Complete Flow

```
1. User enters email on frontend
   ↓
2. Frontend calls POST /auth/magic-link
   ↓
3. Backend calls Supabase to send magic link email
   ↓
4. Supabase sends email with magic link to user
   ↓
5. User clicks link in email
   ↓
6. Supabase redirects to callback URL with tokens:
   http://localhost:3000/auth/callback?access_token=xxx&refresh_token=yyy&type=magiclink
   ↓
7. Frontend extracts tokens from URL and stores them
   ↓
8. Frontend calls GET /auth/me with access_token to get user info
   ↓
9. User is signed in! ✨
```

**Key Point:** Supabase automatically includes the tokens in the redirect URL - no separate verification endpoint needed!

---

## 📡 API Endpoint

### Send Magic Link

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

**Error Responses:**
```json
// 400 - Missing email
{
  "detail": "Email is required"
}

// 400 - Missing redirect URL
{
  "detail": "Redirect URL is required"
}

// 500 - Server error
{
  "detail": "Failed to send magic link: <error message>"
}
```

---

## 🖥️ Frontend Implementation

### 1. Login Page

```typescript
// Send magic link
const sendMagicLink = async (email: string) => {
  const response = await fetch('http://localhost:8000/auth/magic-link', {
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

### 2. Callback Page

**Important:** Supabase returns tokens in the **URL hash fragment** (`#`), not query parameters (`?`)!

```typescript
// app/auth/callback/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // ⚠️ Important: Tokens are in URL hash, not query params!
        // URL format: callback#access_token=xxx&refresh_token=yyy
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (access_token && refresh_token) {
          // Store tokens in localStorage
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          // Get user info from backend
          const response = await fetch('http://localhost:8000/auth/me', {
            headers: { 'Authorization': `Bearer ${access_token}` },
          });

          if (response.ok) {
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            
            // Redirect to home
            router.push('/home');
          } else {
            throw new Error('Failed to get user info');
          }
        } else {
          throw new Error('No tokens found in URL hash');
        }
      } catch (err: any) {
        console.error('❌ Authentication error:', err);
        router.push('/login');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Verifying your magic link...</p>
      </div>
    </div>
  );
}
```

---

## 🔧 Supabase Configuration

### 1. Email Template Setup

1. Go to your Supabase Dashboard
2. Navigate to: **Authentication → Email Templates**
3. Select: **Magic Link**
4. The template is already configured by Supabase
5. Tokens are automatically included in the redirect URL

### 2. Redirect URL Whitelist ⚠️ REQUIRED!

1. Go to: **Authentication → URL Configuration**
2. Add to **Redirect URLs** (whitelist):
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/*
   ```
   - **No trailing slashes!**
   - Production: `https://yourdomain.com/auth/callback`

### 3. Site URL

Set your site URL in Authentication settings:
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

**⚠️ Without these settings, tokens won't be returned in the callback URL!**

---

## 🧪 Testing

### Test with cURL

```bash
# Send magic link
curl -X POST http://localhost:8000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "redirect_to": "http://localhost:3000/auth/callback"
  }'

# Expected response:
# {
#   "message": "Magic link sent successfully",
#   "email": "test@example.com"
# }
```

### Test Complete Flow

1. Start backend: `python3 api.py`
2. Use frontend to enter email
3. Check email inbox
4. Click magic link
5. Should redirect to: `http://localhost:3000/auth/callback?access_token=xxx&refresh_token=yyy&type=magiclink`
6. Frontend extracts tokens and calls `/auth/me`
7. User is signed in!

---

## 📝 Existing Endpoints (Unchanged)

These endpoints continue to work as before:

- `POST /auth/refresh` - Refresh access token
- `POST /auth/signout` - Sign out user
- `GET /auth/me` - Get current user info
- All file endpoints (`/upload`, `/media`, etc.) - Use Bearer token auth

---

## ✅ Implementation Checklist

- [x] Added `send_magic_link()` method to `auth.py`
- [x] Added `POST /auth/magic-link` endpoint to `api.py`
- [x] Removed unnecessary OTP verification endpoint
- [x] Documented complete flow
- [x] Tested compilation (no syntax errors)

---

## 🎯 Summary

**What Backend Does:**
- Sends magic link via Supabase when `/auth/magic-link` is called
- Supabase handles everything else automatically

**What Frontend Does:**
1. Call `/auth/magic-link` with email
2. User checks email and clicks link
3. Extract `access_token` and `refresh_token` from callback URL
4. Store tokens in localStorage
5. Call `/auth/me` to get user info
6. User is signed in!

**No OTP verification needed** - Supabase returns tokens directly in the redirect URL!

---

## 🚀 Ready to Use!

The backend is now ready for magic link authentication. Just configure your Supabase redirect URLs and test the flow!

