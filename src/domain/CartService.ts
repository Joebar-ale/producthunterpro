import { IMoneyAdapter } from './MoneyAdapter';
import { IProduct, ISale, ISaleItem } from './entities';
import { ICartLine, ICartService, ICartState } from './cart_contracts';

export class CartService implements ICartService {
  constructor(private readonly money: IMoneyAdapter) {}

  empty(): ICartState {
    return { lines: [], total_amount_text: '0' };
  }

  add(state: ICartState, product: IProduct, quantity: number): ICartState {
    this.assertQuantity(quantity, 1);
    if (!this.money.isValidCanonical(product.price_text)) throw new Error(`Precio inválido: ${product.price_text}`);
    const existing = state.lines.find((l) => l.product_id === product.id);
    if (existing) return this.setQuantity(state, product.id, existing.quantity + quantity);
    return this.build([...state.lines, this.line(product.id, product.name, product.price_text, quantity)]);
  }

  setQuantity(state: ICartState, productId: string, quantity: number): ICartState {
    this.assertQuantity(quantity, 0);
    const existing = state.lines.find((l) => l.product_id === productId);
    if (!existing) throw new Error(`Producto no está en el carrito: ${productId}`);
    return this.build(
      quantity === 0
        ? state.lines.filter((l) => l.product_id !== productId)
        : state.lines.map((l) => (l.product_id === productId ? this.line(l.product_id, l.name, l.unit_price_text, quantity) : l))
    );
  }

  toSale(
    state: ICartState,
    meta: { sale_id: string; customer_id: string; operator_id: string; item_ids: readonly string[]; now: string }
  ): { sale: ISale; items: ISaleItem[] } {
    if (state.lines.length === 0) throw new Error('Carrito vacío');
    if (meta.item_ids.length !== state.lines.length) throw new Error('item_ids no coincide con las líneas');
    return {
      sale: {
        id: meta.sale_id,
        customer_id: meta.customer_id,
        operator_id: meta.operator_id,
        total_amount_text: state.total_amount_text,
        status: 'DRAFT',
        confirmed_at: null,
        created_at: meta.now,
      },
      items: state.lines.map((l, i) => ({
        id: meta.item_ids[i],
        sale_id: meta.sale_id,
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price_text: l.unit_price_text,
        line_total_text: l.line_total_text,
      })),
    };
  }

  private line(product_id: string, name: string, unit_price_text: string, quantity: number): ICartLine {
    return { product_id, name, unit_price_text, quantity, line_total_text: this.money.multiplyByScaledQuantity(unit_price_text, quantity) };
  }

  private build(lines: readonly ICartLine[]): ICartState {
    return { lines, total_amount_text: this.money.add(...lines.map((l) => l.line_total_text)) };
  }

  private assertQuantity(quantity: number, min: number): void {
    if (!Number.isSafeInteger(quantity) || quantity < min) throw new Error(`Cantidad inválida: ${quantity}`);
  }
}
