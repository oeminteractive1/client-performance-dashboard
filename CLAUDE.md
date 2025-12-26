# Client Performance Dashboard - Development Guide

## Project Overview
This is a React/TypeScript dashboard application for managing client performance data, originally built with Google AI Studio but now running locally with Vite for easier development.

## Quick Setup
```bash
npm install
npm run dev
```
The app runs on `http://localhost:3000`

## Architecture
- **Frontend**: React 19.1.0 + TypeScript + Vite
- **Routing**: React Router DOM
- **Charts**: Chart.js
- **Layout**: React Grid Layout
- **Data Source**: Google Sheets API
- **Authentication**: Google OAuth + API Key

## Key Files
- `App.tsx` - Main application component (2800+ lines)
- `package.json` - Dependencies and scripts
- `types.ts` - TypeScript interfaces for data structures

## Google API Configuration
- **API Key**: `AIzaSyC-XMGjEXrs4m9LU4wy1blZ9zdULZdILAo`
- **Client ID**: `865402407071-q1ise3m52uf1j6i0cg2r5dhhv7p4nkig.apps.googleusercontent.com`
- **Status**: ✅ Working - localhost:3000 authorization configured properly

## Data Structure
The app manages 14 different data sources from Google Sheets:
1. Website Data
2. Budget Status
3. Store Status  
4. Store Changes
5. Feed Status
6. Percent Approved
7. Current Status
8. Account Details
9. Key Contacts
10. Revolution Links
11. Google Search Console
12. Google Analytics
13. Google Ads
14. Items in Feed

### Key Contacts Data Structure
```typescript
interface KeyContactRecord {
  ClientName: string;
  PPC: string;           // PPC Manager name
  PDM: string;           // PDM name
  Deal: string;
  'Hubspot Contact Name': string;
  'Hubspot Contact Phone': string;
}
```

## Recent Major Fixes

### 1. Data Connections Modal (Fixed)
**Issue**: Only showing 1 of 14 data sources
**Location**: `App.tsx` lines ~2401-2445
**Solution**: Added 13 missing data source sections with identical structure to "Website Data"

### 2. Contact Info in Toolbar (Recently Added)
**Location**: `App.tsx` lines 2638-2662
**Functionality**: Shows PPC, PDM, Hubspot Contact Name, and Hubspot Contact Phone for selected client
**Conditional**: Only displays when `currentPath === TOOL_ROUTES.client`
**Styling**: Uses theme CSS variables, centered layout with badges

### 3. Home Icon Fix (Recently Fixed)
**Location**: `App.tsx` lines 211-215 (HomeIcon component)
**Issue**: Malformed SVG path syntax
**Fixed**: Corrected path data for proper house icon display

## Important Code Patterns

### File Editing Strategy
- **Preferred**: Use bash `sed` commands for file edits
- **Avoid**: Edit tool often fails with "file has been modified" errors
- **Reason**: Unknown process modifying files during development

### Theme System
Uses CSS variables for consistent theming:
```css
--color-card-bg
--color-text-primary  
--color-border
--color-accent
--color-bg-secondary
```

### Data Processing
Each data source has a dedicated processing function:
- `processKeyContactsData()` - Handles Key Contacts
- `processAccountDetailsData()` - Handles Account Details
- etc.

## Current State
- ✅ Local development working
- ✅ All 14 data connections visible in modal
- ✅ Contact info displaying in Client Dashboard toolbar  
- ✅ Home icon fixed
- ✅ Google Sheets API working (Key Contacts data loading successfully)

## Development Commands
```bash
npm run dev     # Start development server
npm run build   # Build for production  
npm run preview # Preview production build
```

## Navigation Structure
- `/` - Home/Tools selection
- `/dashboards/client` - Client Overview Dashboard
- `/dashboards/multi-client` - Multi-Client Dashboard
- `/dashboards/manager` - Manager Dashboard
- `/tools/analysis/*` - Analysis tools (budget, revenue, brand comparison, etc.)
- `/tools/workflow/*` - Workflow tools (SEO titles, bulk URL opener, etc.)

