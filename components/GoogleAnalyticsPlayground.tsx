import React, { useState, useMemo, useEffect } from 'react';
import { AccountDetailsRecord, GoogleAnalyticsPlaygroundState, GAMediumData, GALandingPageData, GADeviceData } from '../types';

interface GoogleAnalyticsPlaygroundProps {
  allAccountDetails: AccountDetailsRecord[];
  toolState: GoogleAnalyticsPlaygroundState;
  onStateChange: (newState: GoogleAnalyticsPlaygroundState) => void;
}

type DateMode = 'timespan' | 'month';
type TimeSpan = '7' | '30' | '60' | '90';
type TabType = 'mediums' | 'landing-pages' | 'devices' | 'comparison';

const GoogleAnalyticsPlayground: React.FC<GoogleAnalyticsPlaygroundProps> = ({
  allAccountDetails,
  toolState = { selectedClient: '', selectedPropertyId: '' },
  onStateChange
}) => {
  // State management
  const [mediumData, setMediumData] = useState<GAMediumData[]>([]);
  const [landingPagesData, setLandingPagesData] = useState<GALandingPageData[]>([]);
  const [deviceData, setDeviceData] = useState<GADeviceData[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [dateMode, setDateMode] = useState<DateMode>('timespan');
  const [selectedTimeSpan, setSelectedTimeSpan] = useState<TimeSpan>('30');
  const [selectedMonth, setSelectedMonth] = useState('');

  const [activeTab, setActiveTab] = useState<TabType>('mediums');
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const [sortColumn, setSortColumn] = useState<string>('sessions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Client selection
  const selectedClient = toolState.selectedClient;
  const setSelectedClient = (client: string) => {
    onStateChange({ ...toolState, selectedClient: client });
  };

  // Available clients (show all clients like Google Ads does)
  const availableClients = useMemo(() => {
    if (!allAccountDetails || allAccountDetails.length === 0) {
      return [];
    }
    return allAccountDetails
      .map(client => client.ClientName)
      .sort();
  }, [allAccountDetails]);

  // Current property ID
  const currentPropertyId = useMemo(() => {
    if (!allAccountDetails || !selectedClient) {
      return '';
    }
    const client = allAccountDetails.find(c => c.ClientName === selectedClient);
    return client?.PropertyID || '';
  }, [allAccountDetails, selectedClient]);

  // Generate available months (last 24 months)
  const availableMonths = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 24; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const value = `${year}-${month}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value, label });
    }
    return months;
  }, []);

  // Initialize selected month
  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[1].value); // Previous month (not current partial month)
    }
  }, [availableMonths, selectedMonth]);

  // Calculate date range for API
  const getDateRange = () => {
    if (dateMode === 'month' && selectedMonth) {
      const [year, month] = selectedMonth.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);

      const formatDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`; // GA4 requires YYYY-MM-DD format
      };

      return {
        startDate: formatDate(startDate),
        endDate: formatDate(endDate)
      };
    }
    return { dateRange: selectedTimeSpan };
  };

  // Activity logging
  const logActivity = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Fetch medium data
  const fetchMediumData = async () => {
    if (!currentPropertyId) {
      setError(`No Property ID found for ${selectedClient}. Please add a "GA Property ID" or "Property ID" column to your Account Details sheet with this client's GA4 property ID (format: 123456789).`);
      logActivity(`✗ Missing Property ID for ${selectedClient}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const dateParams = getDateRange();
      const response = await fetch('http://localhost:3002/api/ga/traffic-by-medium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: currentPropertyId,
          ...dateParams
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setMediumData(result.mediumData || []);
        logActivity(`✓ Fetched medium data for ${selectedClient} (${result.mediumData?.length || 0} channels)`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMsg);
      logActivity(`✗ Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch landing pages
  const fetchLandingPages = async () => {
    if (!currentPropertyId) return;

    setIsLoading(true);
    try {
      const dateParams = getDateRange();
      const response = await fetch('http://localhost:3002/api/ga/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: currentPropertyId,
          ...dateParams
        })
      });

      const result = await response.json();

      if (result.success) {
        setLandingPagesData(result.landingPages || []);
        logActivity(`✓ Fetched landing pages (${result.landingPages?.length || 0} pages)`);
      }
    } catch (err) {
      logActivity(`✗ Error fetching landing pages: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch device breakdown
  const fetchDeviceBreakdown = async () => {
    if (!currentPropertyId) return;

    setIsLoading(true);
    try {
      const dateParams = getDateRange();
      const response = await fetch('http://localhost:3002/api/ga/device-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: currentPropertyId,
          ...dateParams
        })
      });

      const result = await response.json();

      if (result.success) {
        setDeviceData(result.deviceData || []);
        logActivity(`✓ Fetched device breakdown (${result.deviceData?.length || 0} devices)`);
      }
    } catch (err) {
      logActivity(`✗ Error fetching device data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch comparison data
  const fetchComparisonData = async () => {
    if (!currentPropertyId) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3002/api/ga/performance-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: currentPropertyId })
      });

      const result = await response.json();

      if (result.success) {
        setComparisonData(result.comparisons || {});
        logActivity(`✓ Fetched performance comparison`);
      }
    } catch (err) {
      logActivity(`✗ Error fetching comparison data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all data
  const handleFetchAllData = async () => {
    await fetchMediumData();
    await fetchLandingPages();
    await fetchDeviceBreakdown();
    await fetchComparisonData();
  };

  // Auto-select first client if none selected
  useEffect(() => {
    if (!selectedClient && availableClients.length > 0) {
      setSelectedClient(availableClients[0]);
    }
  }, [availableClients, selectedClient]);

  // Sort medium data
  const sortedMediumData = useMemo(() => {
    if (!mediumData || mediumData.length === 0) return [];

    return [...mediumData].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof GAMediumData];
      let bVal: any = b[sortColumn as keyof GAMediumData];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [mediumData, sortColumn, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    return mediumData.reduce((acc, m) => ({
      sessions: acc.sessions + m.sessions,
      users: acc.users + m.users,
      revenue: acc.revenue + m.revenue,
      conversions: acc.conversions + m.conversions
    }), { sessions: 0, users: 0, revenue: 0, conversions: 0 });
  }, [mediumData]);

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Medium color mapping
  const getMediumColor = (medium: string) => {
    const lowerMedium = medium.toLowerCase();
    if (lowerMedium.includes('organic')) return '#A78BFA'; // Purple
    if (lowerMedium.includes('direct')) return '#2DD4BF'; // Teal
    if (lowerMedium.includes('paid') || lowerMedium.includes('cpc')) return '#F59E0B'; // Orange
    if (lowerMedium.includes('referral')) return '#3B82F6'; // Blue
    if (lowerMedium.includes('social')) return '#EC4899'; // Pink
    if (lowerMedium.includes('email')) return '#10B981'; // Green
    return '#9CA3AF'; // Gray for others
  };

  // Render header with sorting
  const renderTableHeader = (label: string, key: string) => {
    const isActive = sortColumn === key;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider cursor-pointer hover:bg-white/5"
        onClick={() => {
          if (isActive) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
          } else {
            setSortColumn(key);
            setSortDirection('desc');
          }
        }}
      >
        {label} {isActive && (sortDirection === 'asc' ? '↑' : '↓')}
      </th>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Client Selector Card */}
      <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Client Selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Select Client
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
            >
              <option value="">Choose a client...</option>
              {availableClients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
            {selectedClient && (
              <div className="mt-2 text-xs">
                {currentPropertyId ? (
                  <span className="text-[var(--color-text-secondary)]">
                    Property ID: {currentPropertyId}
                  </span>
                ) : (
                  <span className="text-yellow-400">
                    ⚠ No Property ID configured for this client
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Date Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Date Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDateMode('timespan')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  dateMode === 'timespan'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-white/10'
                }`}
              >
                Time Span
              </button>
              <button
                onClick={() => setDateMode('month')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  dateMode === 'month'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-white/10'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              {dateMode === 'timespan' ? 'Time Period' : 'Select Month'}
            </label>
            {dateMode === 'timespan' ? (
              <select
                value={selectedTimeSpan}
                onChange={(e) => setSelectedTimeSpan(e.target.value as TimeSpan)}
                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="60">Last 60 Days</option>
                <option value="90">Last 90 Days</option>
              </select>
            ) : (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
              >
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Fetch Button */}
        <div className="mt-4">
          <button
            onClick={handleFetchAllData}
            disabled={isLoading || !selectedClient}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {isLoading ? 'Fetching Data...' : 'Fetch Analytics Data'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Summary Metrics */}
      {mediumData.length > 0 && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] p-6">
          <h2 className="text-xl font-bold text-white mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
              <div className="text-[var(--color-text-secondary)] text-sm mb-1">Total Sessions</div>
              <div className="text-3xl font-bold text-white">{totals.sessions.toLocaleString()}</div>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
              <div className="text-[var(--color-text-secondary)] text-sm mb-1">Total Users</div>
              <div className="text-3xl font-bold text-white">{totals.users.toLocaleString()}</div>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
              <div className="text-[var(--color-text-secondary)] text-sm mb-1">Total Revenue</div>
              <div className="text-3xl font-bold text-white">${totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
              <div className="text-[var(--color-text-secondary)] text-sm mb-1">Total Conversions</div>
              <div className="text-3xl font-bold text-white">{totals.conversions.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      {mediumData.length > 0 && (
        <div className="flex gap-2 bg-[var(--color-card-bg)] rounded-lg p-2 border border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('mediums')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'mediums'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-white/5'
            }`}
          >
            Traffic by Medium ({mediumData.length})
          </button>
          <button
            onClick={() => setActiveTab('landing-pages')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'landing-pages'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-white/5'
            }`}
          >
            Landing Pages ({landingPagesData.length})
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'devices'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-white/5'
            }`}
          >
            Devices ({deviceData.length})
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'comparison'
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-white/5'
            }`}
          >
            Comparison
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'mediums' && mediumData.length > 0 && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-bg-secondary)]">
                <tr>
                  {renderTableHeader('Medium', 'medium')}
                  {renderTableHeader('Sessions', 'sessions')}
                  {renderTableHeader('Users', 'users')}
                  {renderTableHeader('Revenue', 'revenue')}
                  {renderTableHeader('Conversions', 'conversions')}
                  {renderTableHeader('Bounce Rate', 'bounceRate')}
                  {renderTableHeader('Avg. Duration', 'avgSessionDuration')}
                  {renderTableHeader('Pages/Session', 'pagesPerSession')}
                </tr>
              </thead>
              <tbody className="bg-[var(--color-card-bg)] divide-y divide-[var(--color-border)]">
                {sortedMediumData.map((medium, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getMediumColor(medium.medium) }}
                        />
                        <span className="text-sm font-medium text-white">{medium.medium}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {medium.sessions.toLocaleString()}
                      <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                        ({totals.sessions > 0 ? ((medium.sessions / totals.sessions) * 100).toFixed(1) : 0}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {medium.users.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      ${medium.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {medium.conversions.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`font-semibold ${
                        medium.bounceRate < 40 ? 'text-green-400' :
                        medium.bounceRate < 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {medium.bounceRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {formatDuration(medium.avgSessionDuration)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                      {medium.pagesPerSession.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Landing Pages Tab */}
      {activeTab === 'landing-pages' && landingPagesData.length > 0 && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-bg-secondary)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Page</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Users</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Conversions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">Bounce Rate</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-card-bg)] divide-y divide-[var(--color-border)]">
                {landingPagesData.slice(0, 20).map((page, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)] max-w-md truncate" title={page.page}>
                      {page.page}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{page.sessions.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{page.users.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{page.conversions.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">${page.revenue.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`font-semibold ${
                        page.bounceRate < 40 ? 'text-green-400' :
                        page.bounceRate < 60 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {page.bounceRate.toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Devices Tab */}
      {activeTab === 'devices' && deviceData.length > 0 && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-bold text-white mb-4">Device Category Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {deviceData.map((device, idx) => (
              <div key={idx} className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                <div className="text-[var(--color-text-secondary)] text-sm mb-1 capitalize">{device.device}</div>
                <div className="text-2xl font-bold text-white mb-2">{device.sessions.toLocaleString()}</div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-3">
                  {device.percentOfTotal.toFixed(1)}% of total sessions
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Users:</span>
                    <span className="text-white">{device.users.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Revenue:</span>
                    <span className="text-white">${device.revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">Conversions:</span>
                    <span className="text-white">{device.conversions.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && comparisonData && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-bold text-white mb-4">Period-over-Period Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(comparisonData).map(([period, data]: [string, any]) => (
              <div key={period} className="bg-[var(--color-bg-secondary)] rounded-lg p-4">
                <div className="text-[var(--color-text-secondary)] text-sm mb-3 font-semibold">
                  Last {period.replace('d', ' Days')}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">Sessions:</span>
                    <span className={`text-sm font-bold ${
                      data.sessions > 0 ? 'text-green-400' : data.sessions < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {data.sessions > 0 ? '+' : ''}{data.sessions.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">Revenue:</span>
                    <span className={`text-sm font-bold ${
                      data.revenue > 0 ? 'text-green-400' : data.revenue < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {data.revenue > 0 ? '+' : ''}{data.revenue.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">Conversions:</span>
                    <span className={`text-sm font-bold ${
                      data.conversions > 0 ? 'text-green-400' : data.conversions < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {data.conversions > 0 ? '+' : ''}{data.conversions.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      {activityLog.length > 0 && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-bold text-white mb-4">Activity Log</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {activityLog.map((log, idx) => (
              <div key={idx} className="text-xs text-[var(--color-text-secondary)] font-mono">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && mediumData.length === 0 && selectedClient && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] p-12 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2">No Data Yet</h3>
          <p className="text-[var(--color-text-secondary)] mb-4">
            Click "Fetch Analytics Data" to load Google Analytics data for {selectedClient}
          </p>
        </div>
      )}

      {/* No Client Selected */}
      {!selectedClient && (
        <div className="bg-[var(--color-card-bg)] rounded-lg shadow-lg border border-[var(--color-border)] p-12 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-white mb-2">Select a Client</h3>
          <p className="text-[var(--color-text-secondary)]">
            Choose a client from the dropdown above to view their Google Analytics data
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleAnalyticsPlayground;
