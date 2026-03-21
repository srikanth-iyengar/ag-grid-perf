const DEFAULT_CONFIG = {
  latencyMs: 70,
  tickRateMs: 100,
  totalRows: 100000
};

function getBaseUrl() {
  return import.meta.env.BASE_URL || '/';
}

function getApiBase() {
  return new URL('mock-api/viewport', window.location.origin + getBaseUrl()).pathname.replace(/\/$/, '');
}

function waitForController() {
  if (navigator.serviceWorker.controller) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, 1500);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.clearTimeout(timeoutId);
      resolve();
    }, { once: true });
  });
}

export async function registerMockServer() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const baseUrl = getBaseUrl();
  const swUrl = new URL('mock-server-sw.js', window.location.origin + baseUrl).pathname;
  const registration = await navigator.serviceWorker.register(swUrl, { scope: baseUrl });
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  await navigator.serviceWorker.ready;
  await waitForController();
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${getApiBase()}${path}`, {
    headers: {
      Accept: 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Mock server request failed: ${response.status}`);
  }

  return response.json();
}

function toRowMap(rows) {
  return rows.reduce((rowMap, row) => {
    rowMap[row.__index] = row;
    return rowMap;
  }, {});
}

function normalizeRange(firstRow, lastRow) {
  const start = Math.max(0, firstRow);
  const end = Math.max(start, lastRow);
  return { start, end };
}

function sanitizeConfig(config) {
  return {
    latencyMs: Math.max(0, Number(config.latencyMs ?? DEFAULT_CONFIG.latencyMs)),
    tickRateMs: Math.max(16, Number(config.tickRateMs ?? DEFAULT_CONFIG.tickRateMs)),
    totalRows: Math.max(50, Number(config.totalRows ?? DEFAULT_CONFIG.totalRows))
  };
}

export async function getMockServerConfig() {
  const payload = await fetchJson('/config');
  return payload.config;
}

export async function updateMockServerConfig(config) {
  const payload = await fetchJson('/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(sanitizeConfig(config))
  });

  return payload.config;
}

export function createViewportDatasource({ onStats, onRowCount, onConfig, onRowsUpdated }) {
  let params = null;
  let range = { start: 0, end: 49 };
  let latestSeq = 0;
  let refreshTimer = null;
  let requestVersion = 0;
  let polling = false;
  let destroyed = false;
  let currentConfig = { ...DEFAULT_CONFIG };

  const clearRefreshTimer = () => {
    if (refreshTimer !== null) {
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  };

  const schedulePoll = () => {
    clearRefreshTimer();
    if (destroyed) {
      return;
    }

    refreshTimer = window.setTimeout(() => {
      void pollUpdates();
    }, currentConfig.tickRateMs);
  };

  const applyServerState = (payload) => {
    if (!params || destroyed) {
      return;
    }

    latestSeq = payload.seq;

    if (payload.config) {
      currentConfig = sanitizeConfig(payload.config);
      onConfig?.(currentConfig);
    }

    params.setRowCount(payload.rowCount, true);
    onRowCount?.(payload.rowCount);
    onStats?.(payload.stats);

    if (payload.rows.length > 0) {
      params.setRowData(toRowMap(payload.rows));
      onRowsUpdated?.(payload.rows);
    }
  };

  const loadWindow = async () => {
    if (!params || destroyed) {
      return;
    }

    const currentRequest = requestVersion + 1;
    requestVersion = currentRequest;
    const payload = await fetchJson(`/window?start=${range.start}&end=${range.end}`);

    if (destroyed || currentRequest !== requestVersion) {
      return;
    }

    applyServerState(payload);
    schedulePoll();
  };

  const pollUpdates = async () => {
    if (polling || !params || destroyed) {
      return;
    }

    polling = true;
    try {
      const payload = await fetchJson(`/updates?start=${range.start}&end=${range.end}&since=${latestSeq}`);
      applyServerState(payload);
    } finally {
      polling = false;
      schedulePoll();
    }
  };

  return {
    init(nextParams) {
      params = nextParams;
      void loadWindow();
    },
    setViewportRange(firstRow, lastRow) {
      const nextRange = normalizeRange(firstRow, lastRow);
      if (nextRange.start === range.start && nextRange.end === range.end) {
        return;
      }

      range = nextRange;
      void loadWindow();
    },
    refresh() {
      latestSeq = 0;
      void loadWindow();
    },
    destroy() {
      destroyed = true;
      clearRefreshTimer();
    }
  };
}
