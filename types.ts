import { FunctionDeclaration } from "@google/genai";

export interface Theme {
  id: string;
  name: string;
  colors: { [key: string]: string };
}

export interface UserRecord {
  name: string;
  email: string;
}

export interface ClientDataRecord {
  ClientName: string;
  Dashboard?: string;
  Month: string;
  Start?: string;
  End?: string;
  Orders: number;
  Revenue: number;
  Canceled?: number;
  Avg_Fulfillment?: number;
  Profit: number;
  Clean_Fulfillment?: string;
  MonthNumber?: number;
  Quarter?: string;
  Year: number;
  PPC_Spend: number;
  Sessions: number;
  Conv_Rate: number;
  AOV: number;
  Pricing?: string;
  Shipping?: string;
  Orders_Canceled?: number;
  RP_Store_Hash?: string;
  Pricing_Changes?: string;
  Shipping_Changes?: string;
  Strategy_Notes?: string;
  Other_Notes?: string;
  Days_of_Data?: number;
  Projected_Revenue?: number;
  Projected_Orders?: number;
  // Calculated fields
  ROAS?: number;
  Profit_Margin?: number;
  Profit_Per_Order?: number;
  isProjection?: boolean;
  isActuals?: boolean;
  changes?: { [key: string]: 'positive' | 'negative' | 'neutral' };
}

export interface AccountDetailsRecord {
  ClientName: string;
  Website?: string;
  'Google Ads'?: string;
  GMC?: string;
  CurrentSEOPackage?: string;
  AutoGroup?: string;
  Brands?: string;
  Bing?: string;
  State?: string;
  ShippingMethods?: string;
  SignatureSurcharge?: number | string;
  HazmatSurcharge?: number | string;
  AllowPOBox?: string;
  HandlingFee?: number | string;
  TAndC?: string;
  FitmentVerification?: string;
  RequiredField?: string;
}

export interface ItemsInFeedDataPoint {
  date: Date;
  count: number;
}

export interface AllItemsInFeedData {
  [clientName: string]: {
    merchantId?: string;
    timeline: ItemsInFeedDataPoint[];
  };
}

export interface Feed {
  name: string;
  lastUpdate: Date | 'Never';
}

export interface FeedStatus {
  lastChecked: Date;
  feeds: Feed[];
}

export interface AllFeedStatusData {
  [clientName: string]: FeedStatus;
}

export interface PercentApprovedRecord {
  percentApproved: number;
  date: Date;
}

export interface AllPercentApprovedData {
  [clientName: string]: PercentApprovedRecord[];
}

export interface StoreStatusRecord {
  status: string;
  banner: string;
  date: Date;
}

export interface AllStoreStatusData {
  [clientName: string]: StoreStatusRecord;
}

export interface CurrentStatusRecord {
  clientName: string;
  status: string;
  rowIndex: number;
}

export interface AllCurrentStatusData {
  [clientName: string]: CurrentStatusRecord;
}

export interface StoreChangesRecord {
    ClientName: string;
    LastPriceChange?: string;
    LastShippingChange?: string;
    LastSettingsChange?: string;
    LastCheckoutChange?: string;
    ShippingMethods?: string;
    HandlingFee?: number;
    SignatureSurcharge?: number;
    HazmatSurcharge?: number;
    AllowPOBox?: string;
    TAndC?: string;
    FitmentVerification?: string;
    RequiredField?: string;
    Date?: string;
}

export interface AllStoreChangesData {
  [clientName: string]: StoreChangesRecord;
}

export interface BudgetStatusRecord {
  ClientName: string;
  ppcBudget: number;
  googleSpend: number;
  bingSpend: number;
  percentSpent: number;
  targetSpend: number;
  projectedTotalSpend: number;
  spend2DaysAgo: number;
  yesterdaySpend: number;
  recDailyBudget: number;
}

export interface AllBudgetStatusData {
  [clientName: string]: BudgetStatusRecord;
}

