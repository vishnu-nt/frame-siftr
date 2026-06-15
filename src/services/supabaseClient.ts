import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Check if we have valid-looking credentials
const hasValidCredentials =
  !!supabaseUrl &&
  !!supabasePublishableKey &&
  supabaseUrl !== "https://your-project-id.supabase.co" &&
  supabasePublishableKey !== "your-publishable-key-here" &&
  supabaseUrl.trim() !== "" &&
  supabasePublishableKey.trim() !== "";


export const isMockAuth = !hasValidCredentials;

// Define the interface for the Auth API we want to expose
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "USER_UPDATED"
  | "TOKEN_REFRESHED";

type SubscriptionCallback = (
  event: AuthChangeEvent,
  session: AuthSession | null,
) => void;

class MockAuthService {
  private listeners: Set<SubscriptionCallback> = new Set();
  private currentSession: AuthSession | null = null;

  constructor() {
    // Load session from localStorage on startup
    const stored = localStorage.getItem("framesiftr_mock_session");
    if (stored) {
      try {
        this.currentSession = JSON.parse(stored);
      } catch (e) {
        localStorage.removeItem("framesiftr_mock_session");
      }
    }
  }

  private triggerChange(event: AuthChangeEvent) {
    this.listeners.forEach((cb) => cb(event, this.currentSession));
  }

  async getSession() {
    return { data: { session: this.currentSession }, error: null };
  }

  async signUp({ email, password }: { email: string; password?: string }) {
    if (!email || !password) {
      return {
        data: { user: null, session: null },
        error: new Error("Email and password required"),
      };
    }
    // Simple verification
    const users = JSON.parse(
      localStorage.getItem("framesiftr_mock_users") || "[]",
    );
    if (users.some((u: any) => u.email === email)) {
      return {
        data: { user: null, session: null },
        error: new Error("User already exists in mock database"),
      };
    }

    const newUser = {
      id: Math.random().toString(36).substring(2, 11),
      email,
      created_at: new Date().toISOString(),
      password, // Stored in plaintext only in localStorage for mock developer sandbox
    };
    users.push(newUser);
    localStorage.setItem("framesiftr_mock_users", JSON.stringify(users));

    // Sign in user automatically
    const session: AuthSession = {
      access_token: "mock-token-" + Math.random().toString(36).substring(2, 11),
      user: {
        id: newUser.id,
        email: newUser.email,
        created_at: newUser.created_at,
      },
    };
    this.currentSession = session;
    localStorage.setItem("framesiftr_mock_session", JSON.stringify(session));
    this.triggerChange("SIGNED_IN");

    return { data: { user: newUser, session }, error: null };
  }

  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password?: string;
  }) {
    if (!email || !password) {
      return {
        data: { user: null, session: null },
        error: new Error("Email and password required"),
      };
    }
    const users = JSON.parse(
      localStorage.getItem("framesiftr_mock_users") || "[]",
    );
    const user = users.find(
      (u: any) => u.email === email && u.password === password,
    );
    if (!user) {
      return {
        data: { user: null, session: null },
        error: new Error("Invalid email or password in mock database"),
      };
    }

    const session: AuthSession = {
      access_token: "mock-token-" + Math.random().toString(36).substring(2, 11),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    };
    this.currentSession = session;
    localStorage.setItem("framesiftr_mock_session", JSON.stringify(session));
    this.triggerChange("SIGNED_IN");

    return { data: { user, session }, error: null };
  }

  async signOut() {
    this.currentSession = null;
    localStorage.removeItem("framesiftr_mock_session");
    this.triggerChange("SIGNED_OUT");
    return { error: null };
  }

  onAuthStateChange(callback: SubscriptionCallback) {
    this.listeners.add(callback);
    // Call initially
    callback("INITIAL_SESSION", this.currentSession);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners.delete(callback);
          },
        },
      },
    };
  }
}

// Make a mock client that matches supabase auth structure
class MockSupabaseClient {
  auth = new MockAuthService();
}

// Export the real supabase client or our mock client
export const supabase = hasValidCredentials
  ? createClient(supabaseUrl, supabasePublishableKey)
  : (new MockSupabaseClient() as any);
