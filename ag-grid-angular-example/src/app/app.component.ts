import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellClassParams,
  Column,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  IViewportDatasource
} from 'ag-grid-community';
import { createViewportDatasource, getMockServerConfig, MockServerConfig, MockServerStats, updateMockServerConfig, UpdatedViewportRow } from './mock-server';

const DEFAULT_CONFIG: MockServerConfig = {
  latencyMs: 70,
  tickRateMs: 100,
  totalRows: 100000
};

const DEFAULT_GRID_CONFIG = {
  rowBuffer: 0,
  viewportRowModelBufferSize: 20
};

const STATUS = ['PENDING', 'FILLED', 'PARTIAL', 'CANCELLED'];

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

interface ColumnItem {
  field: string;
  headerName: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  template: `
    <div class="container">
      <div class="header">
        <h1>AG Grid Angular - Viewport Row Model <span class="header-sub">Mocked server latency: {{ serverConfig.latencyMs }}ms | Data tick rate: {{ serverConfig.tickRateMs }}ms | Total rows: {{ serverConfig.totalRows | number }}</span></h1>
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
          [theme]="'legacy'"
          [columnDefs]="columnDefs"
          [defaultColDef]="defaultColDef"
          [rowModelType]="'viewport'"
          [viewportDatasource]="viewportDatasource"
          [viewportRowModelPageSize]="50"
          [viewportRowModelBufferSize]="gridConfig.viewportRowModelBufferSize"
          [enableRangeSelection]="true"
          [animateRows]="false"
          [getRowId]="getRowId"
          [rowBuffer]="gridConfig.rowBuffer"
          [suppressCellFocus]="true"
          (gridReady)="onGridReady($event)"
        ></ag-grid-angular>
      </div>
    </div>

    <div class="devtools-shell" [class.open]="devtoolsOpen">
      <button class="devtools-toggle" type="button" (click)="toggleDevtools()">
        <span class="devtools-dot"></span>
        <span class="devtools-icon">Tools</span>
      </button>
      <div class="devtools-panel" *ngIf="devtoolsOpen">
        <div class="devtools-title">Mock Server</div>
        <div class="devtools-subtitle">Viewport controls</div>
        <label class="devtools-field">
          <span>Latency ms</span>
          <input type="number" min="0" [(ngModel)]="draftConfig.latencyMs" (ngModelChange)="draftDirty = true" />
        </label>
        <label class="devtools-field">
          <span>Tick rate ms</span>
          <input type="number" min="16" [(ngModel)]="draftConfig.tickRateMs" (ngModelChange)="draftDirty = true" />
        </label>
        <label class="devtools-field">
          <span>Total rows</span>
          <input type="number" min="50" [(ngModel)]="draftConfig.totalRows" (ngModelChange)="draftDirty = true" />
        </label>
        <label class="devtools-field">
          <span>Row buffer</span>
          <input type="number" min="0" [(ngModel)]="draftGridConfig.rowBuffer" (ngModelChange)="draftDirty = true" />
        </label>
        <label class="devtools-field">
          <span>Viewport buffer</span>
          <input type="number" min="0" [(ngModel)]="draftGridConfig.viewportRowModelBufferSize" (ngModelChange)="draftDirty = true" />
        </label>
        <div class="devtools-actions">
          <button type="button" class="devtools-ghost" (click)="resetDraftConfig()">Reset</button>
          <button type="button" class="devtools-primary" (click)="applyConfig()">Apply</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      height: 100vh;
      display: block;
    }

    .container {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 16px 20px;
      background: #1a1a2e;
      color: white;
    }

    .header h1 {
      margin: 0 0 12px 0;
      font-size: 20px;
      font-weight: 600;
    }

    .header-sub {
      font-size: 12px;
      opacity: 0.7;
      font-weight: normal;
    }

    .stats {
      display: flex;
      gap: 24px;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-label {
      font-size: 11px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 2px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
    }

    .positive {
      color: #00ff88;
    }

    .negative {
      color: #ff4757;
    }

    .grid-container {
      flex: 1;
      overflow: hidden;
    }

    .devtools-shell {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    }

    .devtools-toggle {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 999px;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.96);
      color: #f8fafc;
      box-shadow: 0 14px 40px rgba(15, 23, 42, 0.32);
      cursor: pointer;
    }

    .devtools-dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: #22c55e;
      box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.18);
    }

    .devtools-icon {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .devtools-panel {
      width: 260px;
      border-radius: 18px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.97);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.42);
      backdrop-filter: blur(16px);
    }

    .devtools-title {
      font-size: 14px;
      font-weight: 700;
    }

    .devtools-subtitle {
      margin-top: 2px;
      margin-bottom: 14px;
      color: #94a3b8;
      font-size: 12px;
    }

    .devtools-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
      font-size: 12px;
      color: #cbd5e1;
    }

    .devtools-field input {
      border: 1px solid rgba(148, 163, 184, 0.25);
      border-radius: 10px;
      background: rgba(30, 41, 59, 0.95);
      color: #f8fafc;
      padding: 10px 12px;
      font: inherit;
    }

    .devtools-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 4px;
    }

    .devtools-actions button {
      border-radius: 10px;
      padding: 9px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .devtools-ghost {
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: transparent;
      color: #cbd5e1;
    }

    .devtools-primary {
      border: none;
      background: linear-gradient(135deg, #38bdf8, #22c55e);
      color: #0f172a;
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly allColumns: ColumnItem[] = [
    { field: 'id', headerName: 'Trade ID' },
    { field: 'orderId', headerName: 'Order ID' },
    { field: 'symbol', headerName: 'Symbol' },
    { field: 'side', headerName: 'Side' },
    { field: 'orderType', headerName: 'Type' },
    { field: 'quantity', headerName: 'Qty' },
    { field: 'filledQuantity', headerName: 'Filled' },
    { field: 'limitPrice', headerName: 'Limit' },
    { field: 'marketPrice', headerName: 'Market' },
    { field: 'avgPrice', headerName: 'Avg' },
    { field: 'notional', headerName: 'Notional' },
    { field: 'commission', headerName: 'Comm' },
    { field: 'status', headerName: 'Status' },
    { field: 'trader', headerName: 'Trader' },
    { field: 'account', headerName: 'Account' },
    { field: 'venue', headerName: 'Venue' },
    { field: 'currency', headerName: 'Curr' },
    { field: 'region', headerName: 'Region' },
    { field: 'sector', headerName: 'Sector' },
    { field: 'settlementDate', headerName: 'Settle' },
    { field: 'timestamp', headerName: 'Timestamp' },
    { field: 'priority', headerName: 'Priority' },
    { field: 'algo', headerName: 'Algo' },
    { field: 'executionVenue', headerName: 'Exec Venue' },
    { field: 'counterparty', headerName: 'Counterparty' },
    { field: 'bloombergId', headerName: 'BBG ID' },
    { field: 'ricCode', headerName: 'RIC' },
    { field: 'cusip', headerName: 'CUSIP' },
    { field: 'isin', headerName: 'ISIN' },
    { field: 'sedol', headerName: 'SEDOL' }
  ];

  columnDefs: ColDef[] = [];
  defaultColDef: ColDef = {
    sortable: true,
    resizable: true,
    suppressMovable: true
  };
  viewportDatasource!: IViewportDatasource & { refresh: () => void };
  serverConfig: MockServerConfig = { ...DEFAULT_CONFIG };
  draftConfig: MockServerConfig = { ...DEFAULT_CONFIG };
  gridConfig = { ...DEFAULT_GRID_CONFIG };
  draftGridConfig = { ...DEFAULT_GRID_CONFIG };
  devtoolsOpen = false;
  draftDirty = false;

  totalPnl = 0;
  tradeCount = 0;
  volume = 0;

  private gridApi!: GridApi<Trade>;

  getRowId = (params: GetRowIdParams<Trade>) => String(params.data?.__index);

  async ngOnInit() {
    this.updateGridColumns();
    try {
      const config = await getMockServerConfig();
      this.serverConfig = config;
      this.draftConfig = { ...config };
      this.gridConfig = { ...DEFAULT_GRID_CONFIG };
      this.draftGridConfig = { ...DEFAULT_GRID_CONFIG };
    } catch {
      this.serverConfig = { ...DEFAULT_CONFIG };
      this.draftConfig = { ...DEFAULT_CONFIG };
      this.gridConfig = { ...DEFAULT_GRID_CONFIG };
      this.draftGridConfig = { ...DEFAULT_GRID_CONFIG };
    }

    this.viewportDatasource = createViewportDatasource({
      onStats: (stats) => this.applyStats(stats),
      onRowCount: (rowCount) => {
        this.serverConfig = { ...this.serverConfig, totalRows: rowCount };
      },
      onConfig: (config) => {
        this.serverConfig = config;
        if (!this.devtoolsOpen || !this.draftDirty) {
          this.draftConfig = { ...config };
          this.draftGridConfig = { ...this.gridConfig };
          this.draftDirty = false;
        }
      },
      onRowsUpdated: (rows) => this.flashChangedCells(rows)
    });
  }

  async applyConfig() {
    const config = await updateMockServerConfig(this.draftConfig);
    this.serverConfig = config;
    this.draftConfig = { ...config };
    this.gridConfig = { ...this.draftGridConfig };
    this.draftDirty = false;
    this.viewportDatasource?.refresh();
  }

  resetDraftConfig() {
    this.draftConfig = { ...this.serverConfig };
    this.draftGridConfig = { ...this.gridConfig };
    this.draftDirty = false;
  }

  toggleDevtools() {
    this.devtoolsOpen = !this.devtoolsOpen;
    if (this.devtoolsOpen && !this.draftDirty) {
      this.draftConfig = { ...this.serverConfig };
      this.draftGridConfig = { ...this.gridConfig };
    }
  }

  private flashChangedCells(rows: UpdatedViewportRow[]) {
    if (!this.gridApi || rows.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      rows.forEach((row) => {
        const rowNode = this.gridApi.getRowNode(String(row.__index));
        if (!rowNode) {
          return;
        }

        const columns = (row.__changedFields ?? [])
          .map((field) => this.gridApi.getColumn(field))
          .filter((column): column is Column<Trade> => !!column);

        if (columns.length === 0) {
          return;
        }

        this.gridApi.flashCells({
          rowNodes: [rowNode],
          columns
        });
      });
    });
  }

  private updateGridColumns() {
    const widthMap: Record<string, number> = {
      id: 110, orderId: 120, symbol: 70, side: 60, orderType: 80,
      quantity: 60, filledQuantity: 70, limitPrice: 80, marketPrice: 80,
      avgPrice: 80, notional: 110, commission: 70, status: 80,
      trader: 75, account: 75, venue: 70, currency: 60, region: 60,
      sector: 90, settlementDate: 90, timestamp: 160, priority: 70,
      algo: 80, executionVenue: 90, counterparty: 100, bloombergId: 90,
      ricCode: 80, cusip: 90, isin: 100, sedol: 80
    };

    this.columnDefs = this.allColumns.map((col) => {
      const colDef: ColDef = {
        field: col.field,
        headerName: col.headerName,
        width: widthMap[col.field] || 100
      };

      if (col.field === 'side') {
        colDef.cellStyle = (params: CellClassParams<Trade>) => params.value === 'BUY' ? { color: '#00ff88' } : { color: '#ff4757' };
      }

      if (col.field === 'status') {
        colDef.cellStyle = (params: CellClassParams<Trade>) => {
          const colors: Record<string, string> = { PENDING: '#ffa502', FILLED: '#00ff88', PARTIAL: '#00d4ff', CANCELLED: '#ff4757' };
          return { color: colors[String(params.value)] || '#eee' };
        };
      }

      if (['limitPrice', 'marketPrice', 'avgPrice', 'notional', 'commission'].includes(col.field)) {
        colDef.type = 'numericColumn';
        colDef.valueFormatter = (params) => params.value ? `$${Number(params.value).toFixed(2)}` : '';
        colDef.cellStyle = { textAlign: 'right' };
      }

      if (col.field === 'timestamp') {
        colDef.valueFormatter = (params) => params.value ? new Date(Number(params.value)).toISOString() : '';
      }

      if (col.field === 'id') {
        colDef.pinned = 'left';
      }

      return colDef;
    });

    if (this.gridApi) {
      this.gridApi.setGridOption('columnDefs', this.columnDefs);
    }
  }

  private applyStats(stats: MockServerStats) {
    this.totalPnl = stats.totalPnl;
    this.tradeCount = stats.tradeCount;
    this.volume = stats.volume;
  }

  ngOnDestroy() {
    this.viewportDatasource?.destroy?.();
  }

  onGridReady(params: GridReadyEvent<Trade>) {
    this.gridApi = params.api;
  }
}
