export interface CustomerRecord {
  id: string;
  name: string;
  phone?: string;
  gender?: string;
  client_photo?: string;
  shop_id?: string;
}

export interface OfflineSession {
  id?: number;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  gender: string;
  garments: string[];
  deadline: string;
  reminderDate: string;
  totalCost: number;
  amountPaid: number;
  photos: string[];
  clientPhoto?: string;
  measurements: Record<string, any>;
  data?: Record<string, any>; // Dual payload compatibility
  userId?: string;
  clientOperationId?: string;
  timestamp: number;
}

const DB_NAME = 'TailorVoiceDB';
const STORE_NAME = 'offline_queue';
const CUSTOMERS_STORE = 'customers_cache';
const DB_VERSION = 2;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(CUSTOMERS_STORE)) {
        const customerStore = db.createObjectStore(CUSTOMERS_STORE, { keyPath: 'id' });
        customerStore.createIndex('name', 'name', { unique: false });
        customerStore.createIndex('phone', 'phone', { unique: false });
      }
    };
  });
};

export const saveOfflineMeasurement = async (session: Omit<OfflineSession, 'id' | 'timestamp'> & { measurements?: Record<string, any>; data?: Record<string, any> }): Promise<number> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const measMap = session.measurements || session.data || {};
    const record: OfflineSession = {
      ...session,
      measurements: measMap,
      data: measMap,
      clientOperationId: session.clientOperationId || `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now()
    };

    const request = store.add(record);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const getOfflineQueue = async (): Promise<OfflineSession[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteQueueItem = async (id: number): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const clearQueue = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const cacheCustomers = async (customers: CustomerRecord[]): Promise<void> => {
  if (!customers || customers.length === 0) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOMERS_STORE, 'readwrite');
    const store = transaction.objectStore(CUSTOMERS_STORE);
    customers.forEach(customer => {
      if (customer.id) {
        store.put(customer);
      }
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const searchCachedCustomers = async (query: string, limit = 10): Promise<CustomerRecord[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CUSTOMERS_STORE, 'readonly');
    const store = transaction.objectStore(CUSTOMERS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const all: CustomerRecord[] = request.result || [];
      if (!query.trim()) {
        resolve(all.slice(0, limit));
        return;
      }
      const q = query.toLowerCase();
      const filtered = all.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
      resolve(filtered.slice(0, limit));
    };
    request.onerror = () => reject(request.error);
  });
};
