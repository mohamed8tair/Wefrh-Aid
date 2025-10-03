import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Missing Supabase configuration. Please check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'humanitarian-relief-auth',
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'humanitarian-relief-system',
    },
  },
});

export const checkConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('beneficiaries').select('count', { count: 'exact', head: true });
    return !error;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};

export const getProjectInfo = async () => {
  try {
    const isConnected = await checkConnection();

    if (!isConnected) {
      return {
        connected: false,
        url: supabaseUrl,
        hasData: false,
        error: 'فشل الاتصال بقاعدة البيانات'
      };
    }

    const { count, error } = await supabase
      .from('beneficiaries')
      .select('*', { count: 'exact', head: true });

    return {
      connected: true,
      url: supabaseUrl,
      hasData: (count ?? 0) > 0,
      beneficiariesCount: count ?? 0,
      error: error?.message || null
    };
  } catch (error: any) {
    return {
      connected: false,
      url: supabaseUrl,
      hasData: false,
      error: error?.message || 'حدث خطأ غير متوقع'
    };
  }
};

export default supabase;