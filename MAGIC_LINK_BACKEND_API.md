# Backend API Specification for Magic Link Authentication

## Quick Reference for Backend Developer

This document specifies the exact API endpoints the frontend expects for magic link authentication.

---

## 🔑 New Endpoints Required

### 1. Send Magic Link

**Endpoint:** `POST /auth/magic-link`

**Purpose:** Send a magic link email to the user

**Request Body:**
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
// 400 - Invalid email
{
  "detail": "Invalid email address"
}

// 429 - Rate limit
{
  "detail": "Too many requests. Please try again later."
}

// 500 - Server error
{
  "detail": "Failed to send email. Please try again."
}
```

**Backend Implementation Example (Python/FastAPI):**
```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client

router = APIRouter()

class MagicLinkRequest(BaseModel):
    email: EmailStr
    redirect_to: str

@router.post("/auth/magic-link")
async def send_magic_link(data: MagicLinkRequest):
    """Send magic link to user's email"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Send magic link via Supabase Auth
        response = supabase.auth.sign_in_with_otp({
            "email": data.email,
            "options": {
                "email_redirect_to": data.redirect_to
            }
        })
        
        return {
            "message": "Magic link sent successfully",
            "email": data.email
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send magic link: {str(e)}"
        )
```

---

### 2. Verify OTP Token

**Endpoint:** `POST /auth/verify-otp`

**Purpose:** Verify the magic link token and create a session

**Request Body:**
```json
{
  "token": "otp_token_from_magic_link_url"
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
    "expires_at": 1734012345,
    "expires_in": 3600
  }
}
```

**Error Responses:**

```json
// 401 - Invalid or expired token
{
  "detail": "Invalid or expired token"
}

// 400 - Missing token
{
  "detail": "Token is required"
}
```

**Backend Implementation Example (Python/FastAPI):**
```python
class OtpVerifyRequest(BaseModel):
    token: str

@router.post("/auth/verify-otp")
async def verify_otp(data: OtpVerifyRequest):
    """Verify magic link token and create session"""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Verify the OTP token
        response = supabase.auth.verify_otp({
            "token": data.token,
            "type": "magiclink"
        })
        
        if not response.user or not response.session:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        
        return {
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata or {},
                "created_at": response.user.created_at
            },
            "session": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "expires_in": response.session.expires_in
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Token verification failed: {str(e)}"
        )
```

---

## 🔄 Existing Endpoints (Keep As-Is)

These endpoints should remain unchanged:

### 1. Sign Out
**Endpoint:** `POST /auth/signout`
**Headers:** `Authorization: Bearer <access_token>`

### 2. Refresh Token
**Endpoint:** `POST /auth/refresh`
**Body:** `{"refresh_token": "..."}`

### 3. Get Current User
**Endpoint:** `GET /auth/me`
**Headers:** `Authorization: Bearer <access_token>`

### 4. All File Endpoints
All existing file endpoints (`/upload`, `/media`, etc.) continue to work the same way with Bearer token authentication.

---

## 🔐 Supabase Configuration

### Email Template Setup

1. Go to Supabase Dashboard
2. Navigate to: **Authentication → Email Templates**
3. Select: **Magic Link**
4. Customize the template:

```html
<h2>Sign in to OneDrive Clone</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link expires in 15 minutes.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

5. Set redirect URL in Supabase:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://yourdomain.com/auth/callback`

### Supabase Auth Settings

In your Supabase project settings:

```
Authentication → URL Configuration

Site URL: http://localhost:3000 (dev) or https://yourdomain.com (prod)

Redirect URLs (whitelist):
- http://localhost:3000/auth/callback
- https://yourdomain.com/auth/callback
```

---

## 📝 Frontend Callback Handling

The frontend callback page (`/auth/callback`) expects tokens in one of two formats:

### Format 1: Direct Tokens in URL (Preferred)
```
http://localhost:3000/auth/callback?access_token=xxx&refresh_token=yyy&type=magiclink
```

Frontend will:
1. Extract tokens from URL
2. Store in localStorage
3. Call `/auth/me` to get user info
4. Redirect to /home

### Format 2: OTP Token
```
http://localhost:3000/auth/callback?token=otp_token_here
```

Frontend will:
1. Extract token from URL
2. Call `POST /auth/verify-otp` with token
3. Store returned tokens and user
4. Redirect to /home

**Recommendation:** Use Format 2 (OTP token) as it's more secure and gives backend control over session creation.

---

## 🧪 Testing with cURL

### 1. Test Send Magic Link

```bash
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

### 2. Test Verify OTP

```bash
# Get token from email link (e.g., ?token=abc123xyz)
TOKEN="abc123xyz"

curl -X POST http://localhost:8000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"

# Expected response:
# {
#   "user": {...},
#   "session": {
#     "access_token": "...",
#     "refresh_token": "...",
#     ...
#   }
# }
```

---

## 🚨 Important Security Notes

### Rate Limiting
Implement rate limiting on `/auth/magic-link`:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/magic-link")
@limiter.limit("5/hour")  # Max 5 magic links per hour per IP
async def send_magic_link(data: MagicLinkRequest):
    # ...
```

### Token Expiration
- Magic links should expire after 15 minutes (Supabase default)
- Tokens are one-time use only
- Validate tokens server-side with Supabase

### Email Validation
- Validate email format
- Check for disposable email domains (optional)
- Sanitize email input

---

## ✅ Checklist for Backend Developer

- [ ] Implement `POST /auth/magic-link` endpoint
- [ ] Implement `POST /auth/verify-otp` endpoint
- [ ] Configure Supabase email templates
- [ ] Add redirect URLs to Supabase whitelist
- [ ] Test magic link sending
- [ ] Test token verification
- [ ] Add rate limiting to prevent spam
- [ ] Keep existing `/auth/refresh` endpoint
- [ ] Keep existing `/auth/signout` endpoint
- [ ] Keep existing `/auth/me` endpoint
- [ ] All file endpoints continue to work with Bearer tokens

---

## 🎯 Summary

**Two new endpoints needed:**
1. `POST /auth/magic-link` - Sends magic link to email
2. `POST /auth/verify-otp` - Verifies token and returns session

**Everything else stays the same:**
- File operations still use Bearer token auth
- Token refresh still works
- Sign out still works
- User isolation still enforced

**The flow:**
```
User enters email → Backend sends magic link → User clicks link → 
Frontend calls verify-otp → Backend returns session → User signed in ✨
```

---

## 📞 Questions?

If the backend team has questions about:
- Supabase Auth configuration
- Token formats
- Error handling
- Security considerations

Refer them to:
- `MAGIC_LINK_AUTH.md` - Complete implementation guide
- Supabase Auth Docs: https://supabase.com/docs/guides/auth/auth-magic-link
- This document for exact API specifications

---

**Implementation Status:** ✅ Frontend ready, waiting for backend endpoints.

