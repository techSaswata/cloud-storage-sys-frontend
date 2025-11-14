'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse tokens from URL hash (not query params!)
        // Supabase returns tokens in hash: #access_token=xxx&refresh_token=yyy
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        console.log('🔍 Full URL:', window.location.href);
        console.log('🔍 Hash fragment:', window.location.hash);
        console.log('🔑 Access token:', access_token ? 'Found' : 'Not found');
        console.log('🔑 Refresh token:', refresh_token ? 'Found' : 'Not found');

        if (access_token && refresh_token) {
          console.log('✅ Tokens received from Supabase magic link');
          
          // Store tokens in localStorage
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          // Get user info from backend
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${access_token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            console.log('📦 Received user data:', data);
            
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('✅ User authenticated:', data.user.email);
            console.log('✅ Tokens saved to localStorage:');
            console.log('   - access_token:', localStorage.getItem('access_token') ? 'SET' : 'NOT SET');
            console.log('   - refresh_token:', localStorage.getItem('refresh_token') ? 'SET' : 'NOT SET');
            console.log('   - user:', localStorage.getItem('user') ? 'SET' : 'NOT SET');
            
            setVerifying(false);
            
            console.log('🔀 Redirecting to /home in 100ms...');
            // Small delay to ensure localStorage is persisted before redirect
            setTimeout(() => {
              window.location.href = '/home';
            }, 100);
          } else {
            const errorText = await response.text();
            console.error('❌ Backend response not ok:', response.status, errorText);
            throw new Error('Failed to get user info from backend');
          }
        } else {
          throw new Error('No tokens found in URL hash. Check Supabase configuration.');
        }
      } catch (err: any) {
        console.error('❌ Authentication error:', err);
        setError(err.message || 'Authentication failed');
        setVerifying(false);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        {verifying ? (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #0078d4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2 style={{ marginBottom: '10px', color: '#333' }}>Verifying...</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Please wait while we verify your magic link.
            </p>
          </>
        ) : error ? (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#d13438',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white',
              fontSize: '24px'
            }}>✕</div>
            <h2 style={{ marginBottom: '10px', color: '#d13438' }}>Authentication Failed</h2>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
              {error}
            </p>
            <p style={{ color: '#666', fontSize: '12px' }}>
              Redirecting to login page...
            </p>
          </>
        ) : (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#107c10',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'white',
              fontSize: '24px'
            }}>✓</div>
            <h2 style={{ marginBottom: '10px', color: '#107c10' }}>Success!</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>
              Redirecting to your dashboard...
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
