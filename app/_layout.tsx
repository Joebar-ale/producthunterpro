import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DIProvider, Container, useDI } from '../src/presentation/context/DIContext';
import sqliteManagerInstance from '../src/infra/database/SQLiteManager';
import { DatabaseMigrator } from '../src/infra/database/DatabaseMigrator';
import { DatasetMetaRepo } from '../src/infra/database/DatasetMetaRepo';
import { CustomerRepo } from '../src/infra/database/CustomerRepo';
import { ProductRepo } from '../src/infra/database/ProductRepo';
import { SaleRepo } from '../src/infra/database/SaleRepo';
import { PaymentRepo } from '../src/infra/database/PaymentRepo';
import { TurnStateRepo } from '../src/infra/device/TurnStateRepo';
import { DriveAdapter } from '../src/infra/sync/DriveAdapter';
import { SnapshotPackager } from '../src/infra/sync/SnapshotPackager';
import { MoneyAdapter } from '../src/domain/MoneyAdapter';
import { CartService } from '../src/domain/CartService';
import { turnManager } from '../src/domain/TurnManager';
import { SyncManager } from '../src/domain/SyncManager';

const moneyAdapter = new MoneyAdapter();

const dependencies: Container = {
  sqliteManager: sqliteManagerInstance,
  migrator: new DatabaseMigrator(),
  datasetMetaRepo: new DatasetMetaRepo(),
  customerRepo: new CustomerRepo(),
  productRepo: new ProductRepo(),
  saleRepo: new SaleRepo(),
  paymentRepo: new PaymentRepo(),
  turnStateRepo: new TurnStateRepo(),
  driveAdapter: new DriveAdapter(),
  snapshotPackager: new SnapshotPackager(),
  moneyAdapter,
  cartService: new CartService(moneyAdapter),
  turnManager,
  syncManager: new SyncManager(),
};

function RootBootstrapper(): React.JSX.Element {
  const { sqliteManager, migrator, turnManager: diTurnManager, turnStateRepo } = useDI();
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async (): Promise<void> => {
      try {
        await sqliteManager?.initDB();
        await migrator?.runMigrations();
        const turnState = await turnStateRepo?.readState();
        if (turnState) {
          try {
            await diTurnManager?.assertIsWriter();
          } catch {
            // Dispositivo en modo READER
          }
        }
      } catch {
        // Silenciar errores de inicialización sin exponer PII
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [sqliteManager, migrator, diTurnManager, turnStateRepo]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer} accessibilityLabel="Cargando">
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <DIProvider dependencies={dependencies}>
        <RootBootstrapper />
      </DIProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
