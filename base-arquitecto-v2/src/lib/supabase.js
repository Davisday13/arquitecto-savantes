import { createClient } from '@supabase/supabase-js';
import { MOCK } from './mockData';

const _supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDemo = !_supabaseUrl || _supabaseUrl.includes('placeholder') || _supabaseUrl.includes('tu-proyecto');

export const supabaseUrl = _supabaseUrl || '';

// ============================================================
// Mock Supabase Client for Demo Mode
// ============================================================
class MockBuilder {
  constructor(table) {
    this._table = table;
    this._filters = [];
    this._orderField = null;
    this._orderAsc = true;
    this._limitNum = null;
    this._singleMode = false;
    this._countMode = false;
    this._headMode = false;
  }

  _data() {
    let items = [...(MOCK[this._table] || [])];
    for (const f of this._filters) {
      if (f.op === 'eq') items = items.filter(x => x[f.field] === f.value);
      if (f.op === 'in') items = items.filter(x => f.value.includes(x[f.field]));
      if (f.op === 'neq') items = items.filter(x => x[f.field] !== f.value);
      if (f.op === 'lte') items = items.filter(x => Number(x[f.field]) <= Number(f.value));
      if (f.op === 'lt') items = items.filter(x => Number(x[f.field]) < Number(f.value));
      if (f.op === 'gte') items = items.filter(x => Number(x[f.field]) >= Number(f.value));
      if (f.op === 'gt') items = items.filter(x => Number(x[f.field]) > Number(f.value));
    }
    if (this._orderField) {
      items.sort((a, b) => {
        const av = a[this._orderField], bv = b[this._orderField];
        if (av == null) return 1; if (bv == null) return -1;
        return this._orderAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
      });
    }
    if (this._limitNum) items = items.slice(0, this._limitNum);
    return items;
  }

  select(columns) {
    this._selectCols = columns;
    return this;
  }

  eq(field, value) { this._filters.push({ op: 'eq', field, value }); return this; }
  neq(field, value) { this._filters.push({ op: 'neq', field, value }); return this; }
  in(field, values) { this._filters.push({ op: 'in', field, value: values }); return this; }
  lte(field, value) { this._filters.push({ op: 'lte', field, value }); return this; }
  lt(field, value) { this._filters.push({ op: 'lt', field, value }); return this; }
  gte(field, value) { this._filters.push({ op: 'gte', field, value }); return this; }
  gt(field, value) { this._filters.push({ op: 'gt', field, value }); return this; }
  order(field, { ascending = true } = {}) { this._orderField = field; this._orderAsc = ascending; return this; }
  limit(n) { this._limitNum = n; return this; }
  single() { this._singleMode = true; return this; }

  then(resolve, reject) {
    let items = this._data();
    if (this._singleMode) items = items[0] || null;
    if (this._countMode) return resolve({ data: items, count: Array.isArray(items) ? items.length : (items ? 1 : 0), error: null });
    return resolve({ data: items, error: null });
  }

  catch(fn) { return this; }
}

// Special mock for `select('*', { count, head })` pattern
class MockCountBuilder extends MockBuilder {
  constructor(table) {
    super(table);
    this._countMode = true;
  }
}

// Wrapper to handle nested .select('...') in from()
function wrapSelect(table, builder) {
  return new Proxy(builder, {
    get(target, prop) {
      if (prop === 'select') {
        return (columns, opts) => {
          if (opts?.count || opts?.head) return new MockCountBuilder(table);
          return builder.select(columns);
        };
      }
      if (prop === 'then') return (resolve) => resolve({ data: MOCK[table] || [], error: null });
      return target[prop];
    }
  });
}

// Mock realtime
const mockRealtime = {
  channel: () => ({
    on: () => mockRealtime,
    subscribe: () => mockRealtime,
  }),
};

const _authCallbacks = [];

function _emitAuth(session) {
  const event = session ? 'SIGNED_IN' : 'SIGNED_OUT';
  _authCallbacks.forEach(cb => cb(event, session));
}

const mockAuth = {
  getSession: () => {
    const demoUser = JSON.parse(localStorage.getItem('arq:demo') || 'null');
    if (demoUser) {
      return Promise.resolve({
        data: {
          session: {
            user: { id: 'demo-user', email: 'demo@arquitecto.com' },
            access_token: 'demo-token',
          },
        },
        error: null,
      });
    }
    return Promise.resolve({ data: { session: null }, error: null });
  },
  onAuthStateChange: (callback) => {
    _authCallbacks.push(callback);
    return { data: { subscription: { unsubscribe: () => { const i = _authCallbacks.indexOf(callback); if (i >= 0) _authCallbacks.splice(i, 1); } } } };
  },
  signInWithPassword: async ({ email }) => {
    if (email === 'demo@arquitecto.com') {
      const session = { user: { id: 'demo-user', email }, access_token: 'demo-token' };
      localStorage.setItem('arq:demo', JSON.stringify(session));
      setTimeout(() => _emitAuth(session), 0);
      return { data: { user: session.user, session }, error: null };
    }
    return { data: null, error: { message: 'Credenciales inválidas' } };
  },
  signOut: async () => {
    localStorage.removeItem('arq:demo');
    setTimeout(() => _emitAuth(null), 0);
    return { error: null };
  },
  updateUser: async () => ({ data: null, error: null }),
  admin: {
    createUser: async () => ({ data: { user: { id: 'demo-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) } }, error: null }),
    deleteUser: async () => ({ error: null }),
  },
};

const mockClient = {
  from: (table) => wrapSelect(table, new MockBuilder(table)),
  auth: mockAuth,
  channel: mockRealtime.channel,
  storage: {
    from: () => ({
      upload: async () => ({ data: {}, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
};

function createRealClient() {
  return createClient(
    _supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  );
}

export const supabase = isDemo ? mockClient : createRealClient();
