# Deployment Guide for Vercel

## Magic Link Configuration

### 1. Configure Supabase Redirect URLs

**IMPORTANT:** You must whitelist your redirect URLs in Supabase before magic links will work.

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `oxcrlwmlpcaeqgouounc`
3. Navigate to: **Authentication** → **URL Configuration**
4. In **Redirect URLs**, add:
   ```
   http://localhost:3000/auth/callback
   https://your-app.vercel.app/auth/callback
   https://your-custom-domain.com/auth/callback
   ```
5. Save the changes

### 2. Set Vercel Environment Variables

In your Vercel project settings:

**Project Settings → Environment Variables**

Add the following variables:

```bash
# Backend API URL (your deployed backend)
NEXT_PUBLIC_API_BASE=https://your-backend-url.com

# Frontend App URL (your Vercel deployment URL)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Or if you have a custom domain:
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Test Magic Links Locally with Vercel URL

If you want to test magic links from localhost but have them redirect to your Vercel deployment:

1. Edit your `.env` file:
   ```bash
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

2. Request a magic link from localhost
3. The email will contain a link that redirects to your Vercel URL
4. Don't forget to remove/comment this line when done testing

### 4. Debugging Magic Links

When you request a magic link, check the browser console:

```
🔗 Sending magic link with redirect URL: https://your-app.vercel.app/auth/callback
✅ Magic link sent: your@email.com
📧 Check your email for the magic link
```

On the backend, you should see:

```
🔗 Sending magic link to: your@email.com
🔗 Redirect URL: https://your-app.vercel.app/auth/callback
✅ Magic link sent successfully
```

### 5. Common Issues

**Issue:** Magic link shows `redirect_to=http://localhost:3000`

**Solutions:**
- If testing from localhost: This is expected behavior
- If testing from Vercel: Check that `NEXT_PUBLIC_APP_URL` is set in Vercel environment variables
- Make sure the redirect URL is whitelisted in Supabase (step 1)

**Issue:** Magic link redirects but shows "Invalid token" or similar error

**Solutions:**
- Verify the redirect URL in Supabase matches exactly (including `/auth/callback`)
- Check backend logs to ensure the correct URL was sent
- Try clearing browser cache and localStorage

**Issue:** Magic link doesn't redirect at all

**Solutions:**
- Verify Supabase redirect URLs are configured correctly
- Check that the URL is whitelisted (Supabase will block unlisted URLs)
- Look for errors in browser console on the callback page

## Complete Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] `NEXT_PUBLIC_API_BASE` set in Vercel
- [ ] `NEXT_PUBLIC_APP_URL` set in Vercel
- [ ] All Supabase credentials set in Vercel
- [ ] Redirect URLs whitelisted in Supabase
- [ ] Test magic link from production URL
- [ ] Verify auth callback works correctly

## Backend Deployment

Make sure your backend is also deployed and accessible. Common options:

- **Railway:** Easy Python deployment
- **Render:** Free tier available
- **Heroku:** Classic choice
- **AWS/GCP/Azure:** For production use

Update `NEXT_PUBLIC_API_BASE` to point to your deployed backend URL.


