# 🔐 Authentication Guide

**Complete authentication and authorization guide for frontend developers**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Authentication Endpoints](#authentication-endpoints)
4. [Using Authentication Tokens](#using-authentication-tokens)
5. [Changes to Existing APIs](#changes-to-existing-apis)
6. [Frontend Implementation](#frontend-implementation)
7. [Error Handling](#error-handling)
8. [Security Best Practices](#security-best-practices)

---

## Overview

### 🎯 What Changed?

**All file operations now require authentication!**

- **Before**: Anyone could upload/download/delete files
- **After**: Users must be logged in and can only access their own files

### 🔑 Key Features

✅ **Supabase Auth Integration** - Secure, production-ready authentication  
✅ **JWT Tokens** - Industry-standard token-based auth  
✅ **User Isolation** - Each user only sees their own files  
✅ **Automatic Token Verification** - Server handles all security  
✅ **Token Refresh** - Seamless session management  

---

## Authentication Flow

```
1. User Signs Up/Signs In
         ↓
2. Server returns access_token + refresh_token
         ↓
3. Frontend stores tokens (localStorage/cookies)
         ↓
4. Include access_token in all API requests
         ↓
5. Server verifies token + checks ownership
         ↓
6. User gets their files only
```

---

## Authentication Endpoints

### 1. Sign Up (Register)

**Endpoint:** `POST /auth/signup`

**Description:** Create a new user account

**Request:**

```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"  // optional
}
```

**JavaScript Example:**

```javascript
async function signUp(email, password, name = null) {
  const response = await fetch('http://localhost:8000/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      name
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('access_token', data.session.access_token);
  localStorage.setItem('refresh_token', data.session.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
}

// Usage
try {
  const result = await signUp('user@example.com', 'MyPassword123!', 'John Doe');
  console.log('Signed up:', result.user.email);
  // Redirect to dashboard
  window.location.href = '/dashboard';
} catch (error) {
  alert('Sign up failed: ' + error.message);
}
```

**Response (Success - 200 OK):**

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe"
    }
  },
  "session": {
    "access_token": "eyJhbGc...long_jwt_token",
    "refresh_token": "refresh_token_here",
    "expires_at": 1699564800,
    "expires_in": 3600
  }
}
```

---

### 2. Sign In (Login)

**Endpoint:** `POST /auth/signin`

**Description:** Authenticate existing user

**Request:**

```http
POST /auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**JavaScript Example:**

```javascript
async function signIn(email, password) {
  const response = await fetch('http://localhost:8000/auth/signin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('access_token', data.session.access_token);
  localStorage.setItem('refresh_token', data.session.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
}

// Usage
try {
  const result = await signIn('user@example.com', 'MyPassword123!');
  console.log('Signed in:', result.user.email);
  window.location.href = '/dashboard';
} catch (error) {
  alert('Sign in failed: ' + error.message);
}
```

**Response (Success - 200 OK):**

```json
{
  "message": "Signed in successfully",
  "user": {
    "id": "user_abc123",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe"
    }
  },
  "session": {
    "access_token": "eyJhbGc...long_jwt_token",
    "refresh_token": "refresh_token_here",
    "expires_at": 1699564800,
    "expires_in": 3600
  }
}
```

---

### 3. Sign Out (Logout)

**Endpoint:** `POST /auth/signout`

**Description:** Invalidate current session

**Request:**

```http
POST /auth/signout
Authorization: Bearer {access_token}
```

**JavaScript Example:**

```javascript
async function signOut() {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch('http://localhost:8000/auth/signout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // Clear local storage
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  
  // Redirect to login
  window.location.href = '/login';
}
```

**Response (Success - 200 OK):**

```json
{
  "message": "Signed out successfully"
}
```

---

### 4. Refresh Token

**Endpoint:** `POST /auth/refresh`

**Description:** Get a new access token using refresh token

**Request:**

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "your_refresh_token"
}
```

**JavaScript Example:**

```javascript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  
  const response = await fetch('http://localhost:8000/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    // Refresh failed, redirect to login
    localStorage.clear();
    window.location.href = '/login';
    return null;
  }

  const data = await response.json();
  
  // Update tokens
  localStorage.setItem('access_token', data.session.access_token);
  localStorage.setItem('refresh_token', data.session.refresh_token);
  
  return data.session.access_token;
}
```

**Response (Success - 200 OK):**

```json
{
  "message": "Token refreshed successfully",
  "session": {
    "access_token": "eyJhbGc...new_jwt_token",
    "refresh_token": "new_refresh_token",
    "expires_at": 1699568400,
    "expires_in": 3600
  }
}
```

---

### 5. Get Current User

**Endpoint:** `GET /auth/me`

**Description:** Get information about the authenticated user

**Request:**

```http
GET /auth/me
Authorization: Bearer {access_token}
```

**JavaScript Example:**

```javascript
async function getCurrentUser() {
  const token = localStorage.getItem('access_token');
  
  const response = await fetch('http://localhost:8000/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Not authenticated');
  }

  const data = await response.json();
  return data.user;
}
```

**Response (Success - 200 OK):**

```json
{
  "user": {
    "user_id": "user_abc123",
    "email": "user@example.com",
    "user_metadata": {
      "name": "John Doe"
    },
    "created_at": "2025-11-12T10:00:00Z"
  }
}
```

---

## Using Authentication Tokens

### 🔑 How to Include Tokens in Requests

**All protected endpoints now require an `Authorization` header:**

```http
Authorization: Bearer {access_token}
```

### JavaScript Helper Function

```javascript
// Get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  return {
    'Authorization': `Bearer ${token}`
  };
}