## Key Components Locations
- Header/Toolbar: `App.tsx` lines 2621-2858
- Contact Info Display: `App.tsx` lines 2638-2662  
- Client Selector: `App.tsx` lines 2641+ (in header)
- Data Connections Modal: `App.tsx` lines 2401-2445

## Debugging Tips
1. Use browser dev tools to inspect data structures
2. Check console for Google Sheets API errors
3. Verify client selection state for contact info display
4. Theme variables can be inspected in CSS tab

## Fully Functional Status
✅ **Application is fully operational:**
1. Local development environment working
2. Google Sheets API authentication successful
3. All 14 data sources accessible through Data Connections modal
4. Contact information loading and displaying properly in Client Dashboard
5. All major UI components functioning correctly

---

## How to Add a New Tile to Client Dashboard

This guide documents the complete process for adding a new data tile to the Client Overview section.

### Example: Adding "Bing Ads Performance" Tile

### Step 1: Define Data Types (`types.ts`)

Add interface for the new data record:

```typescript
export interface BingAdsRecord {
    ClientName: string;
    Date: string;
    Cost?: number;
    Impressions?: number;
    Clicks?: number;
    AvgCPC?: number;
    CTR?: number;
    ROAS?: number;
    Conversions?: number;
    ConvRate?: number;
    Budget?: number;
    DateRan?: string;
}

export interface AllBingAdsData {
    [clientName: string]: BingAdsRecord[];
}
```

### Step 2: Add Header Mapping (`App.tsx`)

Define how Google Sheets column headers map to your interface (around line 193):

```typescript
const bingAdsHeaderMapping: { [key: string]: keyof BingAdsRecord } = {
    'Clients': 'ClientName',
    'Date': 'Date',
    'Cost': 'Cost',
    'Impressions': 'Impressions',
    'Clicks': 'Clicks',
    'AvgCPC': 'AvgCPC',
    'CTR': 'CTR',
    'ROAS': 'ROAS',
    'Conversions': 'Conversions',
    'ConvRate': 'ConvRate',
    'Budget': 'Budget',
    'Date Ran:': 'DateRan',
};
```

### Step 3: Add State Variables (`App.tsx`)

Add state for data, loading, errors, and sheet configuration (around line 370):

```typescript
// State for Bing Ads Data
const [bingAdsData, setBingAdsData] = useState<AllBingAdsData>({});
const [bingAdsError, setBingAdsError] = useState<string>('');
const [isBingAdsLoading, setIsBingAdsLoading] = useState<boolean>(false);
const [bingAdsSheetId, setBingAdsSheetId] = useState<string>(() =>
    localStorage.getItem('bingAdsSheetId') || '1EYp-vsBxiio0HlBzJckp8J2B6YAXxvKfXGGdgJDNtqY'
);
const [bingAdsSheetName, setBingAdsSheetName] = useState<string>(() =>
    localStorage.getItem('bingAdsSheetName') || 'BingAds'
);
```

### Step 4: Add Data Processing Function (`App.tsx`)

Create a function to process the raw Google Sheets data (around line 1314):

