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
const AVAILABLE_VERSIONS = ['32', '33', '35'];
const THEME_STORAGE_KEY = 'ag-grid-angular-theme';

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

type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  template: `
    <div class="container app-shell" [class.dark-mode]="theme === 'dark'" [class.light-mode]="theme === 'light'">
      <div class="header">
        <div>
          <h1>AG Grid Angular v{{ currentVersion }} - Viewport Row Model <span class="header-sub">Mocked server latency: {{ serverConfig.latencyMs }}ms | Data tick rate: {{ serverConfig.tickRateMs }}ms | Total rows: {{ serverConfig.totalRows | number }}</span></h1>
        </div>
        <div class="stats">
          <button class="theme-toggle" type="button" (click)="toggleTheme()">
            {{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}
          </button>
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
          [class.ag-theme-quartz]="theme === 'light'"
          [class.ag-theme-quartz-dark]="theme === 'dark'"
          style="width: 100%; height: 100%;"
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
          <span>AG Grid version</span>
          <select [ngModel]="currentVersion" (ngModelChange)="switchVersion($event)">
            <option *ngFor="let version of availableVersions" [ngValue]="version">v{{ version }}</option>
          </select>
        </label>
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
      background: var(--panel-bg);
      color: var(--panel-text);
      border: 1px solid var(--panel-border);
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .header h1 {
      margin: 0 0 12px 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--accent);
    }

    .header-sub {
      font-size: 12px;
      color: var(--muted-text);
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
      color: var(--muted-text);
      margin-bottom: 2px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;
      color: var(--accent);
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
      background: var(--panel-bg);
      border-radius: 8px;
      border: 1px solid var(--panel-border);
    }

    .theme-toggle {
      border: 1px solid var(--panel-border);
      border-radius: 999px;
      background: transparent;
      color: var(--panel-text);
      padding: 10px 14px;
      font: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
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
      border: 1px solid var(--control-border);
      border-radius: 999px;
      padding: 10px 14px;
      background: var(--control-bg);
      color: var(--control-text);
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
      background: var(--control-bg);
      color: var(--control-text);
      border: 1px solid var(--control-border);
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
      color: var(--muted-text);
      font-size: 12px;
    }

    .devtools-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
      font-size: 12px;
      color: var(--muted-text);
    }

    .devtools-field input {
      border: 1px solid var(--control-border);
      border-radius: 10px;
      background: var(--input-bg);
      color: var(--control-text);
      padding: 10px 12px;
      font: inherit;
    }

    .devtools-field select {
      border: 1px solid var(--control-border);
      border-radius: 10px;
      background: var(--input-bg);
      color: var(--control-text);
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
      border: 1px solid var(--control-border);
      background: transparent;
      color: var(--control-text);
    }

    .devtools-primary {
      border: none;
      background: linear-gradient(135deg, #38bdf8, #22c55e);
      color: #0f172a;
    }

    .ag-theme-custom {
      --ag-font-family: 'Monaco', 'Menlo', monospace;
      --ag-font-size: 13px;
      --ag-cell-horizontal-padding: 12px;
    }

    .app-shell.dark-mode .ag-theme-custom {
      --ag-background-color: #16213e;
      --ag-foreground-color: #eee;
      --ag-header-background-color: #0f3460;
      --ag-header-foreground-color: #00d4ff;
      --ag-border-color: #0f3460;
      --ag-odd-row-background-color: #1a1a2e;
      --ag-row-hover-color: rgba(15, 52, 96, 0.7);
      --ag-selected-row-background-color: rgba(15, 52, 96, 0.8);
    }

    .app-shell.light-mode .ag-theme-custom {
      --ag-background-color: #ffffff;
      --ag-foreground-color: #10233f;
      --ag-header-background-color: #dfeaf7;
      --ag-header-foreground-color: #0b6bcb;
      --ag-border-color: #c7d6ea;
      --ag-odd-row-background-color: #f6f9fc;
      --ag-row-hover-color: rgba(173, 202, 236, 0.35);
      --ag-selected-row-background-color: rgba(173, 202, 236, 0.45);
    }

    @media (max-width: 900px) {
      .header {
        flex-direction: column;
      }

      .stats {
        flex-wrap: wrap;
      }
    }
  `]
})
export class AppComponent implements OnInit, OnDestroy {
  readonly availableVersions = AVAILABLE_VERSIONS;
  readonly currentVersion = typeof window === 'undefined'
    ? '35'
    : window.location.pathname.match(/-v(\d+)(?:\/|$)/)?.[1] ?? '35';
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
  theme: ThemeMode = this.getInitialTheme();

  totalPnl = 0;
  tradeCount = 0;
  volume = 0;

  private gridApi!: GridApi;

  getRowId = (params: GetRowIdParams) => String(params.data?.__index);

  async ngOnInit() {
    this.applyTheme();
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

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme();
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
          .filter((column): column is Column => !!column);

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

  }

  private applyStats(stats: MockServerStats) {
    this.totalPnl = stats.totalPnl;
    this.tradeCount = stats.tradeCount;
    this.volume = stats.volume;
  }

  ngOnDestroy() {
    this.viewportDatasource?.destroy?.();
  }

  switchVersion(version: string) {
    window.location.href = new URL(`../ag-grid-angular-v${version}/`, window.location.href).toString();
  }

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
  }

  private getInitialTheme(): ThemeMode {
    if (typeof window === 'undefined') {
      return 'dark';
    }

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private applyTheme() {
    if (typeof document !== 'undefined') {
      document.body.dataset['appTheme'] = this.theme;
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, this.theme);
    }
  }
}
