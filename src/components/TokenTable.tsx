import React, { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown, Droplets, Waves, Settings, Search, SlidersHorizontal } from 'lucide-react';
import { FaSquareXTwitter, FaTelegram } from 'react-icons/fa6';
import { FiX } from 'react-icons/fi';
import { TokenData } from '../types';

type SortKey = keyof TokenData | 'holders.concentration.top1_share' | 
  'holders.concentration.top5_share' | 'holders.concentration.top20_share' | 
  'holders.total_burned_percent' | 'holders.hip2.percent';

interface Column {
  key: SortKey;
  label: string;
  visible: boolean;
  required?: boolean;
}

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface Filters {
  search: string;
  liquidity: 'all' | 'hyperliquid' | 'non-hyperliquid';
  mcMin: string;
  mcMax: string;
}

// Helper functions
const formatLargeNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const formatPercent = (num: number) => `${num.toFixed(2)}%`;

const formatAge = (dateString: string, tokenId?: string) => {
  let deployDate;

  // Hardcode the deployment date for the token with ID 0xc1fb593aeffbeb02f85e0308e9956a90 (PURR)
  if (tokenId === '0xc1fb593aeffbeb02f85e0308e9956a90') {
    deployDate = new Date('2024-04-16');
  } else {
    deployDate = new Date(dateString);
  }

  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - deployDate.getTime()) / (1000 * 60 * 60 * 24));
  return `${diffInDays}d`;
};

const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
};

const isHyperliquid = (slippage: number) => slippage <= 0.31;

// Tooltip Component
const Tooltip: React.FC<{ children: React.ReactNode; text: string }> = ({ children, text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative group" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-10 px-3 py-2 text-sm text-white bg-black rounded shadow-lg whitespace-nowrap -top-10 left-1/2 transform -translate-x-1/2">
          {text}
          <div className="absolute bottom-[-8px] left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black"></div>
        </div>
      )}
    </div>
  );
};

