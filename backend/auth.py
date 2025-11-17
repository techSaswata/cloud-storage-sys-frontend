"""
Authentication module using Supabase Auth
Handles user authentication, JWT verification, and user management
"""
import os
from typing import Optional, Dict, Any
from fastapi import HTTPException, Header, Depends, Query
from supabase import create_client, Client
from config import Config


# Initialize Supabase client
def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration not found. Please set SUPABASE_URL and SUPABASE_KEY in .env"
        )
    
    return create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)


def verify_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Verify JWT token and return user information
    
    Args:
        authorization: Authorization header with Bearer token
        
    Returns:
        User information including user_id
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header missing. Please provide a Bearer token."
        )
    
    # Extract token from "Bearer <token>"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication scheme. Use 'Bearer <token>'"
            )
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Use 'Bearer <token>'"
        )
    
    # Verify token with Supabase
    try:
        supabase = get_supabase_client()
        
        # Get user from token
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        
        user = user_response.user
        
        return {
            'user_id': user.id,
            'email': user.email,
            'user_metadata': user.user_metadata or {},
            'created_at': user.created_at
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Token verification failed"
        )


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user
    
    Usage in FastAPI:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            return {"user_id": user['user_id']}
    """
    return verify_token(authorization)


def optional_auth(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """
    Optional authentication - returns user if token provided, None otherwise
    
    Usage:
        @app.get("/public-or-private")
        async def route(user: Optional[dict] = Depends(optional_auth)):
            if user:
                # User is authenticated
                pass
            else:
                # Anonymous access
                pass
    """
    if not authorization:
        return None
    
    try:
        return verify_token(authorization)
    except HTTPException:
        return None


def get_current_user_flexible(
    authorization: Optional[str] = Header(None),
    token: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Get current user from either Authorization header or query parameter
    
    Supports both:
    - Header: Authorization: Bearer <token>
    - Query param: ?token=<token>
    
    This is useful for direct file access (thumbnails, downloads) where
    browsers can't set custom headers.
    
    Args:
        authorization: Authorization header with Bearer token
        token: Token from query parameter
        
    Returns:
        User information including user_id
        
    Raises:
        HTTPException: If token is invalid or missing
    """
    # Try header first, then query parameter
    auth_token = None
    
    if authorization:
        # Extract token from "Bearer <token>"
        try:
            scheme, auth_token = authorization.split()
            if scheme.lower() != 'bearer':
                raise HTTPException(
                    status_code=401,
                    detail="Invalid authentication scheme. Use 'Bearer <token>'"
                )
        except ValueError:
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization header format. Use 'Bearer <token>'"
            )
    elif token:
        # Use query parameter token
        auth_token = token
    else:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide token in Authorization header or ?token= parameter"
        )
    
    # Verify token with Supabase
    try:
        supabase = get_supabase_client()
        
        # Get user from token
        user_response = supabase.auth.get_user(auth_token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token"
            )
        
        user = user_response.user
        
        return {
            'user_id': user.id,
            'email': user.email,
            'user_metadata': user.user_metadata or {},
            'created_at': user.created_at
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Token verification error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Token verification failed"
        )


