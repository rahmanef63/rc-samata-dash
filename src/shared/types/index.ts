// ─── Common status types ─────────────────────────────────
export type TransactionStatus =
  | "draft" | "submitted" | "approved" | "settled" | "rejected"
  | "pending" | "completed" | "review" | "paid" | "overdue"
  | "partial" | "open" | "disbursed" | "closed" | "requested";
export type Direction = "in" | "out";
export type BadgeColor = "success" | "warning" | "destructive" | "primary";

// ─── Enums ───────────────────────────────────────────────
export type PaymentSource = "owner_direct" | "petty_cash" | "payable";
export type ExpenseStatus = "draft" | "submitted" | "approved" | "paid" | "rejected";
export type PayableStatus = "open" | "partial" | "paid" | "overdue";
export type PettyCashStatus = "requested" | "approved" | "rejected" | "disbursed" | "closed";
export type ClosingStatus = "open" | "submitted" | "verified";
export type TransferDirection = "branch_to_owner" | "owner_to_branch";
export type TransferPurpose = "night_transfer" | "petty_cash_topup" | "payable_payment_fund" | "adjustment";
export type VendorType = "food_supplier" | "utility" | "service" | "payroll" | "misc";
export type ChannelType = "cash" | "transfer" | "gofood" | "grabfood" | "shopeefood" | "dine_in" | "take_away" | "other";
export type ExpenseCategoryType = "cogs" | "utility" | "salary_support" | "bpjs" | "maintenance" | "marketing" | "fee" | "other";
export type StockMovementType = "stock_in" | "usage" | "adjustment" | "waste";

// ─── Master Data ─────────────────────────────────────────
export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  phone: string;
  notes: string;
  isActive: boolean;
}

export interface IncomeChannel {
  id: string;
  name: string;
  type: ChannelType;
  isSettlementDelayed: boolean;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  type: ExpenseCategoryType;
}

// ─── Income / Sales ──────────────────────────────────────
export interface DailySale {
  id: string;
  businessDate: string;
  channelId: string;
  channelName: string;
  grossAmount: number;
  platformFee: number;
  promoCost: number;
  netAmount: number;
  cashReceivedAmount: number;
  settlementDate: string | null;
  referenceNo: string;
  status: "recorded" | "settled" | "pending_settlement";
}

// ─── Expenses ────────────────────────────────────────────
export interface Expense {
  id: string;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  vendorId: string | null;
  vendorName: string | null;
  amount: number;
  description: string;
  paymentSource: PaymentSource;
  status: ExpenseStatus;
  hasAttachment: boolean;
}

export interface ExpenseLineItem {
  id: string;
  expenseId: string;
  itemName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

// ─── Payables ────────────────────────────────────────────
export interface Payable {
  id: string;
  expenseId: string;
  vendorId: string;
  vendorName: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: PayableStatus;
  description: string;
  agingDays: number;
  paidDate?: string;
  creditDays?: number;
  invoiceNo?: string;
  // ETL provenance — present for rows coming from weekly report imports.
  reportId?: string;
  sourceFile?: string;
  reportPeriod?: string;
}

export interface PayablePayment {
  id: string;
  payableId: string;
  paymentDate: string;
  amount: number;
  method: "cash" | "transfer";
  referenceNo: string;
}

// ─── Petty Cash ──────────────────────────────────────────
export interface PettyCashRequest {
  id: string;
  requestDate: string;
  requestedBy: string;
  purposeCategory: string;
  requestedAmount: number;
  approvedAmount: number;
  actualAmount: number;
  status: PettyCashStatus;
  notes: string;
  hasAttachment: boolean;
}

// ─── Daily Closing & Night Transfer ──────────────────────
export interface DailyClosing {
  id: string;
  businessDate: string;
  openingCash: number;
  cashSales: number;
  nonCashSales: number;
  expensesPaidCash: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  status: ClosingStatus;
  submittedBy: string;
  submittedAt: string;
}

export interface OwnerTransfer {
  id: string;
  closingId: string | null;
  transferDate: string;
  direction: TransferDirection;
  purpose: TransferPurpose;
  amount: number;
  referenceNo: string;
  status: "pending" | "completed";
  // ETL provenance — set when row came from a weekly report import.
  reportId?: string;
  description?: string;
}

// ─── Inventory / Stock ───────────────────────────────────
export interface StockItem {
  id: string;
  name: string;
  currentQty: number;
  unit: string;
  minQty: number;
  status: "Stable" | "Low" | "Critical";
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  qty: number;
  unit: string;
  date: string;
  notes: string;
}

// ─── Audit Trail ─────────────────────────────────────────
export interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete" | "approve" | "reject" | "pay";
  description: string;
  actedBy: string;
  actedAt: string;
}

// ─── Shared UI structures ────────────────────────────────
export interface DataPoint {
  label: string;
  value: number;
}

export interface TransactionItem {
  id: string;
  title: string;
  subtitle?: string;
  amount: string;
  time?: string;
  status?: TransactionStatus;
  direction?: Direction;
}

export interface ListItem {
  title: string;
  subtitle?: string;
  amount?: string;
  iconName?: string;
  badge?: string;
  badgeColor?: string;
}

export interface ProgressItem {
  label: string;
  value: string;
  percentage: number;
}

export interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
