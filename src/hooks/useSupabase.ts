import { useState, useEffect, useCallback } from 'react';
import { useErrorLogger } from '../utils/errorLogger';
import { supabase } from '../lib/supabaseClient';

export const useSupabaseConnection = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logInfo, logError } = useErrorLogger();

  const checkConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error: dbError } = await supabase
        .from('beneficiaries')
        .select('count', { count: 'exact', head: true });

      if (dbError) {
        setError(dbError.message);
        setIsConnected(false);
        logError(dbError.message, 'useSupabaseConnection');
      } else {
        setIsConnected(true);
        setError(null);
        logInfo('تم الاتصال بقاعدة البيانات بنجاح', 'useSupabaseConnection');
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال');
      setIsConnected(false);
      logError(err.message, 'useSupabaseConnection');
    } finally {
      setIsLoading(false);
    }
  }, [logInfo, logError]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const retryConnection = useCallback(async () => {
    await checkConnection();
  }, [checkConnection]);

  return {
    isConnected,
    isLoading,
    error,
    retryConnection
  };
};

export const useSupabaseQuery = <T>(
  table: string,
  query?: string,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logInfo, logError } = useErrorLogger();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let queryBuilder = supabase.from(table).select('*');

      if (query) {
        queryBuilder = queryBuilder.or(query);
      }

      const { data: result, error: dbError } = await queryBuilder;

      if (dbError) {
        setError(dbError.message);
        logError(`خطأ في جلب ${table}: ${dbError.message}`, 'useSupabaseQuery');
      } else {
        setData(result as T[]);
        logInfo(`تم جلب ${result?.length || 0} سجل من ${table}`, 'useSupabaseQuery');
      }
    } catch (err: any) {
      setError(err.message);
      logError(`خطأ في ${table}: ${err.message}`, 'useSupabaseQuery');
    } finally {
      setLoading(false);
    }
  }, [table, query, logInfo, logError]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
};

export const useSupabaseInsert = <T>(table: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logInfo, logError } = useErrorLogger();

  const insert = async (data: T): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from(table)
        .insert(data as any);

      if (dbError) {
        setError(dbError.message);
        logError(`خطأ في الإدراج في ${table}: ${dbError.message}`, 'useSupabaseInsert');
        return false;
      }

      logInfo(`تم الإدراج في ${table} بنجاح`, 'useSupabaseInsert');
      return true;
    } catch (err: any) {
      setError(err.message);
      logError(`خطأ في ${table}: ${err.message}`, 'useSupabaseInsert');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { insert, loading, error };
};

export const useSupabaseUpdate = <T>(table: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logInfo, logError } = useErrorLogger();

  const update = async (id: string, data: Partial<T>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from(table)
        .update(data as any)
        .eq('id', id);

      if (dbError) {
        setError(dbError.message);
        logError(`خطأ في التحديث في ${table}: ${dbError.message}`, 'useSupabaseUpdate');
        return false;
      }

      logInfo(`تم التحديث في ${table} بنجاح`, 'useSupabaseUpdate');
      return true;
    } catch (err: any) {
      setError(err.message);
      logError(`خطأ في ${table}: ${err.message}`, 'useSupabaseUpdate');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { update, loading, error };
};

export const useSupabaseDelete = (table: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logInfo, logError } = useErrorLogger();

  const deleteRecord = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (dbError) {
        setError(dbError.message);
        logError(`خطأ في الحذف من ${table}: ${dbError.message}`, 'useSupabaseDelete');
        return false;
      }

      logInfo(`تم الحذف من ${table} بنجاح`, 'useSupabaseDelete');
      return true;
    } catch (err: any) {
      setError(err.message);
      logError(`خطأ في ${table}: ${err.message}`, 'useSupabaseDelete');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { deleteRecord, loading, error };
};