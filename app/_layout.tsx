import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { AccountProvider } from '../src/contexts/AccountContext';
import { supabase } from '../src/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Slot, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Create a context to manage the session state specifically for routing
const AuthContext = createContext<{ session: Session | null; loading: boolean }>({ session: null, loading: true });

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Component to handle auth state and routing logic
function AuthStateHandler({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Type assertion for segments
    const safeSegments = segments as string[];

    // Basic check if segments is usable
    if (!Array.isArray(safeSegments)) {
        console.warn('Segments is not an array:', safeSegments);
        return;
    }

    const isAuthRoute = safeSegments.length > 0 && safeSegments[0] === '(auth)';

    console.log('[Auth Check]', { session: !!session, loading, segments: safeSegments, isAuthRoute });

    // If the user is not signed in and not on an auth route, redirect to login.
    if (!session && !isAuthRoute) {
      console.log('[Redirect] Not logged in, outside auth -> /login');
      router.replace('/(auth)/login');
    }
    // If the user is signed in and is on an auth route, redirect to the main app.
    else if (session && isAuthRoute) {
      console.log('[Redirect] Logged in, in auth -> /tabs');
      router.replace('/(tabs)/');
    }
    // Otherwise, the user is either:
    // - Logged in and on a non-auth route (tabs, details, etc.) -> OK, stay.
    // - Not logged in and on an auth route -> OK, stay.

  }, [session, loading, segments, router]); // Keep segments in dependency array

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Add the dynamic key here based on the session
  return <React.Fragment key={session ? 'authed' : 'unauthed'}>{children}</React.Fragment>;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({});

  // Placeholder state for suspicious activity - In real app, get this from backend/profile
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);

  // --- Add session loading state back --- //
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // --- Add effect to load session and listen for changes --- //
  useEffect(() => {
    setAuthLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    }).catch((err) => {
        console.error("Error getting session:", err);
        setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`Auth state changed: ${_event}`, !!session);
      setSession(session);
      // Reset loading on auth change if needed, though getSession handles initial
      if (_event === 'INITIAL_SESSION') setAuthLoading(false);
      if (_event === 'SIGNED_OUT') setAuthLoading(false); // Ensure loading stops on sign out
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (!loaded || authLoading) { // Wait for fonts AND auth session
    return null;
  }

  // Removed AuthStateHandler and AuthContext from here.
  // Authentication logic is likely handled within AccountProvider or a dedicated AuthProvider
  // which should wrap the Drawer navigator.

  // Wrap the entire app in necessary providers
  return (
    <AuthContext.Provider value={{ session, loading: authLoading }}>
      <SafeAreaProvider>
        <AccountProvider>
          <AuthStateHandler>
            <Slot />
          </AuthStateHandler>
        </AccountProvider>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningBanner: {
        backgroundColor: '#FFD700', // Gold/Yellow for warning
        padding: 10,
        alignItems: 'center',
    },
    warningText: {
        color: '#000',
        fontWeight: 'bold',
    }
}); 