export interface KeyContactRecord {
  ClientName: string;
  PPC?: 'PPC' | 'PDM' | '' | string;
  PDM?: 'PPC' | 'PDM' | '' | string;
  Deal?: string;
  'Hubspot Contact Name'?: string;
  'Hub Spot Contact ID'?: string;
  'Hubspot Contact Phone'?: string;
}

export interface RevolutionLinksRecord {
  ClientName: string;
  Dashboard?: string;
  Pricing?: string;
  Shipping?: string;
  Orders?: string;
  Products?: string;
  Pages?: string;
  Layouts?: string;
  Feeds?: string;
  Imports?: string;
  Checkout?: string;
  FileManager?: string;
  Promotions?: string;
}

export interface AllRevolutionLinksData {
  [clientName: string]: RevolutionLinksRecord;
}

export interface GoogleSearchConsoleRecord {
    ClientName: string;
    Website?: string;
    Date: string;
    Impressions: number;
    Clicks: number;
    Desktop?: number;
    Mobile?: number;
    Tablet?: number;
    Average_CTR?: number;
    Average_Position?: number;
    Top_10_Clicks?: string;
    Top_10_Queries?: string;
}

export interface AllGoogleSearchConsoleData {
    [clientName: string]: GoogleSearchConsoleRecord[];
}

export interface GoogleAnalyticsRecord {
    ClientName: string;
    PropertyID?: string;
    Date: string;
    Revenue: number;
    RevenuePercentOrganic?: number;
    RevenuePercentDirect?: number;
    RevenuePercentPPC?: number;
    RevenuePercentReferral?: number;
    Sessions: number;
    SessionsPercentOrganic?: number;
    SessionsPercentDirect?: number;
    SessionsPercentPPC?: number;
    SessionsPercentReferral?: number;
    Orders: number;
    OrdersPercentOrganic?: number;
    OrdersPercentDirect?: number;
    OrdersPercentPPC?: number;
    OrdersPercentReferral?: number;
    ConvRate: number;
    ConvRatePercentOrganic?: number;
    ConvRatePercentDirect?: number;
    ConvRatePercentPPC?: number;
    ConvRatePercentReferral?: number;
    SessionDuration?: string;
    BounceRate?: number;
    DateRan?: string;
}

export interface AllGoogleAnalyticsData {
    [clientName: string]: GoogleAnalyticsRecord[];
}

export interface GoogleAdsRecord {
    ClientName: string;
    ID?: string;
    Date: string;
    PartsCost?: number;
    PartsImpressions?: number;
    PartsClicks?: number;
    PartsAvgCPC?: number;
    PartsCTR?: number;
    PartsROAS?: number;
    PartsConversions?: number;
    PartsConvRate?: number;
    PartsBudget?: number;
    AccCost?: number;
    AccImpressions?: number;
    AccClicks?: number;
    AccAvgCPC?: number;
    AccCTR?: number;
    AccROAS?: number;
    AccConversions?: number;
    AccConvRate?: number;
    AccBudget?: number;
    DateRan?: string;
}

export interface AllGoogleAdsData {
    [clientName: string]: GoogleAdsRecord[];
}

export interface NoteRecord {
  clientName: string;
  month: string; // YYYY-MM
  pricing: string;
  shipping: string;
  otherNotes: string;
  strategyNote: string;
  rowIndex?: number;
}

export interface HistoryState {
  toolSelected: string;
  selectedClient: string;
  selectedAutoGroup: string;
}

// State for individual tools
export interface StrategyNotesToolState {
    role: 'PPC' | 'PDM' | '';
    manager: string;
    filterType: 'month' | 'client';
    month: string;
    selectedClientFilter: string;
}

export interface BudgetStatusToolState {
    role: 'PPC' | 'PDM' | '';
    manager: string;
    threshold: number;
}

