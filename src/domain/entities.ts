/**
 * Core Domain Entities for ProductHunter
 * All monetary amounts MUST be typed as string (canonical format)
 * and manipulated exclusively via IMoneyAdapter.
 */

export interface ICustomer {
  id: string; // UUID
  name: string;
  alias: string | null;
  created_at: string; // ISO 8601 UTC
  updated_at: string;
}

export interface ISale {
  id: string; // UUID
  customer_id: string;
  operator_id: string;
  total_amount_text: string; // Canonical money
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  confirmed_at: string | null;
  created_at: string;
}

export interface ISaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number; // Integer scaled x1000
  unit_price_text: string; // Canonical money
  line_total_text: string; // Canonical money
}

export interface IPayment {
  id: string;
  customer_id: string;
  operator_id: string;
  amount_text: string; // Canonical money
  method: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface IPaymentAllocation {
  id: string;
  payment_id: string;
  sale_id: string;
  allocated_amount_text: string; // Canonical money
  created_at: string;
}

export interface IInventoryTransaction {
  id: string;
  product_id: string;
  operator_id: string;
  quantity_change: number; // Integer scaled x1000 (positive or negative)
  reason: 'SALE' | 'RESTOCK' | 'ADJUSTMENT';
  reference_id: string | null; // e.g. sale_id
  created_at: string;
}

export interface IProduct {
  id: string; // UUID
  name: string;
  price_text: string; // Canonical money (centavos)
  stock_quantity: number; // Integer scaled x1000
}
