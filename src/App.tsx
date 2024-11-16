// App.tsx
import React, { useEffect, useState } from 'react';
import TokenTable from './components/TokenTable';
import { TokenData } from './types';
import { Loader2 } from 'lucide-react';

function App() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await fetch('https://hyperliquid-json-bucket.s3.eu-central-1.amazonaws.com/spot.json');
        if (!response.ok) {
          throw new Error('Failed to fetch token data');
        }
        const data = await response.json();
        setTokens(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load token data');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
    
    // Optional: Set up polling to refresh data
    const intervalId = setInterval(fetchTokens, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-[#0E1416]">
      <div className="max-w-[98%] mx-auto px-2 sm:px-3 lg:px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <img 
            src="https://app.hyperliquid.xyz/images/logo-navbar.svg" 
            alt="Hyperliquid" 
            className="h-8"
          />
          <h1 className="text-2xl font-bold text-gray-100">Token Analytics</h1>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-300">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>Loading token data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-900 rounded-lg p-4 text-red-400">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/40 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <TokenTable data={tokens} />
        )}
      </div>
    </div>
  );
}

export default App;