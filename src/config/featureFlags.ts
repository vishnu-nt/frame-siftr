// Feature flags derived from Vite env vars. See .env.example for details.

// Gates Sign In / Create Account, the AuthForm modal, and the session-gated
// app entry. Default (VITE_ENABLE_AUTH unset): false — app is fully open.
// Set VITE_ENABLE_AUTH=true to require authentication again.
export const AUTH_ENABLED = import.meta.env.VITE_ENABLE_AUTH === 'true';
