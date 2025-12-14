// api/_store.js (CommonJS)
const g = globalThis;

g.__CLIMATECLOUD__ = g.__CLIMATECLOUD__ || {
  latest: { temperature: null, humidity: null, timestamp: null, deviceId: null },
  history: []
};

function getStore() {
  return g.__CLIMATECLOUD__;
}

function addHistoryPoint(point, maxPoints = 500) {
  const store = getStore();
  store.history.push(point);
  if (store.history.length > maxPoints) {
    store.history.splice(0, store.history.length - maxPoints);
  }
}

module.exports = { getStore, addHistoryPoint };