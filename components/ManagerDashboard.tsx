import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ClientDataRecord, AccountDetailsRecord, KeyContactRecord, Theme, ManagerDashboardState } from '../types';

// --- Type Definitions ---
interface ManagerDashboardProps {
    allPerformanceData: ClientDataRecord[];
    allAccountDetails: AccountDetailsRecord[];
    allKeyContactsData: KeyContactRecord[];
    onSelectClient: (clientName: string) => void;
    theme: Theme;
    toolState: ManagerDashboardState;
    onStateChange: (newState: Partial<ManagerDashboardState>) => void;
}

type SortableKeys = 'clientName' | 'currentRevenue' | 'projectedRevenue' | 'lastYearRevenue' | 'lastMonthRevenue' | 'avg3mo' | 'avg6mo' | 'avg12mo' | 'threeMoTrend' | 'sixMoTrend' | 'twelveMoTrend';

// --- Helper Functions ---
const monthMap: { [key: string]: number } = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };

const formatCurrency = (value: number | undefined) => {
    if (value === undefined || isNaN(value) || !isFinite(value)) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const calculateProjectedMonth = (record: ClientDataRecord | null): ClientDataRecord | null => {
    if (!record) return null;
    const daysOfData = record.Days_of_Data;
    if (typeof daysOfData === 'number' && daysOfData > 0) {
        const date = new Date(record.Year, monthMap[record.Month.substring(0, 3)]);
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        if (daysOfData < daysInMonth) {
            const projectionFactor = daysInMonth / daysOfData;
            return {
                ...record,
                Revenue: (record.Revenue || 0) * projectionFactor,
            };
        }
    }
    return record;
};

// --- Sparkline Component ---
const Sparkline: React.FC<{ data: number[]; isPositive: boolean }> = ({ data, isPositive }) => {
    if (!data || data.length < 2) {
        return <div className="w-24 h-8" />;
    }

    const svgWidth = 100;
    const svgHeight = 25;
    const padding = 2;

    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal;

    const yFactor = range === 0 ? 0 : (svgHeight - padding * 2) / range;
    const xStep = (svgWidth - padding * 2) / (data.length - 1);

    const points = data
        .map((d, i) => {
            const x = i * xStep + padding;
            const y = svgHeight - ((d - minVal) * yFactor) - padding;
            return `${x},${y}`;
        })
        .join(' ');
        
    const color = isPositive ? 'var(--color-positive)' : 'var(--color-negative)';

    return (
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-24 h-8 mx-auto">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};


// --- Main Component ---
const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ allPerformanceData, allAccountDetails, allKeyContactsData, onSelectClient, theme, toolState, onStateChange }) => {
    const { role: selectedRole, manager: selectedManager, revenueFilter, comparisonMode, isTrendVisible, isCurrentMonthVisible, columnOrder, brandFilter } = toolState;

    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>({ key: 'clientName', direction: 'ascending' });
    
    const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef<HTMLDivElement>(null);
    
    const [draggedCol, setDraggedCol] = useState<SortableKeys | null>(null);
    const [dragOverCol, setDragOverCol] = useState<SortableKeys | null>(null);

     // Handle clicks outside dropdowns to close them
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (displayMenuRef.current && !displayMenuRef.current.contains(event.target as Node)) {
                setIsDisplayMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const managers = useMemo(() => {
        if (!selectedRole) return [];
        if (selectedRole === 'All') {
            return ['All Clients'];
        }
        
        // Use the Settings sheet as the master list of active clients
        const allClientsFromSettings = new Set(allAccountDetails.map(d => d.ClientName));
        
        // Get managers only from active clients listed in the Settings sheet
        const managerNames = allKeyContactsData
            .filter(contact => allClientsFromSettings.has(contact.ClientName))
            .map(contact => contact[selectedRole as 'PPC' | 'PDM'])
            .filter(Boolean) as string[];
        
        return ['All Clients', ...[...new Set(managerNames)].sort()];
    }, [selectedRole, allKeyContactsData, allAccountDetails]);

    const availableBrands = useMemo(() => {
        const brandSet = new Set<string>();
        
        allAccountDetails.forEach(account => {
            if (account.Brands) {
                // Split by comma and trim whitespace
                const brands = account.Brands.split(',').map(brand => brand.trim()).filter(brand => brand.length > 0);
                brands.forEach(brand => brandSet.add(brand));
            }
        });
        
        return ['All Brands', ...Array.from(brandSet).sort()];
    }, [allAccountDetails]);
    
    const comparisonPeriodTooltips = useMemo(() => {
        const defaults = { mom: 'MOM', yoy: 'YOY' };
        if (allPerformanceData.length < 2) return defaults;
    
        const allMonths = [...new Set(allPerformanceData.map(d => `${d.Year}-${String(monthMap[d.Month.substring(0, 3)] + 1).padStart(2, '0')}-01`))];
        allMonths.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
        const formatShort = (date: Date) => date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
        const formatYear = (date: Date) => `'${String(date.getFullYear()).slice(-2)}`;
    
        if (comparisonMode === 'projected') {
            if (allMonths.length < 2) return { mom: 'Projected vs Last Month', yoy: 'Projected vs Same Month Last Year' };
            
            const currentMonthDate = new Date(allMonths[0]);
            const lastCompletedMonthDate = new Date(allMonths[1]);
            const lastYearOfCurrentMonthDate = new Date(currentMonthDate);
            lastYearOfCurrentMonthDate.setFullYear(lastYearOfCurrentMonthDate.getFullYear() - 1);
    
            const momTooltip = `${formatShort(currentMonthDate)} ${formatYear(currentMonthDate)} (Proj.) vs ${formatShort(lastCompletedMonthDate)} ${formatYear(lastCompletedMonthDate)}`;
            const yoyTooltip = `${formatShort(currentMonthDate)} ${formatYear(currentMonthDate)} (Proj.) vs ${formatYear(lastYearOfCurrentMonthDate)}`;
            
            return { mom: momTooltip, yoy: yoyTooltip };
    
        } else { // 'lastCompleted'
            if (allMonths.length < 3) return { mom: 'Last Month vs Prior Month', yoy: 'Last Month vs Same Month Last Year' };
    
            const lastCompletedMonthDate = new Date(allMonths[1]);
            const prevToLastCompletedMonthDate = new Date(allMonths[2]);
            const lastYearOfCompletedMonthDate = new Date(lastCompletedMonthDate);
            lastYearOfCompletedMonthDate.setFullYear(lastYearOfCompletedMonthDate.getFullYear() - 1);
    
            const momTooltip = `${formatShort(lastCompletedMonthDate)} vs ${formatShort(prevToLastCompletedMonthDate)} ${formatYear(lastCompletedMonthDate)}`;
            const yoyTooltip = `${formatShort(lastCompletedMonthDate)} ${formatYear(lastCompletedMonthDate)} vs ${formatYear(lastYearOfCompletedMonthDate)}`;
            
            return { mom: momTooltip, yoy: yoyTooltip };
        }
    }, [allPerformanceData, comparisonMode]);

    const dynamicHeaders = useMemo(() => {
        const formatDate = (date: Date) => date.toLocaleString('default', { month: 'short', year: 'numeric' });
        const now = new Date();
        const defaultHeaders = {
            referenceDates: {
                current: now,
                lastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
                lastYear: new Date(now.getFullYear() - 1, now.getMonth(), 1),
            },
            headerStrings: {
                current: 'Current Revenue',
                projected: 'Projected Revenue',
                lastMonth: 'Last Month',
                lastYear: "Last Year's Revenue",
            }
        };

        if (!selectedManager) return defaultHeaders;

        const allClientsFromSettings = new Set(allAccountDetails.map(d => d.ClientName));
        let clientList: string[] = [];
        
        if (selectedRole === 'All') {
            clientList = Array.from(allClientsFromSettings);
        } else if (selectedManager === 'All Clients') {
            const clientNamesForRole = new Set(
                allKeyContactsData
                    .filter(contact => contact[selectedRole as 'PPC' | 'PDM'] && contact[selectedRole as 'PPC' | 'PDM']!.trim() !== '')
                    .map(contact => contact.ClientName)
            );
            clientList = Array.from(clientNamesForRole).filter(name => allClientsFromSettings.has(name));
        } else {
            const clientNamesForManager = new Set(
                allKeyContactsData
                    .filter(contact => contact[selectedRole as 'PPC' | 'PDM'] === selectedManager)
                    .map(contact => contact.ClientName)
            );
            clientList = Array.from(clientNamesForManager).filter(name => allClientsFromSettings.has(name));
        }


        const managerClients = new Set(clientList);
        const relevantData = allPerformanceData.filter(d => managerClients.has(d.ClientName));
        if (relevantData.length === 0) return defaultHeaders;

        let latestDate = new Date(1970, 0, 1);
        relevantData.forEach(d => {
            const recordDate = new Date(d.Year, monthMap[d.Month.substring(0, 3)]);
            if (recordDate > latestDate) {
                latestDate = recordDate;
            }
        });

        const lastMonthDate = new Date(latestDate);
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

        const lastYearDate = new Date(latestDate);
        lastYearDate.setFullYear(lastYearDate.getFullYear() - 1);

        return {
            referenceDates: {
                current: latestDate,
                lastMonth: lastMonthDate,
                lastYear: lastYearDate,
            },
            headerStrings: {
                current: formatDate(latestDate),
                projected: `${formatDate(latestDate)} (Proj.)`,
                lastMonth: formatDate(lastMonthDate),
                lastYear: formatDate(lastYearDate),
            }
        };
    }, [selectedManager, selectedRole, allPerformanceData, allKeyContactsData, allAccountDetails]);
    
    const trendPeriodTooltips = useMemo(() => {
        const defaults = {
            '3mo': 'Compare vs Avg of prior 3 months',
            '6mo': 'Compare vs Avg of prior 6 months',
            '12mo': 'Compare vs Avg of prior 12 months',
        };
    
        if (allPerformanceData.length < 2) return defaults;
    
        const allMonths = [...new Set(allPerformanceData.map(d => `${d.Year}-${String(monthMap[d.Month.substring(0, 3)] + 1).padStart(2, '0')}-01`))];
        allMonths.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
        const formatShort = (date: Date) => date.toLocaleString('default', { month: 'short', timeZone: 'UTC' });
        const formatYear = (date: Date) => `'${String(date.getFullYear()).slice(-2)}`;
    
        const createAvgRangeStr = (months: number, baseIndex: number) => {
            if (allMonths.length < baseIndex + months) return `Avg of prior ${months} full months`;
            
            const endOfRangeDate = new Date(allMonths[baseIndex]);
            const startOfRangeDate = new Date(allMonths[baseIndex + months - 1]);
    
            const endStr = `${formatShort(endOfRangeDate)} ${formatYear(endOfRangeDate)}`;
            const startStr = `${formatShort(startOfRangeDate)}`;
            
            return `Avg of ${startStr} - ${endStr}`;
        };
    
        if (comparisonMode === 'projected') {
            if (allMonths.length < 2) return defaults;
            const currentMonthDate = new Date(allMonths[0]);
            const comparisonMonthStr = `${formatShort(currentMonthDate)} ${formatYear(currentMonthDate)} (Proj.)`;
            return {
                '3mo': `${comparisonMonthStr} vs ${createAvgRangeStr(3, 1)}`,
                '6mo': `${comparisonMonthStr} vs ${createAvgRangeStr(6, 1)}`,
                '12mo': `${comparisonMonthStr} vs ${createAvgRangeStr(12, 1)}`,
            };
        } else { // 'lastCompleted'
            if (allMonths.length < 3) return defaults;
            const lastCompletedMonthDate = new Date(allMonths[1]);
            const comparisonMonthStr = `${formatShort(lastCompletedMonthDate)} ${formatYear(lastCompletedMonthDate)}`;
            return {
                '3mo': `${comparisonMonthStr} vs ${createAvgRangeStr(3, 2)}`,
                '6mo': `${comparisonMonthStr} vs ${createAvgRangeStr(6, 2)}`,
                '12mo': `${comparisonMonthStr} vs ${createAvgRangeStr(12, 2)}`,
            };
        }
    }, [allPerformanceData, comparisonMode]);


    const tableData = useMemo(() => {
        if (!selectedManager) return [];
        
        const allClientsFromSettings = new Set(allAccountDetails.map(d => d.ClientName));
        let clientList: string[] = [];

        if (selectedRole === 'All') {
            clientList = Array.from(allClientsFromSettings);
        } else if (selectedManager === 'All Clients') {
            const clientNamesForRole = new Set(
                allKeyContactsData
                    .filter(contact => contact[selectedRole as 'PPC' | 'PDM'] && contact[selectedRole as 'PPC' | 'PDM']!.trim() !== '')
                    .map(contact => contact.ClientName)
            );
            clientList = Array.from(clientNamesForRole).filter(name => allClientsFromSettings.has(name));
        } else {
            const clientNamesForManager = new Set(
                allKeyContactsData
                    .filter(contact => contact[selectedRole as 'PPC' | 'PDM'] === selectedManager)
                    .map(contact => contact.ClientName)
            );
            clientList = Array.from(clientNamesForManager).filter(name => allClientsFromSettings.has(name));
        }

        // Filter by brand if a specific brand is selected
        if (brandFilter && brandFilter !== 'All Brands') {
            const clientsWithBrand = new Set<string>();
            allAccountDetails.forEach(account => {
                if (account.Brands) {
                    const brands = account.Brands.split(',').map(brand => brand.trim());
                    if (brands.includes(brandFilter)) {
                        clientsWithBrand.add(account.ClientName);
                    }
                }
            });
            clientList = clientList.filter(clientName => clientsWithBrand.has(clientName));
        }

        return clientList.map(clientName => {
            const clientPerformance = allPerformanceData.filter(d => d.ClientName === clientName);
            const sortedPerformance = [...clientPerformance].sort((a, b) => new Date(b.Year, monthMap[b.Month.substring(0, 3)]).getTime() - new Date(a.Year, monthMap[a.Month.substring(0, 3)]).getTime());
            
            const latestMonthRaw = sortedPerformance[0];
            const lastCompletedMonth = sortedPerformance[1];
            const prevToLastCompletedMonth = sortedPerformance[2];
            
            const historicalData = sortedPerformance.slice(1);
            const historicalDataForAvg = sortedPerformance.slice(2);

            const findRecord = (date: Date) => {
                const year = date.getFullYear();
                const monthIndex = date.getMonth();
                return clientPerformance.find(d => d.Year === year && monthMap[d.Month.substring(0, 3)] === monthIndex);
            };
            
            const latestMonthProjected = calculateProjectedMonth(latestMonthRaw || null);
            
            const calculateChange = (currentVal: number | undefined, previousVal: number | undefined) => {
                if (currentVal === undefined || previousVal === undefined || previousVal === 0) return Infinity;
                return (currentVal - previousVal) / previousVal;
            };

            const calculateAverage = (data: ClientDataRecord[], months: number): number | undefined => {
                if (data.length < months) return undefined;
                const relevantRecords = data.slice(0, months);
                const sum = relevantRecords.reduce((acc, r) => acc + (r.Revenue || 0), 0);
                return sum / months;
            };

            const getTrendData = (data: ClientDataRecord[], months: number): number[] => {
                if (data.length < months) return [];
                return data.slice(0, months).map(r => r.Revenue || 0).reverse();
            };

            // ---- Dynamic Comparison Logic ----
            const comparisonBaseRecord = comparisonMode === 'projected' ? latestMonthProjected : lastCompletedMonth;

            // MOM
            const momComparisonRecord = comparisonMode === 'projected' ? lastCompletedMonth : prevToLastCompletedMonth;
            const momChange = calculateChange(comparisonBaseRecord?.Revenue, momComparisonRecord?.Revenue);

            // YOY
            const yoyBaseDate = comparisonMode === 'projected' 
                ? (latestMonthRaw ? new Date(latestMonthRaw.Year, monthMap[latestMonthRaw.Month.substring(0, 3)]) : null) 
                : (lastCompletedMonth ? new Date(lastCompletedMonth.Year, monthMap[lastCompletedMonth.Month.substring(0, 3)]) : null);
            const yoyComparisonDate = yoyBaseDate ? new Date(yoyBaseDate.getFullYear() - 1, yoyBaseDate.getMonth(), 1) : null;
            const yoyComparisonRecord = yoyComparisonDate ? findRecord(yoyComparisonDate) : undefined;
            const yoyChange = calculateChange(comparisonBaseRecord?.Revenue, yoyComparisonRecord?.Revenue);

            // Averages for Trend
            const dataForAverages = comparisonMode === 'projected' ? historicalData : historicalDataForAvg;
            const avg3mo = calculateAverage(dataForAverages, 3);
            const avg6mo = calculateAverage(dataForAverages, 6);
            const avg12mo = calculateAverage(dataForAverages, 12);
            
            const avg3moChange = calculateChange(comparisonBaseRecord?.Revenue, avg3mo);
            const avg6moChange = calculateChange(comparisonBaseRecord?.Revenue, avg6mo);
            const avg12moChange = calculateChange(comparisonBaseRecord?.Revenue, avg12mo);
            // ---- End Dynamic Comparison Logic ----

            const threeMoTrendData = getTrendData(historicalData, 3);
            const sixMoTrendData = getTrendData(historicalData, 6);
            const twelveMoTrendData = getTrendData(historicalData, 12);

            return {
                clientName,
                currentRevenue: latestMonthRaw?.Revenue || 0,
                projectedRevenue: latestMonthProjected?.Revenue || 0,
                isProjected: latestMonthRaw?.Revenue !== latestMonthProjected?.Revenue,
                lastYearRevenue: yoyComparisonRecord?.Revenue,
                lastMonthRevenue: momComparisonRecord?.Revenue,
                avg3mo,
                avg6mo,
                avg12mo,
                momChange,
                yoyChange,
                avg3moChange,
                avg6moChange,
                avg12moChange,
                threeMoTrendData,
                sixMoTrendData,
                twelveMoTrendData,
            };
        });

    }, [selectedManager, selectedRole, allPerformanceData, allKeyContactsData, allAccountDetails, comparisonMode, brandFilter]);

    const sortedTableData = useMemo(() => {
        let sortableItems = [...tableData];

        if (revenueFilter !== 'none') {
            sortableItems = sortableItems.filter(item => {
                if (revenueFilter === '3m') {
                    return item.avg3mo !== undefined && item.projectedRevenue < item.avg3mo;
                }
                if (revenueFilter === '6m') {
                    return item.avg6mo !== undefined && item.projectedRevenue < item.avg6mo;
                }
                if (revenueFilter === '12m') {
                    return item.avg12mo !== undefined && item.projectedRevenue < item.avg12mo;
                }
                return true; // Should not happen with current filter values
            });
        }
        
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let valA, valB;

                switch (sortConfig.key) {
                    case 'lastMonthRevenue': valA = a.momChange; valB = b.momChange; break;
                    case 'lastYearRevenue': valA = a.yoyChange; valB = b.yoyChange; break;
                    case 'avg3mo': valA = a.avg3moChange; valB = b.avg3moChange; break;
                    case 'avg6mo': valA = a.avg6moChange; valB = b.avg6moChange; break;
                    case 'avg12mo': valA = a.avg12moChange; valB = b.avg12moChange; break;
                    default: valA = a[sortConfig.key]; valB = b[sortConfig.key];
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                     return sortConfig.direction === 'ascending' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [tableData, sortConfig, revenueFilter]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) return null;
        return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onStateChange({ role: e.target.value as 'PPC' | 'PDM' | 'All' | '', manager: 'All Clients' });
    };
    
    const handleColDragStart = (e: React.DragEvent<HTMLTableCellElement>, colKey: SortableKeys) => {
        e.dataTransfer.effectAllowed = 'move';
        setDraggedCol(colKey);
    };

    const handleColDragOver = (e: React.DragEvent<HTMLTableCellElement>, colKey: SortableKeys) => {
        e.preventDefault();
        if (draggedCol && colKey !== dragOverCol) {
            setDragOverCol(colKey);
        }
    };

    const handleColDrop = (e: React.DragEvent<HTMLTableCellElement>, targetColKey: SortableKeys) => {
        e.preventDefault();
        if (draggedCol && draggedCol !== targetColKey) {
            const newOrder = [...columnOrder];
            const draggedIndex = newOrder.indexOf(draggedCol);
            const targetIndex = newOrder.indexOf(targetColKey);
            const [removed] = newOrder.splice(draggedIndex, 1);
            newOrder.splice(targetIndex, 0, removed);
            onStateChange({ columnOrder: newOrder as string[] }); // Update via props
        }
        setDraggedCol(null);
        setDragOverCol(null);
    };

    const handleColDragEnd = () => {
        setDraggedCol(null);
        setDragOverCol(null);
    };

    const getDragClasses = (key: SortableKeys) => {
        let classes = 'transition-all';
        if (draggedCol === key) {
            classes += ' opacity-50 bg-[var(--color-accent)]/30';
        }
        if (dragOverCol === key && draggedCol && draggedCol !== key) {
            classes += ' bg-[var(--color-accent)]/20';
        }
        return classes;
    };
    
    const trendColumns: SortableKeys[] = ['threeMoTrend', 'sixMoTrend', 'twelveMoTrend'];

    const visibleColumnOrder = useMemo(() => {
        let columns = [...columnOrder];
        if (!isTrendVisible) {
            columns = columns.filter(key => !trendColumns.includes(key as SortableKeys));
        }
        if (!isCurrentMonthVisible) {
            columns = columns.filter(key => key !== 'currentRevenue');
        }
        return columns as SortableKeys[];
    }, [columnOrder, isTrendVisible, isCurrentMonthVisible]);

    if (allPerformanceData.length === 0 || allKeyContactsData.length === 0 || allAccountDetails.length === 0) {
        return <div className="text-center p-8 bg-black/20 rounded-lg"><h2 className="text-xl font-semibold mb-2">Data Required</h2><p className="text-[var(--color-text-secondary)]">Please load Website Data, Client Info, and Key Contacts data to use this tool.</p></div>;
    }

    const titles: Record<SortableKeys, string> = {
        clientName: 'Client',
        currentRevenue: dynamicHeaders.headerStrings.current,
        projectedRevenue: dynamicHeaders.headerStrings.projected,
        lastMonthRevenue: 'MOM',
        lastYearRevenue: 'YOY',
        avg3mo: '3mo',
        avg6mo: '6mo',
        avg12mo: '12mo',
        threeMoTrend: '3mo Trend',
        sixMoTrend: '6mo Trend',
        twelveMoTrend: '12mo Trend',
    };

    const PercentageChangeCell: React.FC<{ change: number; originalValue: number | undefined }> = ({ change, originalValue }) => {
        if (!isFinite(change) || originalValue === undefined) {
            return <span className="text-[var(--color-text-primary)]">-</span>;
        }

        const isPositive = change >= 0;
        const colorClass = isPositive ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]';
        const icon = isPositive ? '▲' : '▼';
        const formattedChange = `${Math.abs(change * 100).toFixed(2)}%`;

        return (
            <div className={`flex items-center justify-center gap-1 font-mono ${colorClass} group relative`}>
                <span>{icon}</span>
                <span>{formattedChange}</span>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max hidden group-hover:block text-sm font-semibold rounded-md py-2 px-4 shadow-lg z-10 border-2 manager-tooltip" style={{ zIndex: 50 }}>
                    {formatCurrency(originalValue)}
                </div>
            </div>
        );
    };

    const getBorderClasses = (key: SortableKeys) => {
        let classes = '';
        if (key === 'threeMoTrend' || key === 'sixMoTrend' || key === 'twelveMoTrend') {
            classes += ' border-l-2 border-[var(--color-border)]';
        }
        if (key === 'avg3mo' || key === 'avg6mo' || key === 'avg12mo') {
            classes += ' border-r-2 border-[var(--color-border)]';
        }
        return classes;
    };

    return (
        <section className="flex flex-col gap-8">
            <div className="bg-[var(--color-card-bg)] backdrop-blur-sm rounded-xl border border-[var(--color-border)] shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 max-w-7xl mx-auto">
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Role</label>
                        <select value={selectedRole} onChange={handleRoleChange} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5">
                            <option value="">Select Role</option>
                            <option value="All">All Roles</option>
                            <option value="PPC">PPC Manager</option>
                            <option value="PDM">PDM</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Manager</label>
                        <select value={selectedManager} onChange={e => onStateChange({ manager: e.target.value })} disabled={!selectedRole} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5 disabled:opacity-50">
                            <option value="">Select Manager</option>
                            {managers.map(manager => <option key={manager} value={manager}>{manager}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Brand</label>
                        <select value={brandFilter || 'All Brands'} onChange={e => onStateChange({ brandFilter: e.target.value })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5">
                            {availableBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Revenue Filter</label>
                        <select value={revenueFilter} onChange={e => onStateChange({ revenueFilter: e.target.value as 'none' | '3m' | '6m' | '12m' })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5">
                            <option value="none">No Filter</option>
                            <option value="3m">Down vs 3 Month Avg</option>
                            <option value="6m">Down vs 6 Month Avg</option>
                            <option value="12m">Down vs 12 Month Avg</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Comparison Mode</label>
                        <select value={comparisonMode} onChange={e => onStateChange({ comparisonMode: e.target.value as 'lastCompleted' | 'projected' })} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] block p-2.5">
                            <option value="lastCompleted">Last Completed Month</option>
                            <option value="projected">Current Month Projection</option>
                        </select>
                    </div>
                     <div ref={displayMenuRef}>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">Display</label>
                        <div className="relative">
                            <button onClick={() => setIsDisplayMenuOpen(prev => !prev)} className="w-full bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-[var(--color-text-primary)] text-sm rounded-lg p-2.5 flex justify-between items-center">
                                <span>Display Options</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-[var(--color-text-secondary)] transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                             {isDisplayMenuOpen && (
                                <div className="absolute top-full mt-2 right-0 z-20 w-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg">
                                    <div className="p-4 space-y-2">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={isTrendVisible} onChange={e => onStateChange({ isTrendVisible: e.target.checked })} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" />
                                            <span className="text-sm font-medium text-[var(--color-text-primary)]">Trend Columns</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" checked={isCurrentMonthVisible} onChange={e => onStateChange({ isCurrentMonthVisible: e.target.checked })} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]" />
                                            <span className="text-sm font-medium text-[var(--color-text-primary)]">Current Month</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {selectedManager ? (
                 <div className="overflow-x-auto bg-[var(--color-card-bg)] p-4 rounded-lg border border-[var(--color-border)]">
                    <table key={visibleColumnOrder.length} className="w-full text-sm whitespace-nowrap table-auto mt-8">
                        <thead className="border-b-2 border-[var(--color-border)]">
                            <tr className="mt-4">
                                {visibleColumnOrder.map(key => {
                                    const textAlign = key === 'clientName' ? 'left' : 'center';
                                    const isClientCol = key === 'clientName';
                                    return (
                                        <th 
                                            key={key}
                                            className={`p-4 font-semibold uppercase text-[var(--color-text-secondary)] tracking-wider text-${textAlign} relative group cursor-grab ${getDragClasses(key)} ${isClientCol ? 'sticky left-0 z-20 bg-[var(--color-bg-secondary)]' : ''} ${getBorderClasses(key)}`}
                                            draggable
                                            onDragStart={e => handleColDragStart(e, key)}
                                            onDragOver={e => handleColDragOver(e, key)}
                                            onDrop={e => handleColDrop(e, key)}
                                            onDragEnd={handleColDragEnd}
                                        >
                                            <button onClick={() => requestSort(key)} className={`w-full text-${textAlign} cursor-pointer`}>
                                                <span className="group relative">
                                                    {titles[key]}
                                                    {key === 'lastYearRevenue' && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max hidden group-hover:block text-sm font-semibold rounded-md py-2 px-4 shadow-lg z-10 border-2 manager-tooltip" style={{ zIndex: 50 }}>{comparisonPeriodTooltips.yoy}</span>}
                                                    {key === 'lastMonthRevenue' && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max hidden group-hover:block text-sm font-semibold rounded-md py-2 px-4 shadow-lg z-10 border-2 manager-tooltip" style={{ zIndex: 50 }}>{comparisonPeriodTooltips.mom}</span>}
                                                    {key === 'avg3mo' && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max hidden group-hover:block text-sm font-semibold rounded-md py-2 px-4 shadow-lg z-10 border-2 manager-tooltip" style={{ zIndex: 50 }}>{trendPeriodTooltips['3mo']}</span>}
                                                    {key === 'avg6mo' && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max hidden group-hover:block text-sm font-semibold rounded-md py-2 px-4 shadow-lg z-10 border-2 manager-tooltip" style={{ zIndex: 50 }}>{trendPeriodTooltips['6mo']}</span>}
                                                    {key === 'avg12mo' && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max hidden group-hover:block text-sm font-semibold rounded-md py-2 px-4 shadow-lg z-10 border-2 manager-tooltip" style={{ zIndex: 50 }}>{trendPeriodTooltips['12mo']}</span>}
                                                </span>
                                                {getSortIndicator(key)}
                                            </button>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {sortedTableData.map(data => (
                                <tr key={data.clientName} className="hover:bg-[var(--color-bg-secondary)] transition-colors">
                                    {visibleColumnOrder.map(key => {
                                        let cellContent: React.ReactNode;
                                        const textAlignClass = key === 'clientName' ? 'text-left' : 'text-center';
                                        let className = `p-4 ${textAlignClass} ${getBorderClasses(key)}`;
        
                                        switch (key) {
                                            case 'clientName':
                                                className += ' font-semibold truncate sticky left-0 z-10 bg-[var(--color-bg-secondary)]';
                                                cellContent = (
                                                    <button onClick={() => onSelectClient(data.clientName)} className="text-[var(--color-text-accent)] hover:underline">
                                                        {data.clientName}
                                                    </button>
                                                );
                                                break;
                                            case 'projectedRevenue':
                                                className += ' font-mono text-[var(--color-text-primary)]';
                                                cellContent = (
                                                    <span className="flex items-center justify-center gap-2">
                                                        {data.isProjected && <span title="Projected value">🔮</span>}
                                                        {formatCurrency(data.projectedRevenue)}
                                                    </span>
                                                );
                                                break;
                                            case 'currentRevenue':
                                                className += ' font-mono text-[var(--color-text-primary)]';
                                                cellContent = formatCurrency(data.currentRevenue);
                                                break;
                                            case 'lastMonthRevenue':
                                                cellContent = <PercentageChangeCell change={data.momChange} originalValue={data.lastMonthRevenue} />;
                                                break;
                                            case 'lastYearRevenue':
                                                cellContent = <PercentageChangeCell change={data.yoyChange} originalValue={data.lastYearRevenue} />;
                                                break;
                                            case 'avg3mo':
                                                cellContent = <PercentageChangeCell change={data.avg3moChange} originalValue={data.avg3mo} />;
                                                break;
                                            case 'avg6mo':
                                                cellContent = <PercentageChangeCell change={data.avg6moChange} originalValue={data.avg6mo} />;
                                                break;
                                            case 'avg12mo':
                                                cellContent = <PercentageChangeCell change={data.avg12moChange} originalValue={data.avg12mo} />;
                                                break;
                                            case 'threeMoTrend':
                                                cellContent = <Sparkline data={data.threeMoTrendData} isPositive={data.avg3moChange >= 0} />;
                                                break;
                                            case 'sixMoTrend':
                                                cellContent = <Sparkline data={data.sixMoTrendData} isPositive={data.avg6moChange >= 0} />;
                                                break;
                                            case 'twelveMoTrend':
                                                cellContent = <Sparkline data={data.twelveMoTrendData} isPositive={data.avg12moChange >= 0} />;
                                                break;
                                            default:
                                                cellContent = '-';
                                        }
        
                                        return (
                                            <td key={key} className={className}>
                                                {cellContent}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <div className="text-center p-8 bg-black/20 rounded-lg">
                    <h2 className="text-xl font-semibold mb-2">Select Filters</h2>
                    <p className="text-[var(--color-text-secondary)]">Please select a role and manager to view the dashboard.</p>
                </div>
            )}
        </section>
    );
};
export default ManagerDashboard;