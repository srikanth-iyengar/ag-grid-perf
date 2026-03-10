import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';

const LATENCY_MS = 70;
const TICK_RATE_MS = 100;
const TOTAL_ROWS = 100000;

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
    cellStyle: params => params.value === 'BUY' ? { color: '#00ff88' } : { color: '#ff4757' } 
  },
  { field: 'orderType', headerName: 'Type', width: 80 },
  { field: 'quantity', headerName: 'Qty', width: 60, type: 'numericColumn' },
  { field: 'filledQuantity', headerName: 'Filled', width: 70, type: 'numericColumn' },
  { field: 'limitPrice', headerName: 'Limit', width: 80, type: 'numericColumn',
    valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : '',
    cellStyle: { textAlign: 'right' }
  },
  { field: 'marketPrice', headerName: 'Market', width: 80, type: 'numericColumn',
    valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : '',
    cellStyle: { textAlign: 'right' }
  },
  { field: 'avgPrice', headerName: 'Avg', width: 80, type: 'numericColumn',
    valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : '',
    cellStyle: { textAlign: 'right' }
  },
  { field: 'notional', headerName: 'Notional', width: 110, type: 'numericColumn',
    valueFormatter: params => params.value ? `$${params.value.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '',
    cellStyle: { textAlign: 'right' }
  },
  { field: 'commission', headerName: 'Comm', width: 70, type: 'numericColumn',
    valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : '',
    cellStyle: { textAlign: 'right' }
  },
  { field: 'status', headerName: 'Status', width: 80,
    cellStyle: params => {
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
    valueFormatter: params => params.value ? new Date(params.value).toISOString() : ''
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

function App() {
  const [rowData, setRowData] = useState([]);
  const [stats, setStats] = useState({ totalPnl: 0, tradeCount: 0, volume: 0 });
  const gridApiRef = useRef(null);
  const renderedRangeRef = useRef({ start: 0, end: 50 });
  const dataLoadedRef = useRef(false);
  const tradesDataRef = useRef([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTimeout(() => {
      const trades = [];
      for (let i = 0; i < TOTAL_ROWS; i++) {
        trades.push(generateTrade(i + 1));
      }
      tradesDataRef.current = trades;
      setRowData(trades);
      dataLoadedRef.current = true;
    }, LATENCY_MS);
  }, []);

  useEffect(() => {
    if (dataLoadedRef.current && gridApiRef.current && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const gridApi = gridApiRef.current;
        if (!gridApi) return;

        const { start, end } = renderedRangeRef.current;
        const visibleRowCount = end - start;
        
        if (visibleRowCount <= 0) return;

        const numUpdates = Math.min(Math.floor(Math.random() * 5) + 1, visibleRowCount);
        const updates = [];

        for (let i = 0; i < numUpdates; i++) {
          const rowIndex = start + Math.floor(Math.random() * visibleRowCount);
          const trade = tradesDataRef.current[rowIndex];
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
          gridApi.applyTransactionAsync({ update: updates });
          setStats(prev => ({
            totalPnl: prev.totalPnl + (Math.random() - 0.5) * updates.length * 1000,
            tradeCount: prev.tradeCount + updates.length,
            volume: prev.volume + updates.reduce((sum, t) => sum + t.notional, 0)
          }));
        }
      }, TICK_RATE_MS);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [rowData]);

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
  }, []);

  const onViewportChanged = useCallback((params) => {
    const topRow = params.api.getFirstDisplayedRow();
    const bottomRow = params.api.getLastDisplayedRow();
    renderedRangeRef.current = { start: topRow, end: bottomRow };
  }, []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
    suppressMovable: true
  }), []);

  return (
    <div className="container">
      <div className="header">
        <h1>AG Grid React - Viewport Row Model <span className="header-sub">Mocked server latency: 70ms | Data tick rate: 100ms | Total rows: {TOTAL_ROWS.toLocaleString()}</span></h1>
        <div className="stats">
          <div className="stat">
            <span className="stat-label">Total P&L</span>
            <span className={`stat-value ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
              ${stats.totalPnl.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
          columnDefs={columnDefs}
          rowData={rowData}
          defaultColDef={defaultColDef}
          rowModelType="clientSide"
          animateRows={false}
          getRowId={(params) => String(params.data.__index)}
          onGridReady={onGridReady}
          onViewportChanged={onViewportChanged}
          rowBuffer={0}
          viewportRowModelPageSize={40}
          viewportRowModelBufferSize={0}
          suppressCellFocus={true}
          enableCellChangeFlash={true}
        />
      </div>
    </div>
  );
}

export default App;
