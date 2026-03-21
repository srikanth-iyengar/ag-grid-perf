const DEFAULT_CONFIG = {
  latencyMs: 70,
  tickRateMs: 100,
  totalRows: 100000,
  minUpdatesPerTick: 8,
  maxUpdatesPerTick: 17
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

let serverConfig = { ...DEFAULT_CONFIG };
let trades = null;
let stats = {
  totalPnl: 0,
  tradeCount: 0,
  volume: 0
};
let sequence = 0;
let lastTickAt = Date.now();
let changeLog = [];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sanitizeConfig(config) {
  return {
    latencyMs: Math.max(0, Number(config.latencyMs ?? serverConfig.latencyMs)),
    tickRateMs: Math.max(16, Number(config.tickRateMs ?? serverConfig.tickRateMs)),
    totalRows: Math.max(50, Number(config.totalRows ?? serverConfig.totalRows)),
    minUpdatesPerTick: DEFAULT_CONFIG.minUpdatesPerTick,
    maxUpdatesPerTick: DEFAULT_CONFIG.maxUpdatesPerTick
  };
}

function generateTrade(id) {
  const basePrice = Math.random() * 1000 + 50;
  const quantity = Math.floor(Math.random() * 1000) + 1;
  return {
    id: `TRD-${String(id).padStart(6, '0')}`,
    orderId: `ORD-${String(Math.floor(Math.random() * 1000000)).padStart(8, '0')}`,
    symbol: randomElement(SYMBOLS),
    side: randomElement(SIDE),
    orderType: randomElement(ORDER_TYPE),
    quantity,
    filledQuantity: Math.floor(Math.random() * quantity),
    limitPrice: Number((basePrice * (0.9 + Math.random() * 0.2)).toFixed(2)),
    marketPrice: Number(basePrice.toFixed(2)),
    avgPrice: Number(basePrice.toFixed(2)),
    status: randomElement(STATUS),
    timestamp: Date.now() - Math.floor(Math.random() * 86400000),
    trader: `TRADER-${Math.floor(Math.random() * 100)}`,
    account: `ACC-${Math.floor(Math.random() * 1000)}`,
    venue: randomElement(VENUE),
    commission: Number((Math.random() * 10).toFixed(2)),
    currency: randomElement(CURRENCY),
    region: randomElement(REGION),
    sector: randomElement(SECTOR),
    settlementDate: new Date(Date.now() + Math.floor(Math.random() * 3) * 86400000).toISOString().split('T')[0],
    notional: Number((basePrice * quantity).toFixed(2)),
    priority: randomElement(PRIORITY),
    algo: randomElement(ALGO),
    executionVenue: randomElement(VENUE),
    counterparty: `CP-${Math.floor(Math.random() * 100)}`,
    bloombergId: `BBG${Math.floor(Math.random() * 10000000)}`,
    ricCode: `${randomElement(SYMBOLS)}.${randomElement(['OQ', 'US', 'OB', 'UP'])}`,
    cusip: Math.random().toString(36).slice(2, 11).toUpperCase(),
    isin: `${randomElement(['US', 'GB', 'DE', 'FR'])}${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
    sedol: Math.random().toString(36).slice(2, 9).toUpperCase(),
    __index: id - 1
  };
}

function resetData() {
  trades = Array.from({ length: serverConfig.totalRows }, (_, index) => generateTrade(index + 1));
  stats = {
    totalPnl: 0,
    tradeCount: 0,
    volume: 0
  };
  sequence = 0;
  lastTickAt = Date.now();
  changeLog = [];
}

function ensureData() {
  if (!trades || trades.length !== serverConfig.totalRows) {
    resetData();
  }
}

function mutateTrade(trade) {
  const changedFields = ['marketPrice', 'avgPrice', 'filledQuantity', 'notional', 'commission', 'timestamp'];
  trade.marketPrice = Number((trade.marketPrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
  trade.avgPrice = Number(trade.marketPrice.toFixed(2));
  trade.filledQuantity = Math.min(trade.filledQuantity + Math.floor(Math.random() * 10), trade.quantity);
  trade.notional = Number((trade.avgPrice * trade.quantity).toFixed(2));
  trade.commission = Number((Math.random() * 10).toFixed(2));
  if (Math.random() > 0.7) {
    trade.status = randomElement(STATUS);
    changedFields.push('status');
  }
  trade.timestamp = Date.now();
  return changedFields;
}

function pickRowIndex(start, end) {
  if (start <= end) {
    const clampedStart = Math.max(0, start);
    const clampedEnd = Math.min(serverConfig.totalRows - 1, end);

    if (clampedStart <= clampedEnd && Math.random() < 0.9) {
      return clampedStart + Math.floor(Math.random() * (clampedEnd - clampedStart + 1));
    }
  }

  return Math.floor(Math.random() * serverConfig.totalRows);
}

function advanceTicker(start, end) {
  ensureData();

  const now = Date.now();
  const ticksToApply = Math.min(Math.floor((now - lastTickAt) / serverConfig.tickRateMs), 50);

  if (ticksToApply <= 0) {
    return;
  }

  for (let tick = 0; tick < ticksToApply; tick += 1) {
    const updateCount = Math.floor(Math.random() * (serverConfig.maxUpdatesPerTick - serverConfig.minUpdatesPerTick + 1)) + serverConfig.minUpdatesPerTick;

    for (let i = 0; i < updateCount; i += 1) {
      const rowIndex = pickRowIndex(start, end);
      const trade = trades[rowIndex];

      const changedFields = mutateTrade(trade);
      sequence += 1;
      changeLog.push({
        seq: sequence,
        rowIndex,
        row: { ...trade, __changedFields: changedFields }
      });

      stats.totalPnl += (Math.random() - 0.5) * 1000;
      stats.tradeCount += 1;
      stats.volume += trade.notional;
    }
  }

  lastTickAt += ticksToApply * serverConfig.tickRateMs;
  if (changeLog.length > 20000) {
    changeLog = changeLog.slice(-10000);
  }
}

function getWindowRows(start, end) {
  ensureData();

  const rangeStart = Math.max(0, start);
  const rangeEnd = Math.min(serverConfig.totalRows - 1, end);

  if (rangeEnd < rangeStart) {
    return [];
  }

  return trades.slice(rangeStart, rangeEnd + 1);
}

function getUpdatedRows(start, end, since) {
  const rowMap = {};

  for (const entry of changeLog) {
    if (entry.seq <= since) {
      continue;
    }
    if (entry.rowIndex < start || entry.rowIndex > end) {
      continue;
    }
    rowMap[entry.rowIndex] = entry.row;
  }

  return Object.keys(rowMap)
    .map((key) => rowMap[Number(key)])
    .sort((a, b) => a.__index - b.__index);
}

async function createJsonResponse(body) {
  await new Promise((resolve) => setTimeout(resolve, serverConfig.latencyMs));

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

async function handleConfigUpdate(request) {
  const nextConfig = sanitizeConfig(await request.json());
  const totalRowsChanged = nextConfig.totalRows !== serverConfig.totalRows;
  serverConfig = nextConfig;

  if (totalRowsChanged) {
    resetData();
  } else {
    ensureData();
    lastTickAt = Date.now();
  }

  return createJsonResponse({
    config: serverConfig,
    rowCount: serverConfig.totalRows,
    seq: sequence,
    stats
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  const apiPrefix = `${scopePath}mock-api/viewport/`;

  if (url.origin !== self.location.origin || !url.pathname.startsWith(apiPrefix)) {
    return;
  }

  event.respondWith((async () => {
    if (url.pathname === `${scopePath}mock-api/viewport/config`) {
      if (event.request.method === 'POST') {
        return handleConfigUpdate(event.request);
      }

      ensureData();
      return createJsonResponse({
        config: serverConfig,
        rowCount: serverConfig.totalRows,
        seq: sequence,
        stats
      });
    }

    const start = Number(url.searchParams.get('start') ?? '0');
    const end = Number(url.searchParams.get('end') ?? String(start));
    const since = Number(url.searchParams.get('since') ?? '0');
    advanceTicker(start, end);

    if (url.pathname === `${scopePath}mock-api/viewport/window`) {
      return createJsonResponse({
        rowCount: serverConfig.totalRows,
        seq: sequence,
        stats,
        config: serverConfig,
        rows: getWindowRows(start, end)
      });
    }

    if (url.pathname === `${scopePath}mock-api/viewport/updates`) {
      return createJsonResponse({
        rowCount: serverConfig.totalRows,
        seq: sequence,
        stats,
        config: serverConfig,
        rows: getUpdatedRows(start, end, since)
      });
    }

    return new Response('Not Found', { status: 404 });
  })());
});
