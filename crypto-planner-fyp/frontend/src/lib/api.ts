const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper to get auth token
function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

// Generic fetch wrapper with auth
async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  register: (email: string, password: string, fullName: string) =>
    apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    }),

  login: (email: string, password: string) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// Wallet API
export const walletApi = {
  getWallet: () => apiFetch('/wallet'),
  deposit: (amount: number) =>
    apiFetch('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
};

// Investment API
export const investmentApi = {
  simulate: (asset: string, amount: number, years: number, compoundFrequency: number) =>
    apiFetch('/investments/simulate', {
      method: 'POST',
      body: JSON.stringify({ asset, amount, years, compoundFrequency }),
    }),

  create: (asset: string, amount: number, years: number, compoundFrequency: number) =>
    apiFetch('/investments', {
      method: 'POST',
      body: JSON.stringify({ asset, amount, years, compoundFrequency }),
    }),

  getInvestments: () => apiFetch('/investments'),
  getLedger: () => apiFetch('/investments/ledger'),
};