```typescript
const processBingAdsData = useCallback((rows: string[][], headers: string[]): AllBingAdsData => {
    const headerMap = new Map<string, number>();
    headers.forEach((h, i) => headerMap.set(h.trim(), i));

    const requiredHeaders = ['Clients', 'Date'];
    const missing = requiredHeaders.filter(h => !headerMap.has(h));
    if (missing.length > 0) throw new Error(`Missing required headers: ${missing.join(', ')}`);

    const data: AllBingAdsData = {};

    rows.forEach(row => {
        const clientName = row[headerMap.get('Clients')!];
        if (!clientName || clientName.trim() === '') return;

        const record: Partial<BingAdsRecord> = { ClientName: clientName };
        for (const header of headers) {
            const key = bingAdsHeaderMapping[header.trim()];
            if (key) {
                const cellValue = row[headerMap.get(header.trim())!];
                switch (key) {
                    case 'Cost': case 'AvgCPC': case 'Budget':
                        record[key] = cleanCurrency(cellValue); break;
                    case 'Impressions': case 'Clicks': case 'Conversions':
                        record[key] = cleanNumber(cellValue); break;
                    case 'CTR': case 'ROAS': case 'ConvRate':
                        record[key] = cleanFloat(cellValue); break;
                    default:
                        (record as any)[key] = cellValue; break;
                }
            }
        }
        if (!data[clientName]) data[clientName] = [];
        data[clientName].push(record as BingAdsRecord);
    });

    // Sort by date
    for (const client in data) {
        data[client].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
    }

    return data;
}, []);
```

### Step 5: Add Fetch Handler (`App.tsx`)

Create fetch handler (around line 1905):

```typescript
const handleFetchBingAdsData = useCallback(async () => {
    if (!bingAdsSheetId || !bingAdsSheetName) {
        setBingAdsError('Please provide a valid Spreadsheet ID and Sheet Name.');
        return false;
    }
    setIsBingAdsLoading(true);
    setBingAdsError('');
    try {
        const parsedData = await genericSheetFetcher(bingAdsSheetId, bingAdsSheetName, processBingAdsData);
        setBingAdsData(parsedData);
        return true;
    } catch (err) {
        setBingAdsError(err instanceof Error ? err.message : 'An unknown error occurred.');
        return false;
    } finally {
        setIsBingAdsLoading(false);
    }
}, [bingAdsSheetId, bingAdsSheetName, genericSheetFetcher, processBingAdsData]);
```

### Step 6: Add to Data Fetching (`App.tsx`)

Add to `fetchAllDataSequentially` function (around line 1999):

```typescript
const dataFetchers = [
    // ... existing fetchers
    handleFetchGoogleAdsData,
    handleFetchBingAdsData,  // Add here
    handleFetchUsersData
];
```

And add to dependency array (around line 2038):

```typescript
}, [
    handleFetchAccountDetails,
    // ... other handlers
    handleFetchGoogleAdsData,
    handleFetchBingAdsData,  // Add here
    handleFetchUsersData
]);
```

### Step 7: Add File Upload Handler (`App.tsx`)

Around line 2200:

```typescript
const handleBingAdsFileUpload = createUploadHandler(
    processBingAdsData,
    setBingAdsData,
    setIsBingAdsLoading,
    setBingAdsError
);
```

### Step 8: Add Client-Specific Data useMemo (`App.tsx`)

Around line 2277:

```typescript
const bingAdsForClient = useMemo(() => {
    if (!selectedClient || !bingAdsData) return null;
    return bingAdsData[selectedClient] || null;
}, [bingAdsData, selectedClient]);
```

### Step 9: Pass Data to Dashboard Component (`App.tsx`)

In `renderClientDashboard()` (around line 2434):

```typescript
<Dashboard
    // ... other props
    googleAdsData={googleAdsForClient}
    bingAdsData={bingAdsForClient}  // Add here
    isModalOpen={isDashboardModalOpen}
    setIsModalOpen={setIsDashboardModalOpen}
/>
```

### Step 10: Add to Data Connections Modal (`App.tsx`)

Around line 2698, add section for fetching the data:

