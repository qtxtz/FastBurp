import { browser } from 'wxt/browser';

// 存储键
export const FILTER_STORAGE_KEYS = {
  FILTER_RULES: 'filterRules',
  FILTER_SETTINGS: 'filterSettings'
};

// 过滤动作类型
export enum FilterAction {
  INTERCEPT = 'intercept',
  PASS = 'pass',
  PROXY = 'proxy',
  DROP = 'drop'
}

// 过滤范围类型
export enum FilterScope {
  ALL = 'all',
  TAB = 'tab',
  DOMAIN = 'domain',
  IP = 'ip',
  URL = 'url'
}

// 过滤规则接口
export interface FilterRule {
  id: string;
  name: string;
  enabled: boolean;
  scope: FilterScope;
  tabIds: number[];
  urlPattern: string;
  ipPattern: string;
  methods: string[];
  action: FilterAction;
  description: string;
  createdAt: number;
  updatedAt: number;
}

// 过滤设置接口
export interface FilterSettings {
  enableFilter: boolean;
  defaultAction: FilterAction;
  matchMode: 'first' | 'all';
}

// 默认过滤设置
export const DEFAULT_FILTER_SETTINGS: FilterSettings = {
  enableFilter: false,
  defaultAction: FilterAction.INTERCEPT,
  matchMode: 'first'
};

// 预设过滤规则示例
export const PRESET_FILTER_RULES: Partial<FilterRule>[] = [
  {
    name: "放行静态资源",
    scope: FilterScope.URL,
    tabIds: [],
    urlPattern: "\\.(css|js|jpg|jpeg|png|gif|svg|ico|woff|woff2|ttf|eot)$",
    ipPattern: "",
    methods: ['ALL'],
    action: FilterAction.PASS,
    description: "自动放行CSS、JS、图片等静态资源",
    enabled: false
  },
  {
    name: "拦截API请求",
    scope: FilterScope.URL,
    tabIds: [],
    urlPattern: "/api/",
    ipPattern: "",
    methods: ['ALL'],
    action: FilterAction.INTERCEPT,
    description: "拦截所有包含 /api/ 的请求",
    enabled: false
  },
  {
    name: "放行GET请求",
    scope: FilterScope.URL,
    tabIds: [],
    urlPattern: ".*",
    ipPattern: "",
    methods: ['GET'],
    action: FilterAction.PASS,
    description: "【警告】此规则会放行所有GET请求，可能导致拦截功能失效！建议仅在需要过滤特定请求时启用。",
    enabled: false
  },
  {
    name: "拦截POST请求",
    scope: FilterScope.URL,
    tabIds: [],
    urlPattern: ".*",
    ipPattern: "",
    methods: ['POST'],
    action: FilterAction.INTERCEPT,
    description: "拦截所有POST请求",
    enabled: false
  }
];

// 过滤结果接口
export interface FilterResult {
  shouldIntercept: boolean;
  shouldProxy: boolean;
  shouldDrop: boolean;
  shouldPass: boolean;
  matchedRule?: FilterRule;
  reason: string;
}

// 过滤服务类
export class FilterService {
  // 加载过滤规则
  async loadRules(): Promise<FilterRule[]> {
    try {
      const result = await browser.storage.local.get(FILTER_STORAGE_KEYS.FILTER_RULES);
      const rules = result[FILTER_STORAGE_KEYS.FILTER_RULES];

      if (!rules || !Array.isArray(rules)) {
        return [];
      }

      return rules;
    } catch (error) {
      console.error('加载过滤规则失败:', error);
      return [];
    }
  }

  // 初始化预设规则
  async initializePresetRules(): Promise<FilterRule[]> {
    const now = Date.now();
    const rules: FilterRule[] = PRESET_FILTER_RULES.map((rule, index) => ({
      id: `preset-${index}`,
      name: rule.name || `规则${index + 1}`,
      scope: rule.scope || FilterScope.URL,
      tabIds: rule.tabIds || [],
      urlPattern: rule.urlPattern || '.*',
      ipPattern: rule.ipPattern || '',
      methods: rule.methods || ['ALL'],
      action: rule.action || FilterAction.INTERCEPT,
      description: rule.description || '',
      enabled: rule.enabled !== undefined ? rule.enabled : false,
      createdAt: now,
      updatedAt: now
    }));

    await browser.storage.local.set({ [FILTER_STORAGE_KEYS.FILTER_RULES]: rules });
    return rules;
  }

  // 保存过滤规则
  async saveRule(rule: FilterRule): Promise<void> {
    try {
      const rules = await this.loadRules();
      const now = Date.now();
      const index = rules.findIndex(r => r.id === rule.id);

      if (index >= 0) {
        rules[index] = {
          ...rule,
          updatedAt: now
        };
      } else {
        rules.push({
          ...rule,
          id: rule.id || `rule-${now}-${Math.random().toString(36).substring(2, 9)}`,
          createdAt: now,
          updatedAt: now
        });
      }

      await browser.storage.local.set({ [FILTER_STORAGE_KEYS.FILTER_RULES]: rules });
    } catch (error) {
      console.error('保存过滤规则失败:', error);
      throw error;
    }
  }

