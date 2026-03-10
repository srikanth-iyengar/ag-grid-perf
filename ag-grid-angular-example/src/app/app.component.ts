import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import { 
  ColDef, 
  GridApi, 
  GridReadyEvent, 
  GetRowIdParams,
  CellClassParams
} from 'ag-grid-community';

const LATENCY_MS = 70;
const TICK_RATE_MS = 100;
const TOTAL_ROWS = 100000;

interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: string;
  orderType: string;
  quantity: number;
  filledQuantity: number;
  limitPrice: number;
  marketPrice: number;
  avgPrice: number;
  status: string;
  timestamp: number;
  trader: string;
  account: string;
  venue: string;
  commission: number;
  currency: string;
  region: string;
  sector: string;
  settlementDate: string;
  notional: number;
  priority: string;
  algo: string;
  executionVenue: string;
  counterparty: string;
  bloombergId: string;
  ricCode: string;
  cusip: string;
  isin: string;
  sedol: string;
  __index: number;
}

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT', 'JNJ', 'PG', 'MA', 'UNH', 'HD'];
const SIDE = ['BUY', 'SELL'];
const STATUS = ['PENDING', 'FILLED', 'PARTIAL', 'CANCELLED'];
const ORDER_TYPE = ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'];
const VENUE = ['NYSE', 'NASDAQ', 'BATS', 'ARCA', 'CBOE', 'PHLX'];
const CURRENCY = ['USD', 'EUR', 'GBP', 'JPY'];
const REGION = ['NA', 'EU', 'APAC', 'LATAM'];
const SECTOR = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Materials', 'Utilities'];
const PRIORITY = ['HIGH', 'MEDIUM', 'LOW', 'URGENT'];
const ALGO = ['VWAP', 'TWAP', 'POV', 'IS', 'AUCO', 'PRIORITY'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrade(id: number): Trade {
  const basePrice = Math.random() * 1000 + 50;
  const quantity = Math.floor(Math.random() * 1000) + 1;
  const limitPrice = parseFloat((basePrice * (0.9 + Math.random() * 0.2)).toFixed(2));
  return {
    id: `TRD-${String(id).padStart(6, '0')}`,
    orderId: `ORD-${String(Math.floor(Math.random() * 1000000)).padStart(8, '0')}`,
    symbol: randomElement(SYMBOLS),
    side: randomElement(SIDE),
    orderType: randomElement(ORDER_TYPE),
    quantity,
    filledQuantity: Math.floor(Math.random() * quantity),
    limitPrice,
    marketPrice: parseFloat(basePrice.toFixed(2)),
    avgPrice: parseFloat(basePrice.toFixed(2)),
    status: randomElement(STATUS),
    timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    trader: `TRADER-${Math.floor(Math.random() * 100)}`,
    account: `ACC-${Math.floor(Math.random() * 1000)}`,
    venue: randomElement(VENUE),
    commission: parseFloat((Math.random() * 10).toFixed(2)),
    currency: randomElement(CURRENCY),
    region: randomElement(REGION),
    sector: randomElement(SECTOR),
    settlementDate: new Date(Date.now() + Math.floor(Math.random() * 3) * 86400000).toISOString().split('T')[0],
    notional: parseFloat((basePrice * quantity).toFixed(2)),
    priority: randomElement(PRIORITY),
    algo: randomElement(ALGO),
    executionVenue: randomElement(VENUE),
    counterparty: `CP-${Math.floor(Math.random() * 100)}`,
    bloombergId: `BBG${Math.floor(Math.random() * 10000000)}`,
    ricCode: `${randomElement(SYMBOLS)}.${randomElement(['OQ', 'US', 'OB', 'UP'])}`,
    cusip: Math.random().toString(36).substring(2, 11).toUpperCase(),
    isin: `${randomElement(['US', 'GB', 'DE', 'FR'])}${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
    sedol: Math.random().toString(36).substring(2, 9).toUpperCase(),
    __index: id - 1
  };
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, AgGridAngular],
  template: `
    <div class="container">
      <div class="header">
        <h1>AG Grid Angular - Viewport Row Model <span class="header-sub">Mocked server latency: 70ms | Data tick rate: 100ms | Total rows: {{ totalRows | number }}</span></h1>
        <div class="stats">
          <div class="stat">
            <span class="stat-label">Total P&L</span>
            <span [class.stat-value]="true" [class.positive]="totalPnl >= 0" [class.negative]="totalPnl < 0">
              {{ totalPnl | currency:'USD':'symbol':'1.2-2' }}
            </span>
          </div>
          <div class="stat">
            <span class="stat-label">Trade Count</span>
            <span class="stat-value">{{ tradeCount | number }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Volume</span>
            <span class="stat-value">{{ (volume / 1000000) | number:'1.2-2' }}M</span>
          </div>
        </div>
      </div>
      
      <div class="grid-container">
        <ag-grid-angular
          class="ag-theme-custom"
          style="width: 100%; height: 100%;"
          [columnDefs]="columnDefs"
          [rowData]="rowData"
          [defaultColDef]="defaultColDef"
          [animateRows]="false"
          [getRowId]="getRowId"
          [rowBuffer]="20"
          [suppressCellFocus]="true"
          [enableCellChangeFlash]="true"
          (gridReady)="onGridReady($event)"
          (viewportChanged)="onViewportChanged($event)"
        ></ag-grid-angular>
      </div>
    </div>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  columnDefs: ColDef[] = [
    { field: 'id', headerName: 'Trade ID', width: 110, pinned: 'left' },
    { field: 'orderId', headerName: 'Order ID', width: 120 },
    { field: 'symbol', headerName: 'Symbol', width: 70 },
    { field: 'side', headerName: 'Side', width: 60, 
      cellStyle: (params: CellClassParams) => params.value === 'BUY' ? { color: '#00ff88' } : { color: '#ff4757' } 
    },
    { field: 'orderType', headerName: 'Type', width: 80 },
    { field: 'quantity', headerName: 'Qty', width: 60, type: 'numericColumn' },
    { field: 'filledQuantity', headerName: 'Filled', width: 70, type: 'numericColumn' },
    { field: 'limitPrice', headerName: 'Limit', width: 80, type: 'numericColumn',
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '',
      cellStyle: { textAlign: 'right' }
    },
    { field: 'marketPrice', headerName: 'Market', width: 80, type: 'numericColumn',
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '',
      cellStyle: { textAlign: 'right' }
    },
    { field: 'avgPrice', headerName: 'Avg', width: 80, type: 'numericColumn',
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '',
      cellStyle: { textAlign: 'right' }
    },
    { field: 'notional', headerName: 'Notional', width: 110, type: 'numericColumn',
      valueFormatter: (params) => params.value ? `$${params.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
      cellStyle: { textAlign: 'right' }
    },
    { field: 'commission', headerName: 'Comm', width: 70, type: 'numericColumn',
      valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '',
      cellStyle: { textAlign: 'right' }
    },
    { field: 'status', headerName: 'Status', width: 80,
      cellStyle: (params: CellClassParams) => {
        const colors: { [key: string]: string } = { PENDING: '#ffa502', FILLED: '#00ff88', PARTIAL: '#00d4ff', CANCELLED: '#ff4757' };
        return { color: colors[params.value] || '#eee' };
      }
    },
    { field: 'trader', headerName: 'Trader', width: 75 },
    { field: 'account', headerName: 'Account', width: 75 },
    { field: 'venue', headerName: 'Venue', width: 70 },
    { field: 'currency', headerName: 'Curr', width: 60 },
    { field: 'region', headerName: 'Region', width: 60 },
    { field: 'sector', headerName: 'Sector', width: 90 },
    { field: 'settlementDate', headerName: 'Settle', width: 90 },
    { field: 'timestamp', headerName: 'Timestamp', width: 160,
      valueFormatter: (params) => params.value ? new Date(params.value).toISOString() : ''
    },
    { field: 'priority', headerName: 'Priority', width: 70 },
    { field: 'algo', headerName: 'Algo', width: 80 },
    { field: 'executionVenue', headerName: 'Exec Venue', width: 90 },
    { field: 'counterparty', headerName: 'Counterparty', width: 100 },
    { field: 'bloombergId', headerName: 'BBG ID', width: 90 },
    { field: 'ricCode', headerName: 'RIC', width: 80 },
    { field: 'cusip', headerName: 'CUSIP', width: 90 },
    { field: 'isin', headerName: 'ISIN', width: 100 },
    { field: 'sedol', headerName: 'SEDOL', width: 80 }
  ];

  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: true
  };

  rowData: Trade[] = [];
  totalRows = TOTAL_ROWS;
  totalPnl = 0;
  tradeCount = 0;
  volume = 0;

  private gridApi!: GridApi;
  private renderedRange = { start: 0, end: 50 };
  private tradesData: Trade[] = [];
  private tickInterval: any;
  private dataLoaded = false;

  getRowId = (params: GetRowIdParams) => String(params.data.__index);

  ngOnInit() {
    setTimeout(() => {
      for (let i = 0; i < TOTAL_ROWS; i++) {
        this.tradesData.push(generateTrade(i + 1));
      }
      this.rowData = [...this.tradesData];
      this.dataLoaded = true;
      this.startTicking();
    }, LATENCY_MS);
  }

  private startTicking() {
    if (this.tickInterval) return;
    
    this.tickInterval = setInterval(() => {
      if (!this.gridApi) return;

      const { start, end } = this.renderedRange;
      const visibleRowCount = end - start;
      
      if (visibleRowCount <= 0) return;

      const numUpdates = Math.min(Math.floor(Math.random() * 5) + 1, visibleRowCount);
      const updates: Trade[] = [];

      for (let i = 0; i < numUpdates; i++) {
        const rowIndex = start + Math.floor(Math.random() * visibleRowCount);
        const trade = this.tradesData[rowIndex];
        if (!trade) continue;
        
        trade.marketPrice = parseFloat((trade.marketPrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
        trade.avgPrice = parseFloat(trade.marketPrice.toFixed(2));
        trade.filledQuantity = Math.min(trade.filledQuantity + Math.floor(Math.random() * 10), trade.quantity);
        trade.notional = parseFloat((trade.avgPrice * trade.quantity).toFixed(2));
        trade.commission = parseFloat((Math.random() * 10).toFixed(2));
        if (Math.random() > 0.7) {
          trade.status = randomElement(STATUS);
        }
        trade.timestamp = Date.now();

        updates.push({ ...trade });
      }

      if (updates.length > 0) {
        this.gridApi.applyTransactionAsync({ update: updates });
        this.totalPnl += (Math.random() - 0.5) * updates.length * 1000;
        this.tradeCount += updates.length;
        this.volume += updates.reduce((sum, t) => sum + t.notional, 0);
      }
    }, TICK_RATE_MS);
  }

  ngOnDestroy() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
    }
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.renderedRange = { start: 0, end: 49 };
    if (this.dataLoaded) {
      this.startTicking();
    }
  }

  onViewportChanged(params: any) {
    const topRow = this.gridApi.getFirstDisplayedRow();
    const bottomRow = this.gridApi.getLastDisplayedRow();
    this.renderedRange = { start: topRow, end: bottomRow };
  }
}
