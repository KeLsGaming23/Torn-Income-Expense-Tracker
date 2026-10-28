import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 1. Sync & Wallet Status
export const triggerSync = () => api.post('/sync').then(r => r.data);
export const getSyncStatus = () => api.get('/sync/status').then(r => r.data);

// 2. Command Center (Dashboard)
export const getCommandCenterData = () => 
  api.get('/dashboard/command-center').then(r => r.data);

// 3. Museum Set Builder & FIFO Pricing
export const simulateMuseumSet = (setType, setCount) => 
  api.get('/museum/simulate', { params: { setType, setCount } }).then(r => r.data);

export const convertMuseumSets = (payload) => 
  api.post('/museum/convert', payload).then(r => r.data);

export const getConversionsHistory = () => 
  api.get('/museum/conversions').then(r => r.data);

export const getLivePointsMarket = () => 
  api.get('/market/points-live').then(r => r.data);

// 4. FIFO Inventory Lots & Leftovers Vault
export const getInventoryLots = (params) => 
  api.get('/inventory/lots', { params }).then(r => r.data);

export const addManualInventoryLot = (payload) => 
  api.post('/inventory/lots', payload).then(r => r.data);

export const deleteInventoryLot = (id) => 
  api.delete(`/inventory/lots/${id}`).then(r => r.data);

export const getMasterItems = () => 
  api.get('/inventory/master-items').then(r => r.data);

// 5. Personal Expenses & Vault Tracker
export const getExpenses = (params) => 
  api.get('/expenses', { params }).then(r => r.data);

export const logExpense = (payload) => 
  api.post('/expenses', payload).then(r => r.data);

export const deleteExpense = (id) => 
  api.delete(`/expenses/${id}`).then(r => r.data);

export default api;
