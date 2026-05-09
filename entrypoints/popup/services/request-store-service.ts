import { browser } from 'wxt/browser';

export const REQUEST_STORE_KEYS = {
  REQUESTS: 'requestsStore',
  SETTINGS: 'requestStoreSettings',
};

export type CleanMode = 'count' | 'time' | 'rule' | 'disabled';

export interface RequestStoreSettings {
  maxRecords: number;
  autoClean: boolean;
  cleanMode: CleanMode;
  maxAge: number;
  cleanOnClose: boolean;
}

export const DEFAULT_REQUEST_STORE_SETTINGS: RequestStoreSettings = {
  maxRecords: 1000,
  autoClean: true,
  cleanMode: 'count',
  maxAge: 24 * 60 * 60 * 1000,
  cleanOnClose: false,
};

export interface StoredRequest {
  id: string;
  tabId: number;
  requestId: string;
  request: {
    url: string;
    method: string;
    headers?: Record<string, string>;
  };
  rawRequest: string;
  rawResponse?: string;
  status: 'paused' | 'finished';
  isRedirect: boolean;
  requestHeaders?: { name: string; value: string }[];
  responseHeaders?: { name: string; value: string }[];
  timestamp: number;
}

class RequestStoreService {
  private memoryCache: StoredRequest[] | null = null;

  async loadSettings(): Promise<RequestStoreSettings> {
    try {
      const result = await browser.storage.local.get(REQUEST_STORE_KEYS.SETTINGS);
      return { ...DEFAULT_REQUEST_STORE_SETTINGS, ...(result[REQUEST_STORE_KEYS.SETTINGS] || {}) };
    } catch (error) {
      console.error('[RequestStore] 加载设置失败:', error);
      return DEFAULT_REQUEST_STORE_SETTINGS;
    }
  }

  async saveSettings(settings: RequestStoreSettings): Promise<void> {
    try {
      await browser.storage.local.set({ [REQUEST_STORE_KEYS.SETTINGS]: settings });
    } catch (error) {
      console.error('[RequestStore] 保存设置失败:', error);
      throw error;
    }
  }

  async loadRequests(): Promise<StoredRequest[]> {
    if (this.memoryCache !== null) {
      return this.memoryCache;
    }
    try {
      const result = await browser.storage.local.get(REQUEST_STORE_KEYS.REQUESTS);
      const requests = result[REQUEST_STORE_KEYS.REQUESTS] || [];
      this.memoryCache = requests;
      return requests;
    } catch (error) {
      console.error('[RequestStore] 加载请求失败:', error);
      return [];
    }
  }

  async saveRequests(requests: StoredRequest[]): Promise<void> {
    this.memoryCache = requests;
    try {
      await browser.storage.local.set({ [REQUEST_STORE_KEYS.REQUESTS]: requests });
    } catch (error) {
      console.error('[RequestStore] 保存请求失败:', error);
      throw error;
    }
  }

  async addRequest(request: Omit<StoredRequest, 'timestamp'>): Promise<void> {
    const settings = await this.loadSettings();
    let requests = await this.loadRequests();

    const storedRequest: StoredRequest = {
      ...request,
      timestamp: Date.now(),
    };

    requests.push(storedRequest);

    if (settings.autoClean) {
      requests = this.applyCleanup(requests, settings);
    }

    const hardLimit = Math.max(settings.maxRecords, 2000);
    if (requests.length > hardLimit) {
      requests = requests.slice(requests.length - hardLimit);
    }

    await this.saveRequests(requests);
  }

  async updateRequest(id: string, updates: Partial<StoredRequest>): Promise<void> {
    let requests = await this.loadRequests();
    const index = requests.findIndex(r => r.id === id);
    if (index !== -1) {
      requests[index] = { ...requests[index], ...updates };
      await this.saveRequests(requests);
    }
  }

  async deleteRequest(id: string): Promise<void> {
    let requests = await this.loadRequests();
    requests = requests.filter(r => r.id !== id);
    await this.saveRequests(requests);
  }

  async clearRequests(): Promise<void> {
    this.memoryCache = [];
    await browser.storage.local.set({ [REQUEST_STORE_KEYS.REQUESTS]: [] });
  }

  async getRequestById(id: string): Promise<StoredRequest | undefined> {
    const requests = await this.loadRequests();
    return requests.find(r => r.id === id);
  }

  private applyCleanup(requests: StoredRequest[], settings: RequestStoreSettings): StoredRequest[] {
    switch (settings.cleanMode) {
      case 'count':
        if (requests.length > settings.maxRecords) {
          return requests.slice(requests.length - settings.maxRecords);
        }
        return requests;

      case 'time': {
        const cutoff = Date.now() - settings.maxAge;
        return requests.filter(r => r.timestamp > cutoff);
      }

      case 'rule':
        return requests;

      case 'disabled':
      default:
        return requests;
    }
  }

  async runCleanup(): Promise<number> {
    const settings = await this.loadSettings();
    if (!settings.autoClean || settings.cleanMode === 'disabled') {
      return 0;
    }
    const requests = await this.loadRequests();
    const beforeCount = requests.length;
    const cleaned = this.applyCleanup(requests, settings);
    await this.saveRequests(cleaned);
    return beforeCount - cleaned.length;
  }

  async exportRequests(): Promise<string> {
    const requests = await this.loadRequests();
    return JSON.stringify(requests, null, 2);
  }

  async importRequests(json: string): Promise<boolean> {
    try {
      const requests = JSON.parse(json);
      if (!Array.isArray(requests)) return false;
      await this.saveRequests(requests);
      return true;
    } catch {
      return false;
    }
  }
}

export const requestStoreService = new RequestStoreService();
