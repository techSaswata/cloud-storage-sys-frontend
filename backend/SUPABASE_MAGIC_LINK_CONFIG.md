# Supabase Magic Link Configuration Guide

## 🚨 Issue: No Tokens Found in Callback URL

When users click the magic link, they should be redirected to your callback URL with tokens, but currently getting "No tokens found in URL".

**Root Cause:** Supabase redirect URLs are not whitelisted in your Supabase project settings.

---

## ✅ Fix: Configure Supabase Dashboard

### Step 1: Whitelist Redirect URLs

1. Go to your **Supabase Dashboard**
2. Select your project: `oxcrlwmlpcaeqgouounc`
3. Navigate to: **Authentication → URL Configuration**

4. **Add Redirect URLs:**

   **For Development:**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/*
   ```

   **For Production (later):**
   ```
   https://yourdomain.com/auth/callback
   https://yourdomain.com/*
   ```

5. **Set Site URL:**
   ```
   Development: http://localhost:3000
   Production: https://yourdomain.com
   ```

6. Click **Save**

---

### Step 2: Check Email Settings

1. In Supabase Dashboard, go to: **Authentication → Email Templates**
2. Select **Magic Link** template
3. Verify the confirmation URL is set (it should be by default)
4. Make sure **Enable email confirmations** is configured correctly

---

### Step 3: Check Additional URLs

1. Go to: **Authentication → URL Configuration**
2. Verify these settings:

   ```
   Site URL: http://localhost:3000
   
   Redirect URLs (whitelist):
   - http://localhost:3000/auth/callback
   - http://localhost:3000/*
   ```

3. **Important:** Make sure there are no trailing slashes!

---

## 🔍 How to Verify It's Working

### Test Flow:

1. **Send Magic Link:**
   ```bash
   curl -X POST http://localhost:8000/auth/magic-link \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-email@example.com",
       "redirect_to": "http://localhost:3000/auth/callback"
     }'
   ```

2. **Check Email:**
   - Open the magic link email
   - Look at the link URL - it should look like:
     ```
     https://oxcrlwmlpcaeqgouounc.supabase.co/auth/v1/verify?token=xxx&type=magiclink&redirect_to=http://localhost:3000/auth/callback
     ```

3. **Click the Link:**
   - After clicking, you should be redirected to:
     ```
     http://localhost:3000/auth/callback#access_token=xxx&refresh_token=yyy&...
     ```
   - Notice the `#` (hash) - tokens are in the **hash fragment**, not query parameters!

---

## 📝 Important: Tokens Are in Hash Fragment!

Supabase returns tokens in the **URL hash** (after `#`), not in query parameters (after `?`).

**Wrong expectation:**
```
http://localhost:3000/auth/callback?access_token=xxx&refresh_token=yyy
```

**Correct format:**
```
http://localhost:3000/auth/callback#access_token=xxx&refresh_token=yyy&expires_in=3600&refresh_token=yyy&token_type=bearer&type=magiclink
```

---

## 🔧 Tell Frontend Developer

### Frontend needs to read tokens from URL hash, not query params!

**Current Code (Wrong):**
```typescript
const searchParams = useSearchParams();
const access_token = searchParams.get('access_token');  // ❌ This reads from ?access_token=
const refresh_token = searchParams.get('refresh_token');
```

**Correct Code:**
```typescript
// Read from URL hash fragment
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const access_token = hashParams.get('access_token');  // ✅ Reads from #access_token=
const refresh_token = hashParams.get('refresh_token');
```

**Complete Fix for `app/auth/callback/page.tsx`:**

```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse tokens from URL hash (not query params!)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        console.log('🔍 Hash params:', window.location.hash);
        console.log('🔑 Access token:', access_token ? 'Found' : 'Not found');
        console.log('🔑 Refresh token:', refresh_token ? 'Found' : 'Not found');

        if (access_token && refresh_token) {
          // Store tokens
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);

          // Get user info
          const response = await fetch('http://localhost:8000/auth/me', {
            headers: { 'Authorization': `Bearer ${access_token}` },
          });

          if (response.ok) {
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            console.log('✅ User authenticated:', user.email);
            
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

## 🧪 Testing After Configuration

### 1. Test Magic Link Flow

```bash
# Terminal 1: Backend
cd /Users/techsaswata/Downloads/cloud-storage-sys
python3 api.py

# Terminal 2: Frontend
cd <frontend-directory>
npm run dev
```

### 2. Test Steps

1. Go to: `http://localhost:3000/login`
2. Enter your email
3. Click "Send magic link"
4. Check your email inbox
5. Click the magic link
6. **Open browser console (F12)** and check:
   - URL should have hash fragment: `#access_token=...`
   - Console should log: "🔑 Access token: Found"
   - Should redirect to `/home`

---

## 📋 Checklist

**Backend (You):**
- [x] Implemented `/auth/magic-link` endpoint ✅
- [ ] Configure Supabase Dashboard redirect URLs
- [ ] Add `http://localhost:3000/auth/callback` to whitelist
- [ ] Set Site URL to `http://localhost:3000`

**Frontend Developer:**
- [ ] Update callback page to read from hash (`window.location.hash`)
- [ ] Change from `useSearchParams()` to `new URLSearchParams(window.location.hash.substring(1))`
- [ ] Test the complete flow

---

## 🎯 Quick Summary

**Problem:** Tokens not found in URL  
**Cause:** Frontend reading from wrong place (query params instead of hash)  
**Fix:** 
1. You: Configure Supabase redirect URLs in dashboard
2. Frontend: Read tokens from `window.location.hash` instead of `searchParams`

---

## 🔗 Supabase Dashboard Link

Your project: https://supabase.com/dashboard/project/oxcrlwmlpcaeqgouounc

Go to: **Authentication → URL Configuration** and add the redirect URLs!

---

## ✅ After Configuration

Once configured, the flow will work:
1. User enters email ✅
2. Magic link sent ✅
3. User clicks link → Redirected with tokens in hash ✅
4. Frontend reads tokens from hash ✅
5. User signed in! 🎉


