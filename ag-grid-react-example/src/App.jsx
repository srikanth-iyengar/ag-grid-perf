import { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import { createViewportDatasource, getMockServerConfig, updateMockServerConfig } from './mockServer';

const DEFAULT_CONFIG = {
  latencyMs: 70,
  tickRateMs: 100,
  totalRows: 100000
};

const DEFAULT_GRID_CONFIG = {
  rowBuffer: 0,
  viewportRowModelBufferSize: 20
};

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

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrade(id) {
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

const columnDefs = [
  { field: 'id', headerName: 'Trade ID', width: 110, pinned: 'left' },
  { field: 'orderId', headerName: 'Order ID', width: 120 },
  { field: 'symbol', headerName: 'Symbol', width: 70 },
  { field: 'side', headerName: 'Side', width: 60,
    cellStyle: (params) => params.value === 'BUY' ? { color: '#00ff88' } : { color: '#ff4757' }
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
    valueFormatter: (params) => params.value ? `$${params.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '',
    cellStyle: { textAlign: 'right' }
  },
  { field: 'commission', headerName: 'Comm', width: 70, type: 'numericColumn',
    valueFormatter: (params) => params.value ? `$${params.value.toFixed(2)}` : '',
    cellStyle: { textAlign: 'right' }
  },
  { field: 'status', headerName: 'Status', width: 80,
    cellStyle: (params) => {
      const colors = { PENDING: '#ffa502', FILLED: '#00ff88', PARTIAL: '#00d4ff', CANCELLED: '#ff4757' };
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

function ConfigInput({ label, value, min, step = 1, onChange }) {
  return (
    <label className="devtools-field">
      <span>{label}</span>
      <input type="number" min={min} step={step} value={value} onChange={onChange} />
    </label>
  );
}

function MockServerDevtools({ serverConfig, gridConfig, onApply }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ ...serverConfig, ...gridConfig });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open || !dirty) {
      setDraft({ ...serverConfig, ...gridConfig });
      setDirty(false);
    }
  }, [serverConfig, gridConfig, open, dirty]);

  const updateDraft = (field) => (event) => {
    setDirty(true);
    setDraft((prev) => ({
      ...prev,
      [field]: Number(event.target.value)
    }));
  };

  return (
    <div className={`devtools-shell ${open ? 'open' : ''}`}>
      <button className="devtools-toggle" type="button" onClick={() => setOpen((prev) => !prev)}>
        <span className="devtools-dot" />
        <span className="devtools-icon">Tools</span>
      </button>
      {open ? (
        <div className="devtools-panel">
          <div className="devtools-title">Mock Server</div>
          <div className="devtools-subtitle">Viewport controls</div>
          <ConfigInput label="Latency ms" value={draft.latencyMs} min={0} onChange={updateDraft('latencyMs')} />
          <ConfigInput label="Tick rate ms" value={draft.tickRateMs} min={16} onChange={updateDraft('tickRateMs')} />
          <ConfigInput label="Total rows" value={draft.totalRows} min={50} onChange={updateDraft('totalRows')} />
          <ConfigInput label="Row buffer" value={draft.rowBuffer} min={0} onChange={updateDraft('rowBuffer')} />
          <ConfigInput label="Viewport buffer" value={draft.viewportRowModelBufferSize} min={0} onChange={updateDraft('viewportRowModelBufferSize')} />
          <div className="devtools-actions">
            <button type="button" className="devtools-ghost" onClick={() => { setDraft({ ...serverConfig, ...gridConfig }); setDirty(false); }}>Reset</button>
            <button type="button" className="devtools-primary" onClick={() => { setDirty(false); onApply(draft); }}>Apply</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function App() {
  const [stats, setStats] = useState({ totalPnl: 0, tradeCount: 0, volume: 0 });
  const [serverConfig, setServerConfig] = useState(DEFAULT_CONFIG);
  const [gridConfig, setGridConfig] = useState(DEFAULT_GRID_CONFIG);
  const gridApiRef = useRef(null);
  const viewportDatasourceRef = useRef(null);

  useEffect(() => {
    void getMockServerConfig().then(setServerConfig).catch(() => {});

    return () => {
      viewportDatasourceRef.current?.destroy?.();
      viewportDatasourceRef.current = null;
    };
  }, []);

  const flashChangedCells = (rows) => {
    const api = gridApiRef.current;
    if (!api || rows.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      rows.forEach((row) => {
        const rowNode = api.getRowNode(String(row.__index));
        if (!rowNode) {
          return;
        }

        const columns = (row.__changedFields ?? [])
          .map((field) => api.getColumn(field))
          .filter(Boolean);

        if (columns.length === 0) {
          return;
        }

        api.flashCells({
          rowNodes: [rowNode],
          columns
        });
      });
    });
  };

  const onGridReady = ({ api }) => {
    gridApiRef.current = api;
    const datasource = createViewportDatasource({
      onStats: setStats,
      onRowCount: (rowCount) => setServerConfig((prev) => ({ ...prev, totalRows: rowCount })),
      onConfig: setServerConfig,
      onRowsUpdated: flashChangedCells
    });

    viewportDatasourceRef.current = datasource;
    api.setViewportDatasource(datasource);
  };

  const applyConfig = async (nextConfig) => {
    const config = await updateMockServerConfig({
      latencyMs: nextConfig.latencyMs,
      tickRateMs: nextConfig.tickRateMs,
      totalRows: nextConfig.totalRows
    });
    setServerConfig(config);
    setGridConfig({
      rowBuffer: nextConfig.rowBuffer,
      viewportRowModelBufferSize: nextConfig.viewportRowModelBufferSize
    });
    viewportDatasourceRef.current?.refresh?.();
  };

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: true
  }), []);

  return (
    <>
      <div className="container">
        <div className="header">
          <h1>AG Grid React - Viewport Row Model <span className="header-sub">Mocked server latency: {serverConfig.latencyMs}ms | Data tick rate: {serverConfig.tickRateMs}ms | Total rows: {serverConfig.totalRows.toLocaleString()}</span></h1>
          <div className="stats">
            <div className="stat">
              <span className="stat-label">Total P&L</span>
              <span className={`stat-value ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
                ${stats.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Trade Count</span>
              <span className="stat-value">{stats.tradeCount.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Volume</span>
              <span className="stat-value">${(stats.volume / 1000000).toFixed(2)}M</span>
            </div>
          </div>
        </div>

        <div className="grid-container">
          <AgGridReact
          className="ag-theme-custom"
          theme="legacy"
          columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            rowModelType="viewport"
            viewportRowModelPageSize={50}
            viewportRowModelBufferSize={gridConfig.viewportRowModelBufferSize}
            enableRangeSelection={true}
            animateRows={false}
            getRowId={(params) => String(params.data.__index)}
            onGridReady={onGridReady}
            rowBuffer={gridConfig.rowBuffer}
            suppressCellFocus={true}
          />
        </div>
      </div>
      <MockServerDevtools serverConfig={serverConfig} gridConfig={gridConfig} onApply={applyConfig} />
    </>
  );
}

export default App;
