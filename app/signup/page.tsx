'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import '../login/login2.css';

export default function SignUpPage() {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email) {
      setError('Enter a valid email address');
      return;
    }

    // Clear any previous errors/success
    setError('');
    setSuccess('');

    // Add click animation
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 300);

    // Start loading
    setIsLoading(true);

    try {
      // Send magic link via Supabase Auth
      await sendMagicLink(email);
      
      // Show success message
      setSuccess('Check your email! We sent you a magic link to get started.');
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to send magic link. Please try again.');
      console.error('Sign up error:', err);
    }
  };

  return (
    <>
      <div className="login-container">
        <div className="login-middle">
          <main className="login-inner">
            <div className="login-logo-container">
              <picture className="login-logo">
                <source srcSet="https://odc.officeapps.live.com/odc/stat/images/hrd/microsoft_logo.svg?b=19419.30550" />
                <img
                  src="https://odc.officeapps.live.com/odc/stat/images/hrd/microsoft_logo.png?b=19419.30550"
                  alt="Microsoft"
                  className="login-logo-img"
                />
              </picture>
            </div>

            <div className="login-content">
              <h1 className="login-title">Create account</h1>

              {error && (
                <div className="login-alert-error" role="alert" aria-live="assertive" aria-atomic="true">
                  {error}
                </div>
              )}

              {success && (
                <div className="login-alert-success" role="alert" aria-live="assertive" aria-atomic="true" style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  backgroundColor: '#dff6dd',
                  border: '1px solid #0f7b0f',
                  borderRadius: '4px',
                  color: '#0f7b0f',
                  fontSize: '14px'
                }}>
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="login-form-row">
                  <div className="login-form-group">
                    <input
                      type="email"
                      className={`login-input ${isEmailFocused || email ? 'has-value' : ''}`}
                      placeholder="Email address"
                      aria-required="true"
                      spellCheck="false"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setIsEmailFocused(true)}
                      onBlur={() => setIsEmailFocused(false)}
                      disabled={isLoading || !!success}
                    />
                  </div>
                </div>

                <div className="login-info-text" style={{ 
                  fontSize: '13px', 
                  color: '#666', 
                  marginTop: '12px',
                  marginBottom: '16px'
                }}>
                  We&apos;ll email you a magic link for a password-free sign in. No passwords needed!
                </div>

                <div className="login-create-account-row">
                  <div className="login-create-account-section">
                    <span className="login-no-account-text">Already have an account?</span>
                    {' '}
                    <Link
                      href="/login"
                      className="login-create-account-link"
                      aria-label="Sign in to your account"
                    >
                      Sign in
                    </Link>
                  </div>
                </div>

                <div className="login-button-container">
                  <button
                    type="submit"
                    className={`login-button-primary ${isClicking ? 'clicking' : ''}`}
                    disabled={isLoading || !!success}
                  >
                    {isLoading ? 'Sending magic link...' : success ? 'Check your email' : 'Get started'}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </div>
      </div>

      <footer className="login-footer">
        <div className="login-footer-content">
          <a href="#" className="login-footer-link">Privacy statement</a>
          <span className="login-footer-text">©2025 Microsoft</span>
        </div>
      </footer>
    </>
  );
}