  // 删除过滤规则
  async deleteRule(ruleId: string): Promise<void> {
    try {
      const rules = await this.loadRules();
      const newRules = rules.filter(rule => rule.id !== ruleId);
      await browser.storage.local.set({ [FILTER_STORAGE_KEYS.FILTER_RULES]: newRules });
    } catch (error) {
      console.error('删除过滤规则失败:', error);
      throw error;
    }
  }

  // 批量更新规则启用状态
  async toggleRule(ruleId: string, enabled: boolean): Promise<void> {
    try {
      const rules = await this.loadRules();
      const index = rules.findIndex(r => r.id === ruleId);

      if (index >= 0) {
        rules[index].enabled = enabled;
        rules[index].updatedAt = Date.now();
        await browser.storage.local.set({ [FILTER_STORAGE_KEYS.FILTER_RULES]: rules });
      }
    } catch (error) {
      console.error('切换规则状态失败:', error);
      throw error;
    }
  }

  // 加载过滤设置
  async loadSettings(): Promise<FilterSettings> {
    try {
      const result = await browser.storage.local.get(FILTER_STORAGE_KEYS.FILTER_SETTINGS);
      return result[FILTER_STORAGE_KEYS.FILTER_SETTINGS] || DEFAULT_FILTER_SETTINGS;
    } catch (error) {
      console.error('加载过滤设置失败:', error);
      return DEFAULT_FILTER_SETTINGS;
    }
  }

  // 保存过滤设置
  async saveSettings(settings: FilterSettings): Promise<void> {
    try {
      await browser.storage.local.set({ [FILTER_STORAGE_KEYS.FILTER_SETTINGS]: settings });
    } catch (error) {
      console.error('保存过滤设置失败:', error);
      throw error;
    }
  }

  // 匹配URL模式（支持正则表达式和通配符）
  private matchPattern(url: string, pattern: string): boolean {
    if (!pattern || pattern.trim() === '') return true;
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(url);
    } catch (e) {
      return url.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  // 匹配域名
  private matchDomain(url: string, pattern: string): boolean {
    if (!pattern || pattern.trim() === '') return true;
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const regex = new RegExp(pattern, 'i');
      return regex.test(hostname);
    } catch {
      return false;
    }
  }

  // 匹配IP（支持CIDR）
  private matchIP(ip: string, pattern: string): boolean {
    if (!pattern || pattern.trim() === '') return true;
    if (!ip) return false;

    // 精确匹配
    if (ip === pattern) return true;

    // CIDR匹配
    if (pattern.includes('/')) {
      try {
        const [subnet, prefixStr] = pattern.split('/');
        const prefix = parseInt(prefixStr, 10);
        if (isNaN(prefix)) return false;

        const ipNum = this.ipToNumber(ip);
        const subnetNum = this.ipToNumber(subnet);
        if (ipNum === null || subnetNum === null) return false;

        const mask = 0xFFFFFFFF << (32 - prefix);
        return (ipNum & mask) === (subnetNum & mask);
      } catch {
        return false;
      }
    }

    // 正则匹配
    try {
      const regex = new RegExp(pattern, 'i');
      return regex.test(ip);
    } catch {
      return ip.includes(pattern);
    }
  }

