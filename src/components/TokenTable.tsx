import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Droplets, Waves, Settings, Search, SlidersHorizontal } from 'lucide-react';
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

const formatAge = (dateString: string) => {
  const deployDate = new Date(dateString);
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
  // State
  const [columns, setColumns] = useState<Column[]>([
    { key: 'token', label: 'Token', visible: true, required: true },
    { key: 'mark_price', label: 'Price', visible: true, required: true },
    { key: 'price_change_24h', label: '24h %', visible: true, required: true },
    { key: 'slippage', label: 'Spread', visible: false },
    { key: 'holders_count', label: 'Holders', visible: true },
    { key: 'market_cap', label: 'MC', visible: true, required: true },
    { key: 'holders.concentration.top1_share', label: 'Top holder %', visible: true },
    { key: 'holders.concentration.top5_share', label: 'Top 5 holders %', visible: true },
    { key: 'holders.concentration.top20_share', label: 'Top 20 holders %', visible: true },
    { key: 'holders.total_burned_percent', label: 'Burned %', visible: false },
    { key: 'holders.hip2.percent', label: 'HIP-2 %', visible: false },
    { key: 'deploy_time', label: 'Age', visible: true },
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

  // Derived state
  const visibleColumns = columns.filter(col => col.visible);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    return data.filter(token => {
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
  }, [data, filters]);

  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key.toString());
    const bValue = getNestedValue(b, sortConfig.key.toString());
    
    if (sortConfig.direction === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

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
  const SortableHeader: React.FC<{ label: string; sortKey: SortKey }> = ({ label, sortKey }) => (
    <th 
      className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-[#1A2023]"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </th>
  );

  return (
    <div className="relative">
      {/* Header Controls */}
      <div className="mb-4 flex justify-end gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-[#1A2023] rounded-md hover:bg-[#242C30] transition-colors"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
        
        <button
          onClick={() => setShowColumnSelector(!showColumnSelector)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 bg-[#1A2023] rounded-md hover:bg-[#242C30] transition-colors relative"
        >
          <Settings size={16} />
          Customize
        </button>
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

      {/* Column Selector Popup */}
      {showColumnSelector && (
        <div className="absolute right-0 top-12 z-20 bg-[#1A2023] rounded-lg shadow-xl p-4 border border-gray-700">
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

      {/* Table */}
<div className="overflow-x-auto bg-[#141B1E] rounded-lg shadow-lg">
  <table className="min-w-full divide-y divide-gray-800">
    <thead className="bg-[#1A2023]">
      <tr>
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
          {visibleColumns.map(column => {
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
                      <Tooltip text="Spread <= 0.3%">
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

            const value = getNestedValue(token, column.key.toString());
            let displayValue = value;

            if (column.key === 'mark_price') {
              // Show all decimal places for price
              displayValue = `$${value}`;
            } else if (column.key === 'price_change_24h' || 
                      column.key === 'slippage' || 
                      column.key.includes('percent') ||
                      column.key.includes('share')) {
              // Show only 2 decimal places for percentages
              displayValue = `${value.toFixed(2)}%`;
            } else if (column.key === 'market_cap') {
              displayValue = `$${formatLargeNumber(value)}`;
            } else if (column.key === 'deploy_time') {
              displayValue = formatAge(value);
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