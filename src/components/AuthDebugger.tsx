import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthDebugger() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('=== AUTH DEBUGGER ===');
        
        // Check environment variables
        const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
        const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        console.log('Environment variables:', {
          hasUrl,
          hasKey,
          url: import.meta.env.VITE_SUPABASE_URL?.substring(0, 20) + '...',
          keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length
        });

        // Check Supabase client
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Current session:', { session: !!session, error: sessionError });

        // Check if we can connect to Supabase
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        console.log('Database connection test:', { success: !error, error });

        setDebugInfo({
          hasUrl,
          hasKey,
          session: !!session,
          sessionError,
          dbConnection: !error,
          dbError: error?.message,
          userEmail: session?.user?.email || 'Not signed in'
        });

      } catch (error) {
        console.error('Auth debug error:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs font-mono max-w-sm">
      <div className="font-bold mb-2">🔍 Auth Debug Info</div>
      <div>URL: {debugInfo.hasUrl ? '✅' : '❌'}</div>
      <div>Key: {debugInfo.hasKey ? '✅' : '❌'}</div>
      <div>Session: {debugInfo.session ? '✅' : '❌'}</div>
      <div>DB: {debugInfo.dbConnection ? '✅' : '❌'}</div>
      <div>User: {debugInfo.userEmail}</div>
      {debugInfo.sessionError && <div className="text-red-300">Session Error: {debugInfo.sessionError.message}</div>}
      {debugInfo.dbError && <div className="text-red-300">DB Error: {debugInfo.dbError}</div>}
      {debugInfo.error && <div className="text-red-300">Error: {debugInfo.error}</div>}
    </div>
  );
}
