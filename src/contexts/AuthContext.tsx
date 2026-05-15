import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'organizer' | 'user' | 'student';

const OTP_PENDING_KEY = 'otp_pending';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  department?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  otpPending: boolean;
  signUp: (email: string, password: string, name: string, department: string, role?: UserRole) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (code: string) => Promise<{ error: string | null }>;
  resendOtp: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otpPending, setOtpPending] = useState<boolean>(
    () => sessionStorage.getItem(OTP_PENDING_KEY) === 'true'
  );

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData) {
        setRole(roleData.role as UserRole);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          // Clear OTP flag on sign-out
          sessionStorage.removeItem(OTP_PENDING_KEY);
          setOtpPending(false);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string, department: string, role: UserRole = 'user') => {
    const redirectUrl = `https://final-project-presentation.vercel.app/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name, department, role }
      }
    });

    return { error };
  };

  /** Dispatches the send-otp Edge Function for the current user */
  const dispatchOtp = async (currentUser: User): Promise<{ error: string | null; fallbackCode?: string; emailSent?: boolean }> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

      const { data: { session: currentSession } } = await supabase.auth.getSession();

      const resp = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession?.access_token ?? anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          user_id: currentUser.id,
          email: currentUser.email,
          name: currentUser.user_metadata?.name || profile?.name || 'there',
        }),
      });

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        return { error: body.error || 'Failed to send OTP' };
      }

      const body = await resp.json().catch(() => ({}));
      return { error: null, fallbackCode: body.otp_code, emailSent: body.email_sent };
    } catch (err: any) {
      console.error('dispatchOtp error:', err);
      return { error: err.message || 'Failed to send OTP' };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return { error };

    // Credentials valid — gate with OTP
    sessionStorage.setItem(OTP_PENDING_KEY, 'true');
    setOtpPending(true);

    // Await OTP dispatch so we can surface the fallback code when email isn't configured
    if (data.user) {
      const otpResult = await dispatchOtp(data.user).catch(() => ({ error: null }));
      if (otpResult.fallbackCode && !otpResult.emailSent) {
        // Store fallback code so OtpVerificationPage can display it
        sessionStorage.setItem('otp_fallback_code', otpResult.fallbackCode);
      } else {
        sessionStorage.removeItem('otp_fallback_code');
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    sessionStorage.removeItem(OTP_PENDING_KEY);
    setOtpPending(false);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `https://final-project-presentation.vercel.app/reset-password`,
    });
    return { error };
  };

  /** Verify an OTP code entered by the user */
  const verifyOtp = async (code: string): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };

    const trimmedCode = code.trim();

    // 1. Fetch the latest unverified OTP for this user
    const { data: otpRow, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      return { error: 'Failed to validate OTP. Please try again.' };
    }

    if (!otpRow) {
      return { error: 'No active OTP found. Please request a new code.' };
    }

    // 2. Check lockout (5 attempts)
    if (otpRow.attempt_count >= 5) {
      return { error: 'Too many failed attempts. Please request a new OTP.' };
    }

    // 3. Check expiry
    if (new Date(otpRow.expires_at) < new Date()) {
      return { error: 'OTP has expired. Please request a new code.' };
    }

    // 4. Check the code
    if (otpRow.otp_code !== trimmedCode) {
      // Increment attempt count
      await supabase
        .from('otp_verifications')
        .update({ attempt_count: otpRow.attempt_count + 1 })
        .eq('id', otpRow.id);

      const remaining = 4 - otpRow.attempt_count;
      if (remaining <= 0) {
        return { error: 'Too many failed attempts. Please request a new OTP.' };
      }
      return { error: `Invalid OTP. Please try again. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining)` };
    }

    // 5. Mark as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRow.id);

    if (updateError) {
      return { error: 'Verification failed. Please try again.' };
    }

    // 6. Clear the gate
    sessionStorage.removeItem(OTP_PENDING_KEY);
    setOtpPending(false);

    return { error: null };
  };

  /** Re-send a fresh OTP to the user */
  const resendOtp = async (): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    return dispatchOtp(user);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      role,
      isAuthenticated: !!session,
      isLoading,
      otpPending,
      signUp,
      signIn,
      signOut,
      resetPassword,
      verifyOtp,
      resendOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