  // IP转数字
  private ipToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    const nums = parts.map(p => parseInt(p, 10));
    if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return null;
    return (nums[0] << 24) + (nums[1] << 16) + (nums[2] << 8) + nums[3];
  }

  // 检查请求是否应该被拦截
  async shouldIntercept(
    url: string,
    method: string,
    tabId?: number,
    ip?: string
  ): Promise<FilterResult> {
    try {
      const settings = await this.loadSettings();
      const rules = await this.loadRules();
      const enabledRules = rules.filter(r => r.enabled);
      
      console.log(`[FilterService] ========== 开始检查拦截规则 ==========`);
      console.log(`[FilterService] URL: ${url}`);
      console.log(`[FilterService] Method: ${method}`);
      console.log(`[FilterService] TabId: ${tabId}`);
      console.log(`[FilterService] 过滤设置: defaultAction=${settings.defaultAction}, matchMode=${settings.matchMode}`);
      console.log(`[FilterService] 总规则数: ${rules.length}, 启用规则数: ${enabledRules.length}`);

      if (rules.length > 0) {
        console.log(`[FilterService] 所有规则:`);
        rules.forEach((rule, index) => {
          console.log(`  规则${index + 1}: ${rule.name}, enabled=${rule.enabled}, scope=${rule.scope}, methods=[${rule.methods.join(', ')}], action=${rule.action}, urlPattern=${rule.urlPattern}`);
        });
      }

      if (enabledRules.length === 0) {
        console.log(`[FilterService] 没有启用的规则，使用默认动作: ${settings.defaultAction}`);
        return {
          shouldIntercept: settings.defaultAction === FilterAction.INTERCEPT,
          shouldProxy: settings.defaultAction === FilterAction.PROXY,
          shouldDrop: settings.defaultAction === FilterAction.DROP,
          shouldPass: settings.defaultAction === FilterAction.PASS,
          reason: '没有启用的规则，使用默认动作'
        };
      }

      for (const rule of enabledRules) {
        let scopeMatch = true;

        switch (rule.scope) {
          case FilterScope.TAB:
            if (tabId === undefined || !rule.tabIds.includes(tabId)) {
              scopeMatch = false;
            }
            break;
          case FilterScope.DOMAIN:
            if (!this.matchDomain(url, rule.urlPattern)) {
              scopeMatch = false;
            }
            break;
          case FilterScope.IP:
            if (!this.matchIP(ip || '', rule.ipPattern)) {
              scopeMatch = false;
            }
            break;
          case FilterScope.URL:
            if (!this.matchPattern(url, rule.urlPattern)) {
              scopeMatch = false;
            }
            break;
          case FilterScope.ALL:
          default:
            break;
        }

        if (!scopeMatch) {
          continue;
        }

        const methodMatch = rule.methods.includes('ALL') ||
                           rule.methods.includes(method.toUpperCase());

        if (!methodMatch) {
          continue;
        }

        return {
          shouldIntercept: rule.action === FilterAction.INTERCEPT,
          shouldProxy: rule.action === FilterAction.PROXY,
          shouldDrop: rule.action === FilterAction.DROP,
          shouldPass: rule.action === FilterAction.PASS,
          matchedRule: rule,
          reason: `匹配规则: ${rule.name}`
        };
      }

      return {
        shouldIntercept: settings.defaultAction === FilterAction.INTERCEPT,
        shouldProxy: settings.defaultAction === FilterAction.PROXY,
        shouldDrop: settings.defaultAction === FilterAction.DROP,
        shouldPass: settings.defaultAction === FilterAction.PASS,
        reason: '没有规则匹配，使用默认动作'
      };
    } catch (error) {
      console.error('检查拦截规则失败:', error);
      return {
        shouldIntercept: true,
        shouldProxy: false,
        shouldDrop: false,
        shouldPass: false,
        reason: '检查规则时出错，默认拦截'
      };
    }
  }

  // 导出规则
  async exportRules(): Promise<string> {
    try {
      const rules = await this.loadRules();
      return JSON.stringify(rules, null, 2);
    } catch (error) {
      console.error('导出规则失败:', error);
      throw error;
    }
  }

  // 导入规则
  async importRules(rulesJson: string): Promise<boolean> {
    try {
      const rules = JSON.parse(rulesJson);

      if (!Array.isArray(rules)) {
        throw new Error('无效的规则格式，应为数组');
      }

      const validRules = rules.filter(rule =>
        rule &&
        typeof rule === 'object' &&
        typeof rule.name === 'string' &&
        typeof rule.urlPattern === 'string'
      );

      if (validRules.length === 0) {
        throw new Error('没有有效的规则');
      }

      const now = Date.now();
      const normalizedRules: FilterRule[] = validRules.map((rule, index) => ({
        id: rule.id || `imported-${now}-${index}`,
        name: rule.name,
        scope: rule.scope || FilterScope.URL,
        tabIds: rule.tabIds || [],
        urlPattern: rule.urlPattern || '.*',
        ipPattern: rule.ipPattern || '',
        methods: rule.methods || ['ALL'],
        action: rule.action || FilterAction.INTERCEPT,
        description: rule.description || '',
        enabled: rule.enabled !== undefined ? rule.enabled : true,
        createdAt: rule.createdAt || now,
        updatedAt: now
      }));

      await browser.storage.local.set({ [FILTER_STORAGE_KEYS.FILTER_RULES]: normalizedRules });
      return true;
    } catch (error) {
      console.error('导入规则失败:', error);
      return false;
    }
  }

  // 测试规则匹配
  testRule(url: string, method: string, rule: FilterRule, tabId?: number, ip?: string): boolean {
    let scopeMatch = true;

    switch (rule.scope) {
      case FilterScope.TAB:
        if (tabId === undefined || !rule.tabIds.includes(tabId)) {
          scopeMatch = false;
        }
        break;
      case FilterScope.DOMAIN:
        if (!this.matchDomain(url, rule.urlPattern)) {
          scopeMatch = false;
        }
        break;
      case FilterScope.IP:
        if (!this.matchIP(ip || '', rule.ipPattern)) {
          scopeMatch = false;
        }
        break;
      case FilterScope.URL:
        if (!this.matchPattern(url, rule.urlPattern)) {
          scopeMatch = false;
        }
        break;
      case FilterScope.ALL:
      default:
        break;
    }

    if (!scopeMatch) return false;

    const methodMatch = rule.methods.includes('ALL') ||
                       rule.methods.includes(method.toUpperCase());

    return methodMatch;
  }
}

export const filterService = new FilterService();