```typescript
{/* 14. Bing Ads */}
<div className="border-b border-white/20 pb-8">
    <h3 className="text-xl font-bold text-[var(--color-accent-secondary)] mb-4">
        Google Sheets Connection for Bing Ads
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Spreadsheet ID
            </label>
            <input
                type="text"
                value={bingAdsSheetId}
                onChange={e => setBingAdsSheetId(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Sheet (Tab) Name
            </label>
            <input
                type="text"
                value={bingAdsSheetName}
                onChange={e => setBingAdsSheetName(e.target.value)}
                className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5"
            />
        </div>
    </div>
    <div className="mt-4 flex gap-4">
        <button
            onClick={() => handleFetchBingAdsData()}
            disabled={isBingAdsLoading}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg"
        >
            {isBingAdsLoading ? 'Fetching...' : 'Fetch Bing Ads'}
        </button>
        <label className="text-sm text-[var(--color-accent-secondary)] hover:brightness-90 font-semibold cursor-pointer">
            Upload CSV
            <input
                type="file"
                accept=".csv"
                onChange={handleBingAdsFileUpload}
                className="hidden"
            />
        </label>
    </div>
    {bingAdsError && <div className="text-red-500 text-sm mt-4">{bingAdsError}</div>}
</div>
```

### Step 11: Create Tile Component (`components/BingAdsTile.tsx`)

Create a new component file:

```typescript
import React, { useMemo } from 'react';
import { BingAdsRecord } from '../types';

type ViewMode = 'time' | 'month';
type TimeRange = '1' | '3' | '6' | '9' | '12';

interface BingAdsTileProps {
    allData: BingAdsRecord[];
    viewMode: ViewMode;
    timeRange: TimeRange;
    selectedMonth: string;
}

const BingAdsTile: React.FC<BingAdsTileProps> = ({ allData, viewMode, timeRange, selectedMonth }) => {
    // Time Range Mode: Aggregate data across multiple months
    const aggregatedData = useMemo(() => {
        if (viewMode !== 'time' || !allData || allData.length === 0) return null;

        // Exclude current partial month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const fullMonthsData = allData.filter(record => {
            const recordDate = new Date(record.Date);
            const recordMonth = recordDate.getMonth();
            const recordYear = recordDate.getFullYear();
            return !(recordYear === currentYear && recordMonth === currentMonth);
        });

        const months = parseInt(timeRange, 10);
        const relevantData = fullMonthsData.slice(-months);
        if (relevantData.length === 0) return null;

        // Sum all metrics
        const aggregated = relevantData.reduce((acc, record) => {
            acc.Cost += record.Cost || 0;
            acc.Revenue += (record.Cost || 0) * (record.ROAS || 0);
            acc.Clicks += record.Clicks || 0;
            acc.Conversions += record.Conversions || 0;
            return acc;
        }, { Cost: 0, Revenue: 0, Clicks: 0, Conversions: 0 });

        // Calculate derived metrics
        const ROAS = aggregated.Cost > 0 ? aggregated.Revenue / aggregated.Cost : 0;
        const AvgCPC = aggregated.Clicks > 0 ? aggregated.Cost / aggregated.Clicks : 0;

        return {
            cost: aggregated.Cost,
            avgCPC: AvgCPC,
            roas: ROAS,
            conversions: aggregated.Conversions,
        };
    }, [allData, timeRange, viewMode]);

    // Month Mode: Single month data
    const monthlyData = useMemo(() => {
        if (viewMode !== 'month' || !allData || !selectedMonth) return null;
        const record = allData.find(d => d.Date === selectedMonth);
        if (!record) return null;

        return {
            cost: record.Cost || 0,
            avgCPC: record.AvgCPC || 0,
            roas: record.ROAS || 0,
            conversions: record.Conversions || 0,
        };
    }, [allData, selectedMonth, viewMode]);

    const displayData = viewMode === 'time' ? aggregatedData : monthlyData;

    if (!displayData) {
        return <div>No data available</div>;
    }

    const { cost, avgCPC, roas, conversions } = displayData;

    return (
        <div className="h-full flex items-center justify-center p-6">
            <div className="w-full bg-[var(--color-bg-secondary)] rounded-lg p-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <div className="text-[var(--color-text-secondary)] text-sm mb-1">Cost</div>
                        <div className="text-3xl font-bold text-white">${cost.toFixed(0)}</div>
                    </div>
                    <div>
                        <div className="text-[var(--color-text-secondary)] text-sm mb-1">Avg. CPC</div>
                        <div className="text-3xl font-bold text-white">${avgCPC.toFixed(2)}</div>
                    </div>
                    <div>
                        <div className="text-[var(--color-text-secondary)] text-sm mb-1">ROAS</div>
                        <div className="text-3xl font-bold text-white">{roas.toFixed(2)}x</div>
                    </div>
                    <div>
                        <div className="text-[var(--color-text-secondary)] text-sm mb-1">Conversions</div>
                        <div className="text-3xl font-bold text-white">{conversions.toFixed(0)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BingAdsTile;
```