export interface MetricComparisonToolState {
    role: 'PPC' | 'PDM' | '';
    manager: string;
    threshold: number;
    chartTimeRange: '3m' | '6m' | '12m' | '24m';
    selectedMetric: string;
}

export interface CustomSeoTitlesToolState {
    selectedBrand: string;
}

export interface BrandComparisonToolState {
    selectedBrand: string;
    selectedClientName: string;
    clientsForAverage: { name: string; checked: boolean }[];
    comparisonMode: 'clientVsBrand' | 'allClients';
    viewMode: 'month' | 'timeline';
    timeRange: '3' | '6' | '12';
    selectedMonthYear: string;
}

export interface FeedHealthToolState {
    selectedBrand: string;
    itemsInFeedTimeRange: '3m' | '6m' | '12m' | '24m';
    dropThreshold: number;
    dropTimeFrame: '7d' | '14d' | '1m' | '2m';
    approvalThreshold: number;
}

export interface MediumComparisonToolState {
    viewMode: 'month' | 'timeline';
    timeRange: '3' | '6' | '12';
    selectedMonth: string;
    selectedMedium: 'Organic' | 'Direct' | 'PPC' | 'Referral' | '';
    sortOrder: 'descending' | 'ascending';
}

export interface BulkUrlOpenerToolState {
    selectedPreset: string;
    batchSize: number;
}

export interface GoogleAdsRobotToolState {
    selectedClient: string;
}

export interface PolarisMsrpUpdaterState {} // Empty for now

export interface TagCreatorToolState {
    selectedClient: string;
    selectedBrand: string;
    tag: string;
    partNumbers: string;
}

export interface SearchPageCreatorToolState {
    selectedClient: string;
    title: string;
    url: string;
    h1: string;
    metaTitle: string;
    metaDescription: string;
    contentUrl: string;
    searchTerms: string;
}

export interface FreeShippingToolState {
    selectedClient: string;
    selectedBrand: string;
    partNumbers: string;
}

export interface CategoryPageCreatorToolState {
    selectedClient: string;
    selectedBrand: string;
    categoryName: string;
    h1: string;
    metaTitle: string;
    metaDescription: string;
    contentUrl: string;
    partNumbers: string;
}

export interface ProductAvailabilityToolState {
    selectedClient: string;
    selectedBrand: string;
    availability: 'Available for Sale' | 'Not for Sale';
    partNumbers: string;
}

export interface FileUploaderToolState {}

export interface ManagerDashboardState {
    role: 'PPC' | 'PDM' | 'All' | '';
    manager: string;
    revenueFilter: 'none' | '3m' | '6m' | '12m';
    comparisonMode: 'lastCompleted' | 'projected';
    isTrendVisible: boolean;
    isCurrentMonthVisible: boolean;
    columnOrder: string[];
}

export interface AllToolStates {
    strategy_notes: StrategyNotesToolState;
    budget_status: BudgetStatusToolState;
    revenue_tool: MetricComparisonToolState;
    custom_titles: CustomSeoTitlesToolState;
    brand_comparison: BrandComparisonToolState;
    feed_health: FeedHealthToolState;
    medium_comparison: MediumComparisonToolState;
    bulk_url_opener: BulkUrlOpenerToolState;
    google_ads_robot: GoogleAdsRobotToolState;
    polaris_msrp_updater: PolarisMsrpUpdaterState;
    tag_creator: TagCreatorToolState;
    search_page_creator: SearchPageCreatorToolState;
    free_shipping_tool: FreeShippingToolState;
    category_page_creator: CategoryPageCreatorToolState;
    product_availability: ProductAvailabilityToolState;
    file_uploader: FileUploaderToolState;
    manager_dashboard: ManagerDashboardState;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface FeedItemRecord {
  item_id: string;
  title: string;
  disapproval_issues: string;
}

export interface TopClickItem {
    page: string;
    clicks: number;
    impressions: number;
}

export interface TopQueryItem {
    query: string;
    clicks: number;
    impressions: number;
}