import { useState, useEffect } from 'react';
import {
  FiPlus, FiTrash2, FiEdit2, FiSave, FiX, FiDownload, FiUpload,
  FiToggleLeft, FiToggleRight, FiFilter, FiCheckCircle, FiAlertCircle,
  FiSettings, FiList, FiGlobe, FiTarget, FiServer, FiClock
} from 'react-icons/fi';
import { filterService, FilterRule, FilterAction, FilterSettings, FilterScope, DEFAULT_FILTER_SETTINGS } from '../services/filter-service';
import { requestStoreService, RequestStoreSettings, DEFAULT_REQUEST_STORE_SETTINGS } from '../services/request-store-service';
import '../styles/FilterManager.css';

interface FilterManagerProps {
  darkMode: boolean;
}

const HTTP_METHODS = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const SCOPE_OPTIONS = [
  { value: FilterScope.ALL, label: '全部', icon: FiGlobe },
  { value: FilterScope.TAB, label: '指定Tab', icon: FiTarget },
  { value: FilterScope.DOMAIN, label: '域名', icon: FiGlobe },
  { value: FilterScope.IP, label: 'IP/网段', icon: FiServer },
  { value: FilterScope.URL, label: 'URL模式', icon: FiFilter },
];

const ACTION_OPTIONS = [
  { value: FilterAction.INTERCEPT, label: '拦截', icon: FiAlertCircle, color: 'intercept' },
  { value: FilterAction.PASS, label: '放行', icon: FiCheckCircle, color: 'pass' },
  { value: FilterAction.PROXY, label: '代理', icon: FiServer, color: 'proxy' },
  { value: FilterAction.DROP, label: '丢弃', icon: FiTrash2, color: 'drop' },
];

const CLEAN_MODE_OPTIONS = [
  { value: 'disabled', label: '禁用' },
  { value: 'count', label: '按数量' },
  { value: 'time', label: '按时间' },
  { value: 'rule', label: '按规则' },
];