// Use in fetch requests
async function makeAuthenticatedRequest(url, options = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Handle 401 (token expired)
  if (response.status === 401) {
    // Try to refresh token
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry request with new token
      headers['Authorization'] = `Bearer ${newToken}`;
      return await fetch(url, {
        ...options,
        headers
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }
  
  return response;
}
```

---

## Changes to Existing APIs

### 🚨 **ALL FILE OPERATIONS NOW REQUIRE AUTHENTICATION**

### Upload Endpoints

#### ❌ Before (No Auth):
```javascript
const formData = new FormData();
formData.append('file', file);

await fetch('/upload', {
  method: 'POST',
  body: formData
});
```

#### ✅ After (With Auth):
```javascript
const formData = new FormData();
formData.append('file', file);

await fetch('/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  },
  body: formData
});
```

### Batch Upload

#### ✅ New Way (With Auth):
```javascript
const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('batch_name', 'My Files');

await fetch('/upload/batch', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  },
  body: formData
});
```

**Note:** `user_id` is now **automatic** - removed from form parameters!

---

### Retrieval Endpoints

All retrieval endpoints now require authentication and automatically filter by user:

#### Get File Info
```javascript
// Before: Anyone could access any file
// After: Only returns if user owns the file

const fileId = 'file_123';
const response = await fetch(`/media/${fileId}`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});

// Returns 403 if user doesn't own the file
```

#### Download File
```javascript
// Must be authenticated
window.location.href = `/media/${fileId}/download?token=${localStorage.getItem('access_token')}`;

// Or use fetch
const response = await fetch(`/media/${fileId}/download`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

#### Get Direct URL
```javascript
const response = await fetch(`/media/${fileId}/url?expires_in=3600`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
const { url } = await response.json();
document.getElementById('img').src = url;
```

#### Get Thumbnail
```javascript
// For <img> tags, you can't set headers, so use URL parameter
<img src={`/media/${fileId}/thumbnail?size=300&token=${access_token}`} />

// Or fetch first then use blob URL
const response = await fetch(`/media/${fileId}/thumbnail?size=300`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
document.getElementById('img').src = url;
```

#### List Files
```javascript
// Before: Returned ALL files from ALL users
// After: Returns only authenticated user's files

const response = await fetch('/media?limit=50', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
const { files } = await response.json();
// files = only your files!
```

---

### Batch Endpoints

#### Get Batch Status
```javascript
const response = await fetch(`/batch/${batchId}`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
// Returns 403 if user doesn't own the batch
```

#### List Batches
```javascript
// Before: Could filter by user_id parameter
// After: Automatically filtered to authenticated user

const response = await fetch('/batches?limit=20', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
// Returns only your batches
```

#### Delete Batch
```javascript
const response = await fetch(`/batch/${batchId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
// Only deletes if you own the batch
```

---

### Search Endpoints

#### Text Search
```javascript
// Before: Searched ALL files
// After: Searches only authenticated user's files

const response = await fetch(`/search/text?query=sunset&top_k=10`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
// Results = only your files matching "sunset"
```

#### Image Search
```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('top_k', '10');

const response = await fetch('/search/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  },
  body: formData
});
// Results = only your similar files
```

---

## Frontend Implementation

### Complete Authentication System (React)

```jsx
import React, { createContext, useState, useContext, useEffect } from 'react';

// Auth Context
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  async function signUp(email, password, name) {
    const response = await fetch('http://localhost:8000/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail);
    }

    const data = await response.json();
    
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    setUser(data.user);
    return data;
  }

  async function signIn(email, password) {
    const response = await fetch('http://localhost:8000/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail);
    }

    const data = await response.json();
    
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    setUser(data.user);
    return data;
  }

  async function signOut() {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      await fetch('http://localhost:8000/auth/signout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    
    setUser(null);
  }

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// Protected Route Component
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    window.location.href = '/login';
    return null;
  }

  return children;
}

// API Helper with Auth
export async function apiCall(url, options = {}) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    ...options.headers
  };

  let response = await fetch(url, {
    ...options,
    headers
  });

  // Handle token expiration
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      // Try to refresh
      const refreshResponse = await fetch('http://localhost:8000/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        localStorage.setItem('access_token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
        
        // Retry original request
        headers['Authorization'] = `Bearer ${data.session.access_token}`;
        response = await fetch(url, {
          ...options,
          headers
        });
      } else {
        // Refresh failed
        localStorage.clear();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    } else {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Not authenticated');
    }
  }

  return response;
}
```

### Usage in Components

```jsx
// Login Page
function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await signIn(email, password);
      window.location.href = '/dashboard';
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Sign In</button>
    </form>
  );
}