class AuthService:
    """Authentication service for user management"""
    
    def __init__(self):
        """Initialize auth service"""
        self.supabase = get_supabase_client()
    
    def sign_up(self, email: str, password: str, user_metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Create a new user account
        
        Args:
            email: User email
            password: User password
            user_metadata: Optional user metadata (name, etc.)
            
        Returns:
            User data and session information
        """
        try:
            response = self.supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": user_metadata or {}
                }
            })
            
            if not response.user:
                raise HTTPException(
                    status_code=400,
                    detail="User registration failed"
                )
            
            return {
                'user': {
                    'id': response.user.id,
                    'email': response.user.email,
                    'user_metadata': response.user.user_metadata
                },
                'session': {
                    'access_token': response.session.access_token if response.session else None,
                    'refresh_token': response.session.refresh_token if response.session else None,
                    'expires_at': response.session.expires_at if response.session else None
                }
            }
        
        except Exception as e:
            error_msg = str(e)
            if "already registered" in error_msg.lower():
                raise HTTPException(
                    status_code=400,
                    detail="User with this email already exists"
                )
            raise HTTPException(
                status_code=400,
                detail=f"Sign up failed: {error_msg}"
            )
    
    def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """
        Sign in an existing user (DEPRECATED - Use magic link instead)
        
        Args:
            email: User email
            password: User password
            
        Returns:
            User data and session with access token
        """
        try:
            response = self.supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if not response.user or not response.session:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password"
                )
            
            return {
                'user': {
                    'id': response.user.id,
                    'email': response.user.email,
                    'user_metadata': response.user.user_metadata
                },
                'session': {
                    'access_token': response.session.access_token,
                    'refresh_token': response.session.refresh_token,
                    'expires_at': response.session.expires_at,
                    'expires_in': response.session.expires_in
                }
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed"
            )
    
    def send_magic_link(self, email: str, redirect_to: str) -> Dict[str, Any]:
        """
        Send magic link to user's email for passwordless authentication
        
        Args:
            email: User email address
            redirect_to: URL to redirect to after clicking magic link
            
        Returns:
            Success message with email
        """
        try:
            print(f"🔗 Sending magic link to: {email}")
            print(f"🔗 Redirect URL: {redirect_to}")
            
            response = self.supabase.auth.sign_in_with_otp({
                "email": email,
                "options": {
                    "email_redirect_to": redirect_to
                }
            })
            
            print(f"✅ Magic link sent successfully")
            
            return {
                'message': 'Magic link sent successfully',
                'email': email
            }
        
        except Exception as e:
            error_msg = str(e)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send magic link: {error_msg}"
            )
    
    
    def sign_out(self, token: str) -> Dict[str, Any]:
        """
        Sign out user and invalidate token
        
        Args:
            token: Access token
            
        Returns:
            Success message
        """
        try:
            # Set the session for the user
            self.supabase.auth.sign_out()
            
            return {
                'message': 'Signed out successfully'
            }
        
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Sign out failed: {str(e)}"
            )
    
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Refresh token
            
        Returns:
            New session with fresh access token
        """
        try:
            response = self.supabase.auth.refresh_session()
            
            if not response.session:
                raise HTTPException(
                    status_code=401,
                    detail="Token refresh failed"
                )
            
            return {
                'session': {
                    'access_token': response.session.access_token,
                    'refresh_token': response.session.refresh_token,
                    'expires_at': response.session.expires_at,
                    'expires_in': response.session.expires_in
                }
            }
        
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail="Token refresh failed"
            )
    
    def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """
        Get user information from access token
        
        Args:
            token: Access token
            
        Returns:
            User information
        """
        try:
            response = self.supabase.auth.get_user(token)
            
            if not response.user:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid token"
                )
            
            return {
                'id': response.user.id,
                'email': response.user.email,
                'user_metadata': response.user.user_metadata,
                'created_at': response.user.created_at
            }
        
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail="Failed to get user information"
            )
    
    def update_user(self, token: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user information
        
        Args:
            token: Access token
            updates: Fields to update (email, password, user_metadata)
            
        Returns:
            Updated user information
        """
        try:
            response = self.supabase.auth.update_user(updates)
            
            if not response.user:
                raise HTTPException(
                    status_code=400,
                    detail="User update failed"
                )
            
            return {
                'id': response.user.id,
                'email': response.user.email,
                'user_metadata': response.user.user_metadata
            }
        
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"User update failed: {str(e)}"
            )
    
    def reset_password_email(self, email: str) -> Dict[str, Any]:
        """
        Send password reset email
        
        Args:
            email: User email
            
        Returns:
            Success message
        """
        try:
            self.supabase.auth.reset_password_email(email)
            
            return {
                'message': 'Password reset email sent successfully'
            }
        
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to send reset email: {str(e)}"
            )


# Singleton instance
_auth_service = None

def get_auth_service() -> AuthService:
    """Get or create auth service instance"""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service


if __name__ == "__main__":
    # Test authentication
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "test":
            print("Testing Supabase Auth connection...")
            try:
                client = get_supabase_client()
                print("✓ Successfully connected to Supabase!")
                print(f"  URL: {Config.SUPABASE_URL}")
            except Exception as e:
                print(f"✗ Connection failed: {e}")
    else:
        print("Auth module loaded successfully!")
        print("\nUsage:")
        print("  python auth.py test  - Test Supabase connection")

