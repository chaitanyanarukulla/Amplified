import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../utils/api';

const JiraConfigPanel = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        base_url: '',
        email: '',
        api_token: ''
    });
    const [status, setStatus] = useState(null);
    const [hasExistingConfig, setHasExistingConfig] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    // Load existing configuration on mount
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const res = await apiGet('/test-gen/config');
                if (res.ok) {
                    const data = await res.json();
                    if (data.configured) {
                        setFormData({
                            base_url: data.base_url || '',
                            email: data.email || '',
                            api_token: '' // Don't show the token for security
                        });
                        setHasExistingConfig(true);
                        setStatus({ type: 'success', message: 'Existing configuration loaded' });
                    }
                }
            } catch (err) {
                console.error('Failed to load config:', err);
            }
        };
        loadConfig();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus(null);

        // If updating existing config and no new token provided, don't send token
        const payload = {
            base_url: formData.base_url,
            email: formData.email
        };

        // Only include api_token if it's provided (new config or updating token)
        if (formData.api_token) {
            payload.api_token = formData.api_token;
        } else if (!hasExistingConfig) {
            setStatus({ type: 'error', message: 'API token is required for new configuration' });
            return;
        }

        try {
            console.log('Saving Jira config:', { ...payload, api_token: payload.api_token ? '***' : 'not changed' });
            const res = await apiPost('/test-gen/config', payload);

            const data = await res.json();
            console.log('Save response:', data);

            if (res.ok) {
                setStatus({ type: 'success', message: 'Settings saved successfully!' });
                setHasExistingConfig(true);
                setTimeout(() => {
                    onSave();
                }, 1000);
            } else {
                setStatus({ type: 'error', message: data.detail || 'Failed to save settings' });
            }
        } catch (err) {
            console.error('Save error:', err);
            setStatus({ type: 'error', message: 'Failed to save settings: ' + err.message });
        }
    };

    const handleTestConnection = async () => {
        if (!hasExistingConfig) {
            setStatus({ type: 'error', message: 'Please save your configuration first before testing' });
            return;
        }

        setTestingConnection(true);
        setStatus(null);

        try {
            const res = await apiPost('/test-gen/validate');
            const data = await res.json();

            if (data.valid) {
                setStatus({
                    type: 'success',
                    message: `✅ Connection successful! Connected to ${data.base_url} as ${data.email}`
                });
            } else {
                setStatus({
                    type: 'error',
                    message: `❌ ${data.error}: ${data.details || ''}`
                });
            }
        } catch (err) {
            console.error('Test connection error:', err);
            setStatus({ type: 'error', message: 'Failed to test connection: ' + err.message });
        } finally {
            setTestingConnection(false);
        }
    };

    return (
        <div className="bg-slate-800 rounded-xl p-6 max-w-2xl mx-auto w-full border border-slate-700">
            <h2 className="text-xl font-semibold mb-6">Jira Configuration</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Jira Base URL</label>
                    <input
                        type="text"
                        placeholder="https://your-domain.atlassian.net"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        value={formData.base_url}
                        onChange={e => setFormData({ ...formData, base_url: e.target.value })}
                        required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        ⚠️ Enter only the base domain (e.g., https://your-domain.atlassian.net) - do NOT include paths like /jira/software/...
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                    <input
                        type="email"
                        placeholder="you@company.com"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">API Token</label>
                    <input
                        type="password"
                        placeholder={hasExistingConfig ? "••••••••••••••••••••••••" : "Atlassian API Token"}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                        value={formData.api_token}
                        onChange={e => setFormData({ ...formData, api_token: e.target.value })}
                        required={!hasExistingConfig}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        {hasExistingConfig ? (
                            <>✅ Token configured. Leave blank to keep existing token, or enter new token to update.</>
                        ) : (
                            <>Create one at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">id.atlassian.com</a></>
                        )}
                    </p>
                </div>

                {status && (
                    <div className={`p-3 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {status.message}
                    </div>
                )}

                <div className="flex justify-between items-center space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={!hasExistingConfig || testingConnection}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {testingConnection ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Testing...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Test Connection
                            </>
                        )}
                    </button>
                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default JiraConfigPanel;
