-- Migration 002: Core Accounting with Immutability

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    total_amount_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price_text TEXT NOT NULL,
    line_total_text TEXT NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    amount_text TEXT NOT NULL,
    method TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    sale_id TEXT NOT NULL,
    allocated_amount_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    quantity_change INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    reference_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TRIGGERS for immutability

-- Sales
CREATE TRIGGER IF NOT EXISTS prevent_update_confirmed_sales
BEFORE UPDATE ON sales
FOR EACH ROW
WHEN OLD.confirmed_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Venta confirmada es inmutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_delete_confirmed_sales
BEFORE DELETE ON sales
FOR EACH ROW
WHEN OLD.confirmed_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Venta confirmada es inmutable');
END;

-- Sale Items
CREATE TRIGGER IF NOT EXISTS prevent_update_confirmed_sale_items
BEFORE UPDATE ON sale_items
FOR EACH ROW
WHEN (SELECT confirmed_at FROM sales WHERE id = OLD.sale_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Items de venta confirmada son inmutables');
END;

CREATE TRIGGER IF NOT EXISTS prevent_delete_confirmed_sale_items
BEFORE DELETE ON sale_items
FOR EACH ROW
WHEN (SELECT confirmed_at FROM sales WHERE id = OLD.sale_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Items de venta confirmada son inmutables');
END;

-- Payments
CREATE TRIGGER IF NOT EXISTS prevent_update_confirmed_payments
BEFORE UPDATE ON payments
FOR EACH ROW
WHEN OLD.confirmed_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Pago confirmado es inmutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_delete_confirmed_payments
BEFORE DELETE ON payments
FOR EACH ROW
WHEN OLD.confirmed_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Pago confirmado es inmutable');
END;

-- Payment Allocations (Payment constraint)
CREATE TRIGGER IF NOT EXISTS prevent_update_payment_allocations_payment
BEFORE UPDATE ON payment_allocations
FOR EACH ROW
WHEN (SELECT confirmed_at FROM payments WHERE id = OLD.payment_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Asignación de pago es inmutable si el pago está confirmado');
END;

CREATE TRIGGER IF NOT EXISTS prevent_delete_payment_allocations_payment
BEFORE DELETE ON payment_allocations
FOR EACH ROW
WHEN (SELECT confirmed_at FROM payments WHERE id = OLD.payment_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Asignación de pago es inmutable si el pago está confirmado');
END;

-- Payment Allocations (Sale constraint)
CREATE TRIGGER IF NOT EXISTS prevent_update_payment_allocations_sale
BEFORE UPDATE ON payment_allocations
FOR EACH ROW
WHEN (SELECT confirmed_at FROM sales WHERE id = OLD.sale_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Asignación de pago es inmutable si la venta está confirmada');
END;

CREATE TRIGGER IF NOT EXISTS prevent_delete_payment_allocations_sale
BEFORE DELETE ON payment_allocations
FOR EACH ROW
WHEN (SELECT confirmed_at FROM sales WHERE id = OLD.sale_id) IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Asignación de pago es inmutable si la venta está confirmada');
END;
