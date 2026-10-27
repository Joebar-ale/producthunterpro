import React, { createContext, useContext, ReactNode } from 'react';
import { ICartService } from '../../domain/cart_contracts';
import { IMoneyAdapter } from '../../domain/MoneyAdapter';
import { ISyncManager } from '../../domain/sync_contracts';
import { ITurnManager, ITurnStateRepository } from '../../domain/turn_contracts';
import { IDriveAdapter, ISnapshotPackager } from '../../domain/drive_contracts';
import {
  ISQLiteManager,
  IMigrator,
  IDatasetMetaRepository,
  ICustomerRepository,
  IProductRepository,
  ISaleRepository,
  IPaymentRepository,
} from '../../infra/database/contracts';

export interface Container {
  sqliteManager?: ISQLiteManager;
  migrator?: IMigrator;
  datasetMetaRepo?: IDatasetMetaRepository;
  customerRepo?: ICustomerRepository;
  productRepo?: IProductRepository;
  saleRepo?: ISaleRepository;
  paymentRepo?: IPaymentRepository;
  turnStateRepo?: ITurnStateRepository;
  driveAdapter?: IDriveAdapter;
  snapshotPackager?: ISnapshotPackager;
  moneyAdapter?: IMoneyAdapter;
  cartService?: ICartService;
  turnManager?: ITurnManager;
  syncManager?: ISyncManager;
}

export interface DIProviderProps {
  children: ReactNode;
  dependencies: Container;
}

const DIContext = createContext<Container | null>(null);

export function DIProvider({ children, dependencies }: DIProviderProps): React.JSX.Element {
  return <DIContext.Provider value={dependencies}>{children}</DIContext.Provider>;
}

export function useDI(): Container {
  const context = useContext(DIContext);
  if (!context) {
    throw new Error('useDI must be used within a DIProvider');
  }
  return context;
}
