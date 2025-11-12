# 🚀 Quick Start Guide - Magic Link Auth

## For Users

### First Time Sign In

1. Go to: `http://localhost:3000/login2`
2. Enter your email address
3. Click "Send magic link"
4. Check your email
5. Click the link in the email
6. You're signed in! 🎉

### Next Time

Just open the app - you're already signed in! ✨

---

## For Developers

### Frontend Setup

```bash
# 1. Install dependencies
npm install

# 2. Make sure .env has backend URL
# .env should contain:
# NEXT_PUBLIC_API_BASE=http://localhost:8000

# 3. Start frontend
npm run dev

# 4. Open browser
open http://localhost:3000
```

### Backend Requirements

**The backend MUST implement these 2 endpoints:**

#### 1. Send Magic Link
```
POST /auth/magic-link
Body: { "email": "user@example.com", "redirect_to": "http://localhost:3000/auth/callback" }
Response: { "message": "Magic link sent successfully" }
```

#### 2. Verify Token
```
POST /auth/verify-otp
Body: { "token": "token_from_url" }
Response: { "user": {...}, "session": {...} }
```

**See:** `MAGIC_LINK_BACKEND_API.md` for complete API specification

---

## Testing

### Quick Test

```bash
# 1. Start backend on port 8000
# 2. Start frontend on port 3000
npm run dev

# 3. Go to login page
open http://localhost:3000/login2

# 4. Enter email and click "Send magic link"
# 5. Check email and click link
# 6. Should redirect to home page, signed in
```

---

## Files to Share with Backend Developer

📁 **Must Read:**
- `MAGIC_LINK_BACKEND_API.md` - Exact API specification

📁 **Helpful:**
- `MAGIC_LINK_AUTH.md` - Complete implementation guide
- `MAGIC_LINK_COMPLETE.md` - What changed summary

---

## Common Issues

### "Failed to send magic link"
- Check that backend is running on port 8000
- Verify backend has `/auth/magic-link` endpoint
- Check backend logs for errors

### "Token verification failed"
- Check that backend has `/auth/verify-otp` endpoint
- Verify Supabase is configured correctly
- Check that callback URL is whitelisted

### "Redirecting to login after clicking link"
- Check browser console for errors
- Verify tokens are being stored in localStorage
- Check that AuthContext is properly set up

---

## Status

✅ **Frontend:** Complete and ready
⏳ **Backend:** Needs to implement 2 endpoints

Once backend is ready, everything will work! 🚀

---

## Architecture

```
User Flow:
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐
│  Login  │ --> │  Email   │ --> │  Click   │ --> │  Home   │
│  Page   │     │  Sent    │     │  Link    │     │  Page   │
└─────────┘     └──────────┘     └──────────┘     └─────────┘
     ↓                                   ↓
 [Send magic link]              [Verify token]
     ↓                                   ↓
 POST /auth/magic-link         POST /auth/verify-otp
     ↓                                   ↓
 Supabase sends email          Backend returns session
```

---

## Key Points

🔑 **Passwordless** - No passwords needed
📧 **Email-based** - Magic link sent to email
🔒 **Secure** - Tokens expire in 15 minutes
🎯 **Simple** - Just enter email and click link
✨ **Auto-login** - Stay signed in on return visits

---

**Ready to test!** 🎉