// File Upload Component
function FileUploader() {
  const [file, setFile] = useState(null);

  async function handleUpload() {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiCall('http://localhost:8000/upload', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('Uploaded:', result);
  }

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}

// File List Component
function FileList() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    async function loadFiles() {
      const response = await apiCall('http://localhost:8000/media?limit=50');
      const data = await response.json();
      setFiles(data.media);
    }
    loadFiles();
  }, []);

  return (
    <div>
      {files.map(file => (
        <div key={file.file_id}>
          <h3>{file.filename}</h3>
          <button onClick={() => downloadFile(file.file_id)}>Download</button>
        </div>
      ))}
    </div>
  );
}

async function downloadFile(fileId) {
  const response = await apiCall(`http://localhost:8000/media/${fileId}/download`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'file';
  a.click();
}
```

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "detail": "Authorization header missing. Please provide a Bearer token."
}
```
**Solution:** Include `Authorization: Bearer {token}` header

#### 403 Forbidden
```json
{
  "detail": "You don't have permission to access this file"
}
```
**Solution:** User doesn't own this file - this is expected behavior

#### 404 Not Found
```json
{
  "detail": "File not found: file_123"
}
```
**Solution:** File doesn't exist or was deleted

---

## Security Best Practices

### ✅ DO

1. **Store tokens in localStorage or secure cookies**
2. **Always use HTTPS in production**
3. **Refresh tokens before they expire**
4. **Clear tokens on logout**
5. **Handle 401 errors gracefully**
6. **Never share tokens between users**

### ❌ DON'T

1. **Never store tokens in plain text files**
2. **Don't expose tokens in URLs (use headers)**
3. **Don't ignore 403 errors (respect permissions)**
4. **Don't hardcode tokens in code**
5. **Don't share refresh tokens**

---

## Quick Reference

### All Protected Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/upload` | POST | ✅ | Upload single file |
| `/upload/batch` | POST | ✅ | Upload multiple files |
| `/media` | GET | ✅ | List user's files |
| `/media/{file_id}` | GET | ✅ | Get file info |
| `/media/{file_id}/download` | GET | ✅ | Download file |
| `/media/{file_id}/url` | GET | ✅ | Get direct URL |
| `/media/{file_id}/thumbnail` | GET | ✅ | Get thumbnail |
| `/media/{file_id}` | DELETE | ✅ | Delete file |
| `/search/text` | POST | ✅ | Search by text |
| `/search/image` | POST | ✅ | Search by image |
| `/batch/{id}` | GET | ✅ | Get batch status |
| `/batch/{id}/files` | GET | ✅ | Get batch files |
| `/batch/{id}` | DELETE | ✅ | Delete batch |
| `/batches` | GET | ✅ | List user's batches |

### Auth Endpoints (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signup` | POST | Register new user |
| `/auth/signin` | POST | Login |
| `/auth/signout` | POST | Logout (token required) |
| `/auth/refresh` | POST | Refresh access token |
| `/auth/me` | GET | Get current user (token required) |

---

## Migration Checklist

✅ Update all file upload calls to include `Authorization` header  
✅ Update all file retrieval calls to include `Authorization` header  
✅ Update batch operations to include `Authorization` header  
✅ Remove `user_id` from batch upload parameters (now automatic)  
✅ Implement sign up/sign in UI  
✅ Store tokens securely  
✅ Handle token expiration (401 errors)  
✅ Redirect to login if not authenticated  
✅ Clear tokens on logout  
✅ Test file isolation (users can't see each other's files)  

---

**Last Updated:** 2025-11-12  
**Auth System:** Supabase Auth with JWT  
**Status:** ✅ Production Ready