function FilterManager({ darkMode }: FilterManagerProps) {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>(DEFAULT_FILTER_SETTINGS);
  const [storeSettings, setStoreSettings] = useState<RequestStoreSettings>(DEFAULT_REQUEST_STORE_SETTINGS);
  const [editingRule, setEditingRule] = useState<FilterRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'filterSettings' | 'storeSettings'>('rules');

  const [testUrl, setTestUrl] = useState('');
  const [testMethod, setTestMethod] = useState('GET');
  const [testTabId, setTestTabId] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    rule?: FilterRule;
    action?: string;
  } | null>(null);

  useEffect(() => {
    loadRules();
    loadSettings();
    loadStoreSettings();
  }, []);

  const loadRules = async () => {
    try {
      const loadedRules = await filterService.loadRules();
      setRules(loadedRules);
    } catch (error) {
      console.error('加载规则失败:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const loadedSettings = await filterService.loadSettings();
      setFilterSettings(loadedSettings);
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const loadStoreSettings = async () => {
    try {
      const loadedSettings = await requestStoreService.loadSettings();
      setStoreSettings(loadedSettings);
    } catch (error) {
      console.error('加载存储设置失败:', error);
    }
  };

  const handleCreateRule = () => {
    const newRule: FilterRule = {
      id: `rule-${Date.now()}`,
      name: '新规则',
      enabled: true,
      scope: FilterScope.URL,
      tabIds: [],
      urlPattern: '.*',
      ipPattern: '',
      methods: ['ALL'],
      action: FilterAction.INTERCEPT,
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setEditingRule(newRule);
    setIsCreating(true);
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    try {
      await filterService.saveRule(editingRule);
      await loadRules();
      setEditingRule(null);
      setIsCreating(false);
    } catch (error) {
      console.error('保存规则失败:', error);
      alert('保存规则失败');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('确定要删除这条规则吗？')) return;

    try {
      await filterService.deleteRule(ruleId);
      await loadRules();
    } catch (error) {
      console.error('删除规则失败:', error);
      alert('删除规则失败');
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await filterService.toggleRule(ruleId, enabled);
      await loadRules();
    } catch (error) {
      console.error('切换规则状态失败:', error);
    }
  };

  const handleEditRule = (rule: FilterRule) => {
    setEditingRule({ ...rule });
    setIsCreating(false);
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setIsCreating(false);
  };

  const handleSaveFilterSettings = async () => {
    try {
      await filterService.saveSettings(filterSettings);
      alert('过滤设置已保存');
    } catch (error) {
      console.error('保存过滤设置失败:', error);
      alert('保存过滤设置失败');
    }
  };

  const handleSaveStoreSettings = async () => {
    try {
      await requestStoreService.saveSettings(storeSettings);
      alert('存储设置已保存');
    } catch (error) {
      console.error('保存存储设置失败:', error);
      alert('保存存储设置失败');
    }
  };

  const handleExportRules = async () => {
    try {
      const json = await filterService.exportRules();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filter-rules-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出规则失败:', error);
      alert('导出规则失败');
    }
  };

  const handleImportRules = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = await filterService.importRules(text);
        if (success) {
          await loadRules();
          alert('导入成功');
        } else {
          alert('导入失败：无效的规则格式');
        }
      } catch (error) {
        console.error('导入规则失败:', error);
        alert('导入规则失败');
      }
    };
    input.click();
  };

  const handleInitPresetRules = async () => {
    if (!confirm('这将覆盖现有规则，确定要初始化预设规则吗？')) return;

    try {
      await filterService.initializePresetRules();
      await loadRules();
      alert('预设规则已初始化');
    } catch (error) {
      console.error('初始化预设规则失败:', error);
      alert('初始化预设规则失败');
    }
  };

  const handleTestRule = () => {
    if (!testUrl) {
      alert('请输入测试URL');
      return;
    }

    const tabId = testTabId ? parseInt(testTabId, 10) : undefined;
    let matchedRule: FilterRule | undefined;

    for (const rule of rules.filter(r => r.enabled)) {
      if (filterService.testRule(testUrl, testMethod, rule, tabId)) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      setTestResult({
        matched: true,
        rule: matchedRule,
        action: matchedRule.action === FilterAction.INTERCEPT ? '拦截' :
               matchedRule.action === FilterAction.PASS ? '放行' :
               matchedRule.action === FilterAction.PROXY ? '代理' : '丢弃'
      });
    } else {
      setTestResult({
        matched: false,
        action: filterSettings.defaultAction === FilterAction.INTERCEPT ? '拦截（默认）' : '放行（默认）'
      });
    }
  };

  const toggleMethod = (method: string) => {
    if (!editingRule) return;

    const methods = [...editingRule.methods];
    if (method === 'ALL') {
      setEditingRule({ ...editingRule, methods: ['ALL'] });
    } else {
      const filteredMethods = methods.filter(m => m !== 'ALL');

      if (filteredMethods.includes(method)) {
        const newMethods = filteredMethods.filter(m => m !== method);
        setEditingRule({
          ...editingRule,
          methods: newMethods.length > 0 ? newMethods : ['ALL']
        });
      } else {
        setEditingRule({ ...editingRule, methods: [...filteredMethods, method] });
      }
    }
  };

  const handleTabIdsChange = (value: string) => {
    if (!editingRule) return;

    const ids = value.split(',').map(s => s.trim()).filter(s => s).map(s => parseInt(s, 10)).filter(n => !isNaN(n));
    setEditingRule({ ...editingRule, tabIds: ids });
  };

  const getScopeLabel = (scope: FilterScope) => {
    const option = SCOPE_OPTIONS.find(o => o.value === scope);
    return option?.label || scope;
  };

  const getActionLabel = (action: FilterAction) => {
    const option = ACTION_OPTIONS.find(o => o.value === action);
    return option?.label || action;
  };

  return (
    <div className="filter-manager">
      <div className="filter-manager-header">
        <h2>
          <FiFilter size={20} />
          拦截过滤器
        </h2>
      </div>

      <div className="filter-tabs">
        <button
          className={activeTab === 'rules' ? 'active' : ''}
          onClick={() => setActiveTab('rules')}
        >
          <FiList size={16} />
          规则列表
        </button>
        <button
          className={activeTab === 'filterSettings' ? 'active' : ''}
          onClick={() => setActiveTab('filterSettings')}
        >
          <FiSettings size={16} />
          过滤设置
        </button>
        <button
          className={activeTab === 'storeSettings' ? 'active' : ''}
          onClick={() => setActiveTab('storeSettings')}
        >
          <FiClock size={16} />
          存储清理
        </button>
      </div>

      {activeTab === 'rules' ? (
        <div className="filter-content">
          <div className="filter-toolbar">
            <button className="btn-primary" onClick={handleCreateRule}>
              <FiPlus size={16} />
              <span>新建规则</span>
            </button>
            <button className="btn-secondary" onClick={handleInitPresetRules}>
              <FiList size={16} />
              <span>加载预设</span>
            </button>
            <button className="btn-secondary" onClick={handleExportRules}>
              <FiDownload size={16} />
              <span>导出</span>
            </button>
            <button className="btn-secondary" onClick={handleImportRules}>
              <FiUpload size={16} />
              <span>导入</span>
            </button>
          </div>

          {editingRule && (
            <div className="rule-editor">
              <div className="editor-header">
                <h3>{isCreating ? '创建新规则' : '编辑规则'}</h3>
                <div className="editor-actions">
                  <button className="btn-success" onClick={handleSaveRule}>
                    <FiSave size={16} />
                    <span>保存</span>
                  </button>
                  <button className="btn-cancel" onClick={handleCancelEdit}>
                    <FiX size={16} />
                    <span>取消</span>
                  </button>
                </div>
              </div>

              <div className="editor-body">
                <div className="form-group">
                  <label>规则名称</label>
                  <input
                    type="text"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="输入规则名称"
                  />
                </div>

                <div className="form-group">
                  <label>匹配范围</label>
                  <div className="scope-selector">
                    {SCOPE_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          className={editingRule.scope === option.value ? 'active' : ''}
                          onClick={() => setEditingRule({ ...editingRule, scope: option.value })}
                        >
                          <Icon size={14} />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editingRule.scope === FilterScope.TAB && (
                  <div className="form-group">
                    <label>Tab ID 列表（逗号分隔）</label>
                    <input
                      type="text"
                      value={editingRule.tabIds.join(',')}
                      onChange={(e) => handleTabIdsChange(e.target.value)}
                      placeholder="例如: 123, 456, 789"
                    />
                    <small>注意：Tab ID 在浏览器重启后会变化</small>
                  </div>
                )}

                {editingRule.scope === FilterScope.DOMAIN && (
                  <div className="form-group">
                    <label>域名模式（支持正则）</label>
                    <input
                      type="text"
                      value={editingRule.urlPattern}
                      onChange={(e) => setEditingRule({ ...editingRule, urlPattern: e.target.value })}
                      placeholder="例如: example.com 或 .*\\.example\\.com"
                    />
                  </div>
                )}

                {editingRule.scope === FilterScope.IP && (
                  <div className="form-group">
                    <label>IP 模式（支持CIDR）</label>
                    <input
                      type="text"
                      value={editingRule.ipPattern}
                      onChange={(e) => setEditingRule({ ...editingRule, ipPattern: e.target.value })}
                      placeholder="例如: 192.168.1.0/24 或 10.0.0.1"
                    />
                  </div>
                )}

                {editingRule.scope === FilterScope.URL && (
                  <div className="form-group">
                    <label>URL 模式（支持正则表达式）</label>
                    <input
                      type="text"
                      value={editingRule.urlPattern}
                      onChange={(e) => setEditingRule({ ...editingRule, urlPattern: e.target.value })}
                      placeholder="例如: /api/.*  或  .*\\.jpg$"
                    />
                    <small>提示：使用正则表达式匹配URL</small>
                  </div>
                )}

                <div className="form-group">
                  <label>请求方法</label>
                  <div className="method-selector">
                    {HTTP_METHODS.map(method => (
                      <button
                        key={method}
                        className={editingRule.methods.includes(method) ? 'active' : ''}
                        onClick={() => toggleMethod(method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>执行动作</label>
                  <div className="action-selector">
                    {ACTION_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          className={editingRule.action === option.value ? `active ${option.color}` : option.color}
                          onClick={() => setEditingRule({ ...editingRule, action: option.value })}
                        >
                          <Icon size={16} />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group">
                  <label>描述</label>
                  <textarea
                    value={editingRule.description}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                    placeholder="输入规则描述（可选）"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="rules-list">
            {rules.length === 0 ? (
              <div className="empty-state">
                <FiFilter size={48} />
                <p>暂无过滤规则</p>
                <p>点击"新建规则"或"加载预设"开始使用</p>
              </div>
            ) : (
              rules.map((rule, index) => (
                <div key={rule.id} className={`rule-item ${rule.enabled ? 'enabled' : 'disabled'}`}>
                  <div className="rule-header">
                    <div className="rule-info">
                      <span className="rule-index">#{index + 1}</span>
                      <h4>{rule.name}</h4>
                      <span className={`rule-action ${rule.action}`}>
                        {getActionLabel(rule.action)}
                      </span>
                      <span className="rule-scope">
                        {getScopeLabel(rule.scope)}
                      </span>
                    </div>
                    <div className="rule-actions">
                      <button
                        className="btn-toggle"
                        onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                        title={rule.enabled ? '禁用' : '启用'}
                      >
                        {rule.enabled ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                      </button>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditRule(rule)}
                        title="编辑"
                      >
                        <FiEdit2 size={16} />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteRule(rule.id)}
                        title="删除"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="rule-details">
                    <div className="rule-detail-item">
                      <strong>匹配范围:</strong>
                      <span>{getScopeLabel(rule.scope)}</span>
                    </div>
                    <div className="rule-detail-item">
                      <strong>URL模式:</strong>
                      <code>{rule.urlPattern || '-'}</code>
                    </div>
                    {rule.scope === FilterScope.TAB && (
                      <div className="rule-detail-item">
                        <strong>Tab ID:</strong>
                        <span>{rule.tabIds.join(', ') || '-'}</span>
                      </div>
                    )}
                    {rule.scope === FilterScope.IP && (
                      <div className="rule-detail-item">
                        <strong>IP模式:</strong>
                        <code>{rule.ipPattern || '-'}</code>
                      </div>
                    )}
                    <div className="rule-detail-item">
                      <strong>方法:</strong>
                      <span className="methods">
                        {rule.methods.map(m => (
                          <span key={m} className="method-tag">{m}</span>
                        ))}
                      </span>
                    </div>
                    {rule.description && (
                      <div className="rule-detail-item">
                        <strong>描述:</strong>
                        <span>{rule.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'filterSettings' ? (
        <div className="filter-content">
          <div className="settings-section">
            <h3>过滤设置</h3>

            <div className="form-group">
              <label>默认动作（无启用规则时）</label>
              <div className="action-selector">
                {ACTION_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      className={filterSettings.defaultAction === option.value ? `active ${option.color}` : option.color}
                      onClick={() => setFilterSettings({ ...filterSettings, defaultAction: option.value })}
                    >
                      <Icon size={16} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>匹配模式</label>
              <select
                value={filterSettings.matchMode}
                onChange={(e) => setFilterSettings({ ...filterSettings, matchMode: e.target.value as 'first' | 'all' })}
              >
                <option value="first">匹配第一条规则</option>
                <option value="all">匹配所有规则</option>
              </select>
            </div>

            <button className="btn-primary" onClick={handleSaveFilterSettings}>
              <FiSave size={16} />
              <span>保存设置</span>
            </button>
          </div>

          <div className="settings-section">
            <h3>规则测试</h3>

            <div className="form-group">
              <label>测试URL</label>
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="输入要测试的URL"
              />
            </div>

            <div className="form-group">
              <label>请求方法</label>
              <select
                value={testMethod}
                onChange={(e) => setTestMethod(e.target.value)}
              >
                {HTTP_METHODS.filter(m => m !== 'ALL').map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tab ID（可选）</label>
              <input
                type="text"
                value={testTabId}
                onChange={(e) => setTestTabId(e.target.value)}
                placeholder="输入Tab ID"
              />
            </div>

            <button className="btn-primary" onClick={handleTestRule}>
              <FiCheckCircle size={16} />
              <span>测试</span>
            </button>

            {testResult && (
              <div className={`test-result ${testResult.matched ? 'matched' : 'unmatched'}`}>
                <h4>测试结果</h4>
                {testResult.matched && testResult.rule ? (
                  <>
                    <p><strong>匹配规则:</strong> {testResult.rule.name}</p>
                    <p><strong>动作:</strong> <span className={`action-badge ${testResult.rule.action}`}>{testResult.action}</span></p>
                  </>
                ) : (
                  <>
                    <p><strong>未匹配任何规则</strong></p>
                    <p><strong>默认动作:</strong> <span className={`action-badge ${filterSettings.defaultAction}`}>{testResult.action}</span></p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="filter-content">
          <div className="settings-section">
            <h3>请求记录存储设置</h3>

            <div className="form-group">
              <label>自动清理模式</label>
              <select
                value={storeSettings.cleanMode}
                onChange={(e) => setStoreSettings({ ...storeSettings, cleanMode: e.target.value as any })}
              >
                {CLEAN_MODE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {storeSettings.cleanMode === 'count' && (
              <div className="form-group">
                <label>最大记录数</label>
                <input
                  type="number"
                  value={storeSettings.maxRecords}
                  onChange={(e) => setStoreSettings({ ...storeSettings, maxRecords: parseInt(e.target.value, 10) || 1000 })}
                  min="10"
                  max="10000"
                />
                <small>超过此数量时，自动删除最旧的记录</small>
              </div>
            )}

            {storeSettings.cleanMode === 'time' && (
              <div className="form-group">
                <label>保留时长（小时）</label>
                <input
                  type="number"
                  value={Math.round(storeSettings.maxAge / (1000 * 60 * 60))}
                  onChange={(e) => setStoreSettings({ ...storeSettings, maxAge: (parseInt(e.target.value, 10) || 24) * 60 * 60 * 1000 })}
                  min="1"
                  max="720"
                />
                <small>超过此时长后自动清理</small>
              </div>
            )}

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={storeSettings.cleanOnClose}
                  onChange={(e) => setStoreSettings({ ...storeSettings, cleanOnClose: e.target.checked })}
                />
                <span>关闭浏览器时清除记录</span>
              </label>
              <small>启用后关闭浏览器时自动清除所有请求记录</small>
            </div>

            <button className="btn-primary" onClick={handleSaveStoreSettings}>
              <FiSave size={16} />
              <span>保存设置</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterManager;