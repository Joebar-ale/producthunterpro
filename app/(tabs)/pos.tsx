import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../src/presentation/store/appStore';
import { IProduct } from '../../src/domain/entities';
import { ICartLine } from '../../src/domain/cart_contracts';

// Design Tokens (Taste)
const TOKENS = {
  colors: {
    bg: '#0F172A',
    surface: '#1E293B',
    surfaceSubtle: '#334155',
    surfaceBorder: '#475569',
    primary: '#10B981',
    primaryPressed: '#059669',
    accent: '#6366F1',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    danger: '#EF4444',
    dangerSurface: '#451A1A',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    sm: 8,
    md: 12,
    lg: 16,
    full: 9999,
  },
};

function formatMoney(centsStr: string): string {
  const cents = parseInt(centsStr, 10);
  if (isNaN(cents)) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const {
    cart,
    products,
    searchQuery,
    setSearchQuery,
    loadProducts,
    addToCart,
    setQuantity,
    clearCart,
    checkout,
  } = useAppStore();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar catálogo de SQLite al montar
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filtrado reactivo en memoria / sincronizado con SQLite
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, searchQuery]);

  // Motion: Feedback animado en el total
  const totalScaleAnim = useRef(new Animated.Value(1)).current;

  const triggerTotalAnimation = () => {
    Animated.sequence([
      Animated.timing(totalScaleAnim, {
        toValue: 1.08,
        duration: 120,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
        useNativeDriver: true,
      }),
      Animated.timing(totalScaleAnim, {
        toValue: 1,
        duration: 160,
        easing: Easing.bezier(0.7, 0, 0.84, 0),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAddToCart = (product: IProduct) => {
    addToCart(product, 1000); // 1.0 unidad escalada x1000
    triggerTotalAnimation();
  };

  const handleIncrement = (line: ICartLine) => {
    setQuantity(line.product_id, line.quantity + 1000);
    triggerTotalAnimation();
  };

  const handleDecrement = (line: ICartLine) => {
    const nextQty = Math.max(0, line.quantity - 1000);
    setQuantity(line.product_id, nextQty);
    triggerTotalAnimation();
  };

  const handleCheckout = async () => {
    if (cart.lines.length === 0) return;
    setIsSubmitting(true);
    try {
      await checkout('consumidor_final', 'cajero_principal');
      Alert.alert('Éxito', 'Venta confirmada y registrada en el libro mayor.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la venta';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Punto de Venta</Text>
        <Text style={styles.headerSubtitle}>ProductHunter Pro • Base de Datos SQLite Activa</Text>
      </View>

      <View style={styles.body}>
        {/* Catálogo de Productos */}
        <View style={styles.catalogSection}>
          <View style={styles.catalogHeader}>
            <Text style={styles.sectionTitle}>Catálogo</Text>
            <Text style={styles.catalogCount}>
              {filteredProducts.length} producto{filteredProducts.length === 1 ? '' : 's'}
            </Text>
          </View>

          {/* Campo de Búsqueda (Taste & Polish) */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre..."
              placeholderTextColor={TOKENS.colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityRole="search"
              accessibilityLabel="Buscar productos por nombre"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
                accessibilityRole="button"
                accessibilityLabel="Borrar texto de búsqueda"
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyCatalogState}>
              <Text style={styles.emptyCatalogIcon}>📦</Text>
              <Text style={styles.emptyCatalogTitle}>Sin coincidencias</Text>
              <Text style={styles.emptyCatalogSubtitle}>
                No se encontraron productos para "{searchQuery}".
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.catalogGrid}
              showsVerticalScrollIndicator={false}
            >
              {filteredProducts.map((prod) => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.productCard}
                  activeOpacity={0.7}
                  onPress={() => handleAddToCart(prod)}
                  accessibilityRole="button"
                  accessibilityLabel={`Agregar ${prod.name} por ${formatMoney(prod.price_text)}`}
                >
                  <View style={styles.productMeta}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {prod.name}
                    </Text>
                    <Text style={styles.productStock}>
                      Stock: {prod.stock_quantity / 1000} u.
                    </Text>
                  </View>
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>{formatMoney(prod.price_text)}</Text>
                    <View style={styles.addBadge}>
                      <Text style={styles.addBadgeText}>+ Agregar</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Resumen y Ticket de Carrito */}
        <View style={styles.cartSection}>
          <View style={styles.cartHeader}>
            <Text style={styles.sectionTitle}>Ticket Actual</Text>
            {cart.lines.length > 0 && (
              <TouchableOpacity
                onPress={clearCart}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Vaciar todo el carrito"
              >
                <Text style={styles.clearButtonText}>Vaciar</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.lines.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIconText}>🛒</Text>
              </View>
              <Text style={styles.emptyTitle}>Carrito vacío</Text>
              <Text style={styles.emptySubtitle}>
                Selecciona artículos del catálogo para iniciar el ticket.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.cartList}
              contentContainerStyle={styles.cartListContent}
              showsVerticalScrollIndicator={false}
            >
              {cart.lines.map((line) => (
                <View key={line.product_id} style={styles.cartRow}>
                  <View style={styles.cartRowInfo}>
                    <Text style={styles.cartRowName} numberOfLines={1}>
                      {line.name}
                    </Text>
                    <Text style={styles.cartRowPrice}>
                      {formatMoney(line.unit_price_text)} c/u
                    </Text>
                  </View>

                  {/* Stepper de cantidad */}
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      onPress={() => handleDecrement(line)}
                      style={styles.stepperButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Disminuir ${line.name}`}
                    >
                      <Text style={styles.stepperText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{line.quantity / 1000}</Text>
                    <TouchableOpacity
                      onPress={() => handleIncrement(line)}
                      style={styles.stepperButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Aumentar ${line.name}`}
                    >
                      <Text style={styles.stepperText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cartRowTotal}>
                    {formatMoney(line.line_total_text)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Checkout Footer */}
          <View style={styles.cartFooter}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total a Cobrar</Text>
              <Animated.Text
                style={[styles.totalAmount, { transform: [{ scale: totalScaleAnim }] }]}
              >
                {formatMoney(cart.total_amount_text)}
              </Animated.Text>
            </View>

            <TouchableOpacity
              style={[
                styles.checkoutButton,
                (cart.lines.length === 0 || isSubmitting) && styles.checkoutButtonDisabled,
              ]}
              disabled={cart.lines.length === 0 || isSubmitting}
              onPress={handleCheckout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Confirmar y registrar venta"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.checkoutButtonText}>Confirmar Venta</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: TOKENS.colors.bg,
  },
  header: {
    paddingHorizontal: TOKENS.spacing.lg,
    paddingVertical: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surfaceSubtle,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: TOKENS.colors.textMuted,
    marginTop: 2,
  },
  body: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  catalogSection: {
    flex: 1.2,
    padding: TOKENS.spacing.md,
  },
  catalogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  catalogCount: {
    fontSize: 12,
    color: TOKENS.colors.textMuted,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surfaceSubtle,
    paddingHorizontal: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.md,
    minHeight: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: TOKENS.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    paddingVertical: TOKENS.spacing.sm,
  },
  clearSearchButton: {
    padding: TOKENS.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  clearSearchText: {
    color: TOKENS.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCatalogState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: TOKENS.spacing.xxl,
  },
  emptyCatalogIcon: {
    fontSize: 32,
    marginBottom: TOKENS.spacing.sm,
  },
  emptyCatalogTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCatalogSubtitle: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: TOKENS.spacing.xs,
  },
  catalogGrid: {
    gap: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.xl,
  },
  productCard: {
    backgroundColor: TOKENS.colors.surface,
    padding: TOKENS.spacing.md,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surfaceSubtle,
    minHeight: 88,
    justifyContent: 'space-between',
  },
  productMeta: {
    marginBottom: TOKENS.spacing.sm,
  },
  productName: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  productStock: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    color: TOKENS.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  addBadge: {
    backgroundColor: TOKENS.colors.surfaceSubtle,
    paddingVertical: TOKENS.spacing.xs,
    paddingHorizontal: TOKENS.spacing.sm,
    borderRadius: TOKENS.radii.sm,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBadgeText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  cartSection: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface,
    borderTopLeftRadius: TOKENS.radii.lg,
    borderTopRightRadius: TOKENS.radii.lg,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.surfaceSubtle,
    justifyContent: 'space-between',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    minHeight: 44,
    paddingHorizontal: TOKENS.spacing.sm,
    justifyContent: 'center',
  },
  clearButtonText: {
    color: TOKENS.colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: TOKENS.spacing.xl,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: TOKENS.radii.full,
    backgroundColor: TOKENS.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  emptyIconText: {
    fontSize: 26,
  },
  emptyTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: TOKENS.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: TOKENS.spacing.xs,
    maxWidth: 240,
  },
  cartList: {
    flex: 1,
    marginVertical: TOKENS.spacing.sm,
  },
  cartListContent: {
    gap: TOKENS.spacing.sm,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.bg,
    padding: TOKENS.spacing.sm,
    borderRadius: TOKENS.radii.sm,
    minHeight: 52,
  },
  cartRowInfo: {
    flex: 1,
  },
  cartRowName: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  cartRowPrice: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceSubtle,
    borderRadius: TOKENS.radii.sm,
    marginHorizontal: TOKENS.spacing.sm,
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  stepperValue: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  cartRowTotal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'right',
  },
  cartFooter: {
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surfaceSubtle,
    paddingTop: TOKENS.spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  totalLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  totalAmount: {
    color: TOKENS.colors.primary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  checkoutButton: {
    backgroundColor: TOKENS.colors.primary,
    minHeight: 48,
    borderRadius: TOKENS.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: TOKENS.colors.surfaceSubtle,
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