### Step 12: Update Dashboard Component (`components/Dashboard.tsx`)

**12a. Import the tile component and types** (top of file):

```typescript
import { BingAdsRecord } from '../types';
import BingAdsTile from './BingAdsTile';
```

**12b. Add to props interface** (around line 185):

```typescript
interface DashboardProps {
    // ... existing props
    googleAdsData: GoogleAdsRecord[] | null;
    bingAdsData: BingAdsRecord[] | null;  // Add here
    isModalOpen: boolean;
    setIsModalOpen: (isOpen: boolean) => void;
}
```

**12c. Add to component destructuring** (around line 190):

```typescript
const Dashboard: React.FC<DashboardProps> = ({
    clientData,
    // ... other props
    googleAdsData,
    bingAdsData,  // Add here
    isModalOpen,
    setIsModalOpen
}) => {
```

**12d. Add tile definition** to `allOverviewTileDefs` (around line 25):

```typescript
const allOverviewTileDefs: { [key: string]: { title: string; subtitle?: string } } = {
    snapshot_and_links: { title: '📊 Dashboard Snapshot & Links' },
    // ... other tiles
    google_ads: { title: '📢 Google Ads Performance', subtitle: 'Parts vs. Accessories' },
    bing_ads: { title: '🔵 Bing Ads Performance' },  // Add here
};
```

**12e. Add to default visible tiles** (around line 38):

```typescript
const defaultVisibleOverviewTileIds = [
    'snapshot_and_links',
    // ... other tiles
    'google_ads',
    'bing_ads'  // Add here
];
```

**12f. Add to initial layout** (around line 54):

```typescript
const initialOverviewLayouts = {
    lg: [
        // ... existing layout items
        { i: 'organic_details', x: 0, y: 4, w: 2, h: 1, minH: 1 },
        { i: 'bing_ads', x: 0, y: 5, w: 1, h: 1 },  // Add here
    ],
};
```

**12g. Add state for view controls** (around line 269):

```typescript
const [bingAdsTimeRange, setBingAdsTimeRange] = useState<GoogleAdsTimeRange>(() =>
    (localStorage.getItem('dashboard-bing-ads-time-range-v1') as GoogleAdsTimeRange) || '3'
);
const [bingAdsViewMode, setBingAdsViewMode] = useState<'time' | 'month'>(() =>
    (localStorage.getItem('dashboard-bing-ads-view-mode-v1') as 'time' | 'month') || 'time'
);
const [bingAdsSelectedMonth, setBingAdsSelectedMonth] = useState<string>(() =>
    localStorage.getItem('dashboard-bing-ads-selected-month-v1') || ''
);
```

**12h. Add localStorage persistence** (around line 325):

```typescript
useEffect(() => {
    localStorage.setItem('dashboard-bing-ads-time-range-v1', bingAdsTimeRange);
}, [bingAdsTimeRange]);
useEffect(() => {
    localStorage.setItem('dashboard-bing-ads-view-mode-v1', bingAdsViewMode);
}, [bingAdsViewMode]);
useEffect(() => {
    localStorage.setItem('dashboard-bing-ads-selected-month-v1', bingAdsSelectedMonth);
}, [bingAdsSelectedMonth]);
```

**12i. Add month initialization useEffect** (around line 371):

```typescript
useEffect(() => {
    if (bingAdsData && bingAdsData.length > 0) {
        const availableMonths = bingAdsData.map(d => d.Date);
        if (!bingAdsSelectedMonth || !availableMonths.includes(bingAdsSelectedMonth)) {
            setBingAdsSelectedMonth(bingAdsData[bingAdsData.length - 1].Date);
        }
    }
}, [bingAdsData, bingAdsSelectedMonth]);
```

**12j. Add to fullOverviewTileDefs** (around line 756):

```typescript
const fullOverviewTileDefs = {
    // ... other tiles
    google_ads: { comp: googleAdsData ? <GoogleAdsTile ... /> : null },
    bing_ads: {
        comp: bingAdsData ?
            <BingAdsTile
                allData={bingAdsData}
                viewMode={bingAdsViewMode}
                timeRange={bingAdsTimeRange}
                selectedMonth={bingAdsSelectedMonth}
            /> : null
    },
};
```

**12k. Add header controls** (around line 896):

```typescript
} else if (id === 'bing_ads') {
    headerControls = (
        <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/20 p-1 rounded-lg">
                <button
                    onClick={() => setBingAdsViewMode('time')}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                        bingAdsViewMode === 'time' ?
                        'bg-[var(--color-accent)] text-white' :
                        'text-[var(--color-text-secondary)] hover:bg-white/10'
                    }`}
                >
                    Time Range
                </button>
                <button
                    onClick={() => setBingAdsViewMode('month')}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${
                        bingAdsViewMode === 'month' ?
                        'bg-[var(--color-accent)] text-white' :
                        'text-[var(--color-text-secondary)] hover:bg-white/10'
                    }`}
                >
                    Month
                </button>
            </div>
            {bingAdsViewMode === 'time' ? (
                <select
                    value={bingAdsTimeRange}
                    onChange={e => setBingAdsTimeRange(e.target.value as GoogleAdsTimeRange)}
                    className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-1.5"
                >
                    <option value="1">Last Month</option>
                    <option value="3">Last 3 Months</option>
                    <option value="6">Last 6 Months</option>
                    <option value="9">Last 9 Months</option>
                    <option value="12">Last 12 Months</option>
                </select>
            ) : (
                <select
                    value={bingAdsSelectedMonth}
                    onChange={e => setBingAdsSelectedMonth(e.target.value)}
                    className="text-xs bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] rounded-lg p-1.5"
                >
                    {bingAdsData && [...bingAdsData].reverse().map(d => (
                        <option key={d.Date} value={d.Date}>
                            {new Date(d.Date).toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                                timeZone: 'UTC'
                            })}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}
```

### Step 13: Version Bump for localStorage Reset (Optional)

If you need to reset user's saved preferences to show the new tile by default:

In `Dashboard.tsx`, update localStorage version keys:
- `dashboard-selected-overview-v5` → `v6`
- `dashboard-overview-layouts-v8` → `v9`

### Common Patterns to Follow

1. **Data Flow**: Google Sheets → processingFunction → state → Dashboard → Tile Component
2. **Naming Convention**: Use consistent naming across all files (e.g., `bingAds` everywhere)
3. **Error Handling**: Always include error state and display errors to user
4. **Time Range Logic**: Exclude current partial month when aggregating
5. **Month Initialization**: Use useEffect to set initial selectedMonth when data loads
6. **LocalStorage Keys**: Use versioned keys (v1, v2, etc.) for cache invalidation

### Testing Checklist

- [ ] Data fetches from Google Sheets without errors
- [ ] Tile appears in Client Overview section
- [ ] Time Range mode aggregates data correctly
- [ ] Month mode shows individual month data
- [ ] Switching between Time Range and Month works
- [ ] Tile appears in Customize Dashboard modal
- [ ] Dragging and resizing works
- [ ] Data persists after page refresh
- [ ] CSV upload works (if applicable)