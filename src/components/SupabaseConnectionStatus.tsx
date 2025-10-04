import React from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, Database, Wifi, WifiOff } from 'lucide-react';

interface SupabaseConnectionStatusProps {
  showDetails?: boolean;
}

export default function SupabaseConnectionStatus({ showDetails = false }: SupabaseConnectionStatusProps) {
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const { default: supabase } = await import('../lib/supabaseClient');
      const { data, error: dbError } = await supabase.from('beneficiaries').select('count', { count: 'exact', head: true });

      if (dbError) {
        setError(dbError.message);
        setIsConnected(false);
      } else {
        setIsConnected(true);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message || 'فشل الاتصال');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-3 space-x-reverse text-gray-600 ${showDetails ? 'bg-gray-50 p-3 rounded-lg border border-gray-200' : ''}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">جاري الاتصال...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`flex items-center space-x-3 space-x-reverse text-red-600 ${showDetails ? 'bg-red-50 p-3 rounded-lg border border-red-200' : ''}`}>
        <WifiOff className="w-4 h-4" />
        <div className="flex-1">
          <span className="text-sm font-medium">فشل الاتصال بقاعدة البيانات</span>
          {showDetails && error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 space-x-reverse text-green-600 ${showDetails ? 'bg-green-50 p-3 rounded-lg border border-green-200' : ''}`}>
      <CheckCircle className="w-4 h-4" />
      <div className="flex-1">
        <span className="text-sm font-medium">متصل بقاعدة البيانات</span>
        {showDetails && (
          <p className="text-xs text-green-500 mt-1">النظام متصل بـ Supabase بنجاح</p>
        )}
      </div>
    </div>
  );
}