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