const TokenTable: React.FC<{ data: TokenData[] }> = ({ data }) => {
  // Add an index to each token based on its original position
  const indexedData = data.map((token, index) => ({ ...token, index: index + 1 }));

  // State
  const [columns, setColumns] = useState<Column[]>([
    { key: 'token', label: 'Token', visible: true, required: true },
    { key: 'price_change_24h', label: '24h %', visible: true, required: true },
    { key: 'mark_price', label: 'Price', visible: true, required: true },
    { key: 'market_cap', label: 'MC', visible: true, required: true },
    { key: 'holders_count', label: 'Holders', visible: true },
    { key: 'slippage', label: 'Spread', visible: false },
    { key: 'holders.concentration.top1_share', label: 'Top holder %', visible: true },
    { key: 'holders.concentration.top5_share', label: 'Top 5 holders %', visible: true },
    { key: 'holders.concentration.top20_share', label: 'Top 20 holders %', visible: true },
    { key: 'holders.total_burned_percent', label: 'Burned %', visible: false },
    { key: 'holders.hip2.percent', label: 'HIP-2 %', visible: false },
    { key: 'deploy_time', label: 'Age', visible: true },
    { key: 'total_bid_size', label: 'Total Bid Size', visible: false },
    { key: 'total_ask_size', label: 'Total Ask Size', visible: false },
    { key: 'total_bid_size_usd', label: 'Total Bid Size (USD)', visible: false },
    { key: 'total_ask_size_usd', label: 'Total Ask Size (USD)', visible: false },
  ]);

  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'market_cap', direction: 'desc' });
  const [filters, setFilters] = useState<Filters>({
    search: '',
    liquidity: 'all',
    mcMin: '',
    mcMax: '',
  });

  // Close the popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.column-selector') && !target.closest('.customize-button')) {
        setShowColumnSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Derived state
  const visibleColumns = columns.filter(col => col.visible);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    return indexedData.filter(token => {
      // Search filter
      if (filters.search && !token.token.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Liquidity filter
      if (filters.liquidity !== 'all') {
        const tokenIsHyperliquid = isHyperliquid(token.slippage);
        if (filters.liquidity === 'hyperliquid' && !tokenIsHyperliquid) return false;
        if (filters.liquidity === 'non-hyperliquid' && tokenIsHyperliquid) return false;
      }

      // Market cap filters
      const mcMin = filters.mcMin ? parseFloat(filters.mcMin) : 0;
      const mcMax = filters.mcMax ? parseFloat(filters.mcMax) : Infinity;
      if (token.market_cap < mcMin || token.market_cap > mcMax) {
        return false;
      }

      return true;
    });
  }, [indexedData, filters]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key.toString());
      const bValue = getNestedValue(b, sortConfig.key.toString());

      // Special handling for deploy_time to sort by numeric age
      if (sortConfig.key === 'deploy_time') {
        const aAge = a.token_id === '0xc1fb593aeffbeb02f85e0308e9956a90' ? 
          Math.floor((new Date().getTime() - new Date('2024-04-16').getTime()) / (1000 * 60 * 60 * 24)) :
          Math.floor((new Date().getTime() - new Date(aValue).getTime()) / (1000 * 60 * 60 * 24));
        
        const bAge = b.token_id === '0xc1fb593aeffbeb02f85e0308e9956a90' ? 
          Math.floor((new Date().getTime() - new Date('2024-04-16').getTime()) / (1000 * 60 * 60 * 24)) :
          Math.floor((new Date().getTime() - new Date(bValue).getTime()) / (1000 * 60 * 60 * 24));

        return sortConfig.direction === 'asc' ? aAge - bAge : bAge - aAge;
      }

      // Handle numeric and string values separately
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [filteredData, sortConfig]);

  // Event handlers
  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleColumn = (key: SortKey) => {
    setColumns(columns.map(col => {
      if (col.key === key && !col.required) {
        return { ...col, visible: !col.visible };
      }
      return col;
    }));
  };

  // Sub-components
  const SortableHeader: React.FC<{ label: string; sortKey: SortKey }> = ({ label, sortKey }) => {
    const isActive = sortConfig.key === sortKey;
    const sortDirection = isActive ? sortConfig.direction : null;

    return (
      <th 
        className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-[#1A2023] ${
          isActive ? 'text-[#7CFFE9]' : 'text-gray-400'
        }`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          {label}
          {isActive && (
            sortDirection === 'asc' ? (
              <ArrowUpDown className="h-4 w-4 transform rotate-180" />
            ) : (
              <ArrowUpDown className="h-4 w-4" />
            )
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="relative">
      {/* Notice Block */}
      <div className="mb-4 p-4 bg-[#1A2023] rounded-lg border border-gray-800 text-gray-300">
        <p className="mb-2">
          This is not an official Hyperliquid app. Data may be inaccurate.
        </p>
        <p className="mb-2">Contact dev:</p>
        <div className="flex gap-4">
          <a 
            href="https://x.com/jedcli" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2"
          >
            <FaSquareXTwitter className="h-6 w-6 text-gray-300" />
          </a>
          <a 
            href="https://t.me/jedcli" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2"
          >
            <FaTelegram className="h-6 w-6 text-gray-300" />
          </a>
        </div>
      </div>

      {/* Header Controls */}
      <div className="mb-4 flex justify-end gap-2 relative">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-[#1A2023] rounded-md hover:bg-[#242C30] transition-colors"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
        
        <button
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-[#1A2023] rounded-md hover:bg-[#242C30] transition-colors relative customize-button"
        >
          <Settings size={16} />
          Customize
        </button>

        {/* Column Selector Popup */}
        {showColumnSelector && (
          <div className="absolute right-0 top-full mt-2 z-20 bg-[#1A2023] rounded-lg shadow-xl p-4 border border-gray-700 column-selector">
            <div className="grid grid-cols-2 gap-4">
              {columns.map(column => (
                <label 
                  key={column.key.toString()} 
                  className={`flex items-center gap-2 ${
                    column.required ? 'text-gray-500' : 'text-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={() => !column.required && toggleColumn(column.key)}
                    disabled={column.required}
                    className="form-checkbox text-[#7CFFE9] disabled:opacity-50"
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="mb-6 p-4 bg-[#1A2023] rounded-lg border border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search tokens..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-[#141B1E] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-[#7CFFE9]"
              />
            </div>

            {/* Liquidity Filter */}
            <div>
              <select
                value={filters.liquidity}
                onChange={(e) => setFilters(prev => ({ ...prev, liquidity: e.target.value as Filters['liquidity'] }))}
                className="w-full px-4 py-2 bg-[#141B1E] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-[#7CFFE9]"
              >
                <option value="all">All Tokens</option>
                <option value="hyperliquid">Hyperliquid Only</option>
                <option value="non-hyperliquid">Non-Hyperliquid Only</option>
              </select>
            </div>

            {/* Market Cap Filters */}
            <div>
              <input
                type="number"
                placeholder="Min Market Cap"
                value={filters.mcMin}
                onChange={(e) => setFilters(prev => ({ ...prev, mcMin: e.target.value }))}
                className="w-full px-4 py-2 bg-[#141B1E] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-[#7CFFE9]"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Max Market Cap"
                value={filters.mcMax}
                onChange={(e) => setFilters(prev => ({ ...prev, mcMax: e.target.value }))}
                className="w-full px-4 py-2 bg-[#141B1E] border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-[#7CFFE9]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
<div className="overflow-x-auto bg-[#141B1E] rounded-lg shadow-lg">
  <table className="min-w-full divide-y divide-gray-800">
    <thead className="bg-[#1A2023]">
      <tr>
        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
          #
        </th>
        {visibleColumns.map(column => (
          <SortableHeader 
            key={column.key.toString()} 
            label={column.label} 
            sortKey={column.key} 
          />
        ))}
      </tr>
    </thead>
    <tbody className="bg-[#141B1E] divide-y divide-gray-800">
      {sortedData.map((token) => (
        <tr key={token.token_id} className="hover:bg-[#1A2023]">
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
            {token.index}
          </td>
          {visibleColumns.map(column => {
            const value = getNestedValue(token, column.key.toString());
            let displayValue = value;

            if (column.key === 'token') {
              return (
                <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <a 
                      href={`https://app.hyperliquid.xyz/trade/${token.token_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#7CFFE9] hover:text-[#9EFFED] hover:underline"
                    >
                      {token.token}
                    </a>
                    {isHyperliquid(token.slippage) ? (
                      <Tooltip text="Spread <= 0.31%">
                        <Droplets size={16} className="text-[#7CFFE9]" />
                      </Tooltip>
                    ) : (
                      <Tooltip text={`Spread is ${token.slippage.toFixed(2)}%`}>
                        <Waves size={16} className="text-gray-500" />
                      </Tooltip>
                    )}
                  </div>
                </td>
              );
            }

            if (column.key === 'mark_price') {
              displayValue = `$${value}`;
            } else if (column.key === 'price_change_24h' || 
                      column.key === 'slippage' || 
                      column.key.includes('percent') ||
                      column.key.includes('share')) {
              displayValue = `${value.toFixed(2)}%`;
            } else if (column.key === 'market_cap' || 
                       column.key === 'total_bid_size_usd' || 
                       column.key === 'total_ask_size_usd') {
              displayValue = `$${formatLargeNumber(value)}`;
            } else if (column.key === 'deploy_time') {
              displayValue = formatAge(value, token.token_id);
            }

            return (
              <td 
                key={column.key}
                className={`px-6 py-4 whitespace-nowrap text-sm ${
                  column.key === 'price_change_24h' 
                    ? value >= 0 ? 'text-green-400' : 'text-red-400'
                    : 'text-gray-300'
                }`}
              >
                {displayValue}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </table>
</div>
</div>
);
};

export default TokenTable;