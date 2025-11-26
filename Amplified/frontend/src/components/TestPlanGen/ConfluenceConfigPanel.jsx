import React, { useState } from 'react';
import { apiPost } from '../../utils/api';

const ConfluenceConfigPanel = ({ onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        base_url: '',
        username: '',
        api_token: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await apiPost('/test-plan/config', formData);
            if (!res.ok) {
                throw new Error('Failed to save settings');
            }

            // Validate after save
            const valRes = await apiPost('/test-plan/validate');
            const valData = await valRes.json();

            if (valData.valid) {
                onSave();
            } else {
                setError('Settings saved but validation failed: ' + valData.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 rounded-lg p-6 max-w-2xl mx-auto border border-slate-700">
            <h2 className="text-xl font-bold mb-6 text-white">Confluence Configuration</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Confluence Base URL
                    </label>
                    <input
                        type="url"
                        required
                        placeholder="https://your-domain.atlassian.net/wiki"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.base_url}
                        onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Username / Email
                    </label>
                    <input
                        type="email"
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        API Token
                    </label>
                    <input
                        type="password"
                        required
                        placeholder="Atlassian API Token"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.api_token}
                        onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Create one at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">id.atlassian.com</a>
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save & Connect'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ConfluenceConfigPanel;
