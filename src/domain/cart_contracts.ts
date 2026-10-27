import { IProduct, ISale, ISaleItem } from './entities';

export interface ICartLine {
  readonly product_id: string;
  readonly name: string;
  readonly unit_price_text: string; // Canonical money
  readonly quantity: number;        // Integer scaled x1000, > 0
  readonly line_total_text: string; // Canonical money (vía IMoneyAdapter)
}

export interface ICartState {
  readonly lines: readonly ICartLine[];
  readonly total_amount_text: string; // Canonical money (IMoneyAdapter.add)
}

/** Lógica pura e inmutable. La implementación recibe IMoneyAdapter por constructor. */
export interface ICartService {
  empty(): ICartState;
  /** Suma la cantidad si el producto ya está en el carrito. */
  add(state: ICartState, product: IProduct, quantity: number): ICartState;
  /** quantity = 0 elimina la línea. */
  setQuantity(state: ICartState, productId: string, quantity: number): ICartState;
  /** Arma el DRAFT para ISaleRepository.createSaleWithItems. */
  toSale(
    state: ICartState,
    meta: { sale_id: string; customer_id: string; operator_id: string; item_ids: readonly string[]; now: string }
  ): { sale: ISale; items: ISaleItem[] };
}
