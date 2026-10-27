import Decimal from "decimal.js";

// Configurar Decimal.js con precisión 18 y redondeo HALF_UP al principio
Decimal.set({ precision: 18, rounding: Decimal.ROUND_HALF_UP });

export interface IMoneyAdapter {
  /** Valida si el string cumple el formato canónico estricto de centavos (sin comas, ni puntos, ni ceros iniciales, solo números, máx 15 dígitos) */
  isValidCanonical(amountText: string): boolean;
  
  /** Suma dos o más cantidades monetarias y retorna el texto canónico */
  add(...amounts: string[]): string;

  /** Resta b de a (a - b) y retorna el texto canónico */
  subtract(a: string, b: string): string;

  /** Calcula un markup porcentual (ej: "35") sobre un costo y redondea HALF_UP */
  applyMarkup(costAmount: string, percentageStr: string): string;

  /** amountText × (scaledQty / 1000), redondeo HALF_UP a centavos enteros */
  multiplyByScaledQuantity(amountText: string, scaledQty: number): string;
}

export class MoneyAdapter implements IMoneyAdapter {
  public isValidCanonical(amountText: string): boolean {
    if (typeof amountText !== "string") {
      return false;
    }
    // ^(0|[1-9]\d{0,14})$ garantiza sin comas, ni puntos, sin ceros iniciales múltiples, solo números y hasta 15 dígitos
    return /^(0|[1-9]\d{0,14})$/.test(amountText);
  }

  private validateOrThrow(amountText: string, paramName: string): void {
    if (!this.isValidCanonical(amountText)) {
      throw new Error(`Error de validación: El argumento '${paramName}' ("${amountText}") no cumple el formato canónico estricto.`);
    }
  }

  public add(...amounts: string[]): string {
    if (amounts.length === 0) {
      return "0";
    }

    let sum = new Decimal(0);
    for (let i = 0; i < amounts.length; i++) {
      this.validateOrThrow(amounts[i], `amounts[${i}]`);
      sum = sum.plus(new Decimal(amounts[i]));
    }
    
    return sum.toString();
  }

  public subtract(a: string, b: string): string {
    this.validateOrThrow(a, "a");
    this.validateOrThrow(b, "b");
    
    return new Decimal(a).minus(new Decimal(b)).toString();
  }

  public applyMarkup(costAmount: string, percentageStr: string): string {
    this.validateOrThrow(costAmount, "costAmount");
    
    let percentage: Decimal;
    try {
      percentage = new Decimal(percentageStr);
    } catch (error) {
      throw new Error(`Error de validación: El porcentaje "${percentageStr}" no es válido.`);
    }

    const cost = new Decimal(costAmount);
    // Formula: cost + (cost * (percentage / 100))
    // Multiplicador: 1 + percentage/100
    const multiplier = new Decimal("1").plus(percentage.dividedBy("100"));
    
    // Aplicamos el markup y redondeamos a centavos enteros (ya configurado como HALF_UP)
    const finalAmount = cost.times(multiplier).round();

    return finalAmount.toString();
  }

  public multiplyByScaledQuantity(amountText: string, scaledQty: number): string {
    this.validateOrThrow(amountText, "amountText");
    if (!Number.isSafeInteger(scaledQty) || scaledQty < 0) {
      throw new Error(`Error de validación: scaledQty (${scaledQty}) debe ser un entero >= 0.`);
    }

    return new Decimal(amountText)
      .times(scaledQty)
      .dividedBy(1000)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toFixed(0);
  }
}
