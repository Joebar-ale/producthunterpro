import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useDI } from '../src/presentation/context/DIContext';

const TOKENS = {
  colors: {
    primary: '#3b82f6',
    success: '#22c55e',
    danger: '#ef4444',
    background: '#f8fafc',
    surface: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    disabled: '#94a3b8',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    md: 8,
    lg: 12,
  },
};

export default function IndexScreen(): React.JSX.Element {
  const { turnManager, turnStateRepo } = useDI();
  const [isTurnOpen, setIsTurnOpen] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const checkTurnStatus = useCallback(async () => {
    try {
      await turnManager?.assertIsWriter();
      setIsTurnOpen(true);
    } catch {
      setIsTurnOpen(false);
    }
  }, [turnManager]);

  useEffect(() => {
    void checkTurnStatus();
  }, [checkTurnStatus]);

  const handleOpenTurn = useCallback(async () => {
    setIsBusy(true);
    try {
      const currentState = await turnStateRepo?.readState();
      if (!currentState) {
        await turnStateRepo?.initializeDevice('pos-device-1');
      }
      const nextSequence = (currentState?.turn_sequence ?? 0) + 1;
      await turnManager?.acquireTurn(`epoch-${Date.now()}`, nextSequence);
      setIsTurnOpen(true);
      setStatusMessage('Turno abierto correctamente');
    } catch {
      setStatusMessage('No se pudo abrir el turno');
    } finally {
      setIsBusy(false);
    }
  }, [turnManager, turnStateRepo]);

  const handleCloseTurn = useCallback(async () => {
    setIsBusy(true);
    try {
      await turnManager?.releaseTurn();
      setIsTurnOpen(false);
      setStatusMessage('Turno cerrado correctamente');
    } catch {
      setStatusMessage('No se pudo cerrar el turno');
    } finally {
      setIsBusy(false);
    }
  }, [turnManager]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Punto de Venta
        </Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeLabel}>
            Estado: {isTurnOpen ? 'ACTIVO (Abierto)' : 'INACTIVO (Cerrado)'}
          </Text>
        </View>
      </View>

      {statusMessage ? (
        <View style={styles.statusBanner} accessibilityLiveRegion="polite">
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}

      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonOpen,
            (isBusy || isTurnOpen) && styles.buttonDisabled,
            pressed && !isBusy && !isTurnOpen && styles.buttonPressed,
          ]}
          onPress={handleOpenTurn}
          disabled={isBusy || isTurnOpen}
          accessibilityLabel="Abrir Turno"
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy || isTurnOpen }}
        >
          <Text style={styles.buttonText}>Abrir Turno</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.buttonClose,
            (isBusy || !isTurnOpen) && styles.buttonDisabled,
            pressed && !isBusy && isTurnOpen && styles.buttonPressed,
          ]}
          onPress={handleCloseTurn}
          disabled={isBusy || !isTurnOpen}
          accessibilityLabel="Cerrar Turno"
          accessibilityRole="button"
          accessibilityState={{ disabled: isBusy || !isTurnOpen }}
        >
          <Text style={styles.buttonText}>Cerrar Turno</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.background,
  },
  header: {
    padding: TOKENS.spacing.lg,
    backgroundColor: TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
    textAlign: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TOKENS.colors.textSecondary,
    backgroundColor: TOKENS.colors.background,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
  },
  statusBanner: {
    backgroundColor: TOKENS.colors.surface,
    padding: TOKENS.spacing.md,
    marginHorizontal: TOKENS.spacing.lg,
    marginTop: TOKENS.spacing.md,
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.border,
    alignItems: 'center',
  },
  statusText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: TOKENS.spacing.lg,
    justifyContent: 'center',
    gap: TOKENS.spacing.md,
  },
  button: {
    minHeight: 48,
    borderRadius: TOKENS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: TOKENS.spacing.md,
  },
  buttonOpen: {
    backgroundColor: TOKENS.colors.success,
  },
  buttonClose: {
    backgroundColor: TOKENS.colors.danger,
  },
  buttonDisabled: {
    backgroundColor: TOKENS.colors.disabled,
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: TOKENS.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
