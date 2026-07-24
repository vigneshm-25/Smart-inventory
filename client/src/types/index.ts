// ── User Types ──────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  club: string | null;
  reliabilityScore?: number;
  avatarUrl?: string | null;
  createdAt?: string;
  totalBorrows?: number;
  activeBorrows?: number;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// ── Item Types ──────────────────────────────────────────────────────

export type ItemStatus = 'available' | 'borrowed' | 'reserved' | 'maintenance' | 'lost';
export type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';

export interface Item {
  id: string;
  name: string;
  category: string;
  description: string | null;
  owning_club: string;
  condition: ItemCondition;
  status: ItemStatus;
  quantity: number;
  storage_location: string | null;
  qr_code_id: string;
  image_url: string | null;
  created_at: string;
  current_holder?: string | null;
  current_holder_id?: string | null;
  return_date?: string | null;
}

export interface CreateItemData {
  name: string;
  category: string;
  description?: string;
  owningClub: string;
  condition?: ItemCondition;
  quantity?: number;
  storageLocation?: string;
  imageUrl?: string;
}

// ── Transaction Types ───────────────────────────────────────────────

export type TransactionAction = 'borrow' | 'return';

export interface Transaction {
  id: string;
  item_id: string;
  user_id: string;
  action: TransactionAction;
  timestamp: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  notes: string | null;
  item_name?: string;
  item_category?: string;
  item_image?: string | null;
  item_status?: string;
  user_name?: string;
  user_email?: string;
  qr_code_id?: string;
}

// ── Analytics Types ─────────────────────────────────────────────────

export interface DashboardSummary {
  totalItems: number;
  available: number;
  borrowed: number;
  overdue: number;
  totalUsers: number;
  totalTransactions: number;
  maintenance: number;
  lost: number;
}

export interface BorrowTrendPoint {
  date: string;
  borrows: number;
  returns: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  available: number;
  borrowed: number;
}

export interface TopBorrowedItem {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  borrow_count: number;
}

export interface ClubUsage {
  club: string;
  total_transactions: number;
  borrows: number;
  returns: number;
}

export interface ActivityItem {
  id: string;
  action: TransactionAction;
  timestamp: string;
  notes: string | null;
  item_name: string;
  item_category: string;
  item_image: string | null;
  user_name: string;
  user_avatar: string | null;
}

// ── Notification Types ──────────────────────────────────────────────

export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: number;
  created_at: string;
}
