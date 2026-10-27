import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MoneyAdapter } from './MoneyAdapter';
import { CartService } from './CartService';
import type { IProduct } from './entities';

describe('MoneyAdapter.multiplyByScaledQuantity', () => {
  const money = new MoneyAdapter();

  it('calculates "333" * 500 (scaled x1000) with HALF_UP rounding to "167"', () => {
    const res = money.multiplyByScaledQuantity('333', 500);
    assert.strictEqual(res, '167');
  });

  it('calculates "1000" * 1500 to "1500"', () => {
    const res = money.multiplyByScaledQuantity('1000', 1500);
    assert.strictEqual(res, '1500');
  });

  it('throws on non-integer or negative quantity', () => {
    assert.throws(() => money.multiplyByScaledQuantity('1000', 1.5));
    assert.throws(() => money.multiplyByScaledQuantity('1000', -100));
  });
});

describe('CartService', () => {
  const money = new MoneyAdapter();
  const service = new CartService(money);

  const sampleProduct: IProduct = {
    id: 'prod-1',
    name: 'Yerba Mate',
    price_text: '1200',
    stock_quantity: 50000,
  };

  it('adds item to empty cart correctly and aggregates quantity when added again', () => {
    const empty = service.empty();
    const state1 = service.add(empty, sampleProduct, 1000); // 1.0 unit
    assert.strictEqual(state1.lines.length, 1);
    assert.strictEqual(state1.lines[0].quantity, 1000);
    assert.strictEqual(state1.lines[0].line_total_text, '1200');
    assert.strictEqual(state1.total_amount_text, '1200');

    // Add again
    const state2 = service.add(state1, sampleProduct, 500); // +0.5 unit
    assert.strictEqual(state2.lines.length, 1);
    assert.strictEqual(state2.lines[0].quantity, 1500);
    assert.strictEqual(state2.lines[0].line_total_text, '1800');
    assert.strictEqual(state2.total_amount_text, '1800');

    // Immutability check
    assert.strictEqual(empty.lines.length, 0);
    assert.strictEqual(state1.lines[0].quantity, 1000);
  });

  it('removes line when setQuantity is 0', () => {
    const cart = service.add(service.empty(), sampleProduct, 2000);
    const updated = service.setQuantity(cart, sampleProduct.id, 0);
    assert.strictEqual(updated.lines.length, 0);
    assert.strictEqual(updated.total_amount_text, '0');
  });

  it('converts to sale draft accurately', () => {
    const cart = service.add(service.empty(), sampleProduct, 1000);
    const draft = service.toSale(cart, {
      sale_id: 'sale-123',
      customer_id: 'cust-456',
      operator_id: 'op-789',
      item_ids: ['item-001'],
      now: '2026-10-15T15:00:00.000Z',
    });

    assert.strictEqual(draft.sale.id, 'sale-123');
    assert.strictEqual(draft.sale.status, 'DRAFT');
    assert.strictEqual(draft.sale.total_amount_text, '1200');
    assert.strictEqual(draft.items.length, 1);
    assert.strictEqual(draft.items[0].id, 'item-001');
    assert.strictEqual(draft.items[0].product_id, sampleProduct.id);
    assert.strictEqual(draft.items[0].line_total_text, '1200');
  });

  it('throws in toSale if cart is empty or item_ids mismatch', () => {
    assert.throws(() =>
      service.toSale(service.empty(), {
        sale_id: 'sale-123',
        customer_id: 'cust-456',
        operator_id: 'op-789',
        item_ids: [],
        now: '2026-10-15T15:00:00.000Z',
      })
    );
  });
});
