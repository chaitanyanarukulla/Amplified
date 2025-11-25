import React, { useState, useEffect } from 'react';
import { Mic, Brain, Ghost, Code, Activity, ChevronRight, Terminal, FileText } from 'lucide-react';
import NeuralEngineCard from './NeuralEngineCard';
import { apiGet, apiPost } from '../utils/api';

const Dashboard = ({ onNavigate }) => {
    const [selectedEngine, setSelectedEngine] = useState('openai_gpt4o');
    const [isEngineLoading, setIsEngineLoading] = useState(true);

    // Fetch current engine selection on mount
    useEffect(() => {
        const fetchEngine = async () => {
            try {
                const response = await apiGet('/neural-engine');
                if (response.ok) {
                    const data = await response.json();
                    setSelectedEngine(data.selected_engine);
                }
            } catch (error) {
                console.error('Failed to fetch neural engine:', error);
            } finally {
                setIsEngineLoading(false);
            }
        };
        fetchEngine();
    }, []);

    // Handle engine selection change
    const handleEngineChange = async (engineId) => {
        try {
            const response = await apiPost('/neural-engine', { selected_engine: engineId });

            if (response.ok) {
                setSelectedEngine(engineId);
                console.log(`Neural engine changed to: ${engineId}`);
                // Optional: Show success toast/notification
            } else {
                // Parse error message from backend
                const errorData = await response.json();
                const errorMessage = errorData.detail || 'Failed to update neural engine';

                console.error('Failed to update neural engine:', errorMessage);

                // Show user-friendly error message
                alert(`Cannot switch to this engine:\n\n${errorMessage}`);
            }
        } catch (error) {
            console.error('Error updating neural engine:', error);
            alert('Network error: Could not connect to the backend. Please ensure the server is running.');
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Amplify your Work</h1>
                <p className="text-slate-500 dark:text-slate-400">Select a mode to activate your AI companion.</p>
            </div>

            {/* Neural Engine Card */}
            <NeuralEngineCard
                selectedEngine={selectedEngine}
                onEngineChange={handleEngineChange}
            />

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Meeting Assistant */}
                <div
                    onClick={() => onNavigate('meeting')}
                    className="group glass-card p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] border-blue-200 dark:border-blue-500/10 hover:border-blue-400 dark:hover:border-blue-500/30 relative overflow-hidden bg-white/60 dark:bg-slate-800/40"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-20 h-20 bg-blue-500/10 dark:bg-blue-500/20 blur-2xl rounded-full"></div>
                    </div>

                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-blue-200 dark:border-blue-500/20">
                        <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Meeting Assistant</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                        Real-time transcription & action items.
                    </p>

                    <button className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                        Start Meeting <ChevronRight size={16} />
                    </button>
                </div>

                {/* Test Case Generator */}
                <div
                    onClick={() => onNavigate('test-gen')}
                    className="group glass-card p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] border-emerald-200 dark:border-emerald-500/10 hover:border-emerald-400 dark:hover:border-emerald-500/30 relative overflow-hidden bg-white/60 dark:bg-slate-800/40"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-20 h-20 bg-emerald-500/10 dark:bg-emerald-500/20 blur-2xl rounded-full"></div>
                    </div>

                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-emerald-200 dark:border-emerald-500/20">
                        <Code className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Test Case Generator</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                        Instantly generate comprehensive positive, negative, and edge cases from your Jira tickets.
                    </p>

                    <button className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                        Generate Tests <ChevronRight size={16} />
                    </button>
                </div>

                {/* Document Quality Analyzer */}
                <div
                    onClick={() => onNavigate('doc-analyzer')}
                    className="group glass-card p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(217,70,239,0.2)] border-fuchsia-200 dark:border-fuchsia-500/10 hover:border-fuchsia-400 dark:hover:border-fuchsia-500/30 relative overflow-hidden bg-white/60 dark:bg-slate-800/40"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-20 h-20 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 blur-2xl rounded-full"></div>
                    </div>

                    <div className="w-12 h-12 bg-fuchsia-100 dark:bg-fuchsia-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-fuchsia-200 dark:border-fuchsia-500/20">
                        <FileText className="w-6 h-6 text-fuchsia-600 dark:text-fuchsia-400" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Doc Analyzer</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                        Analyze BRDs & PRDs for risks, gaps, and test scenarios.
                    </p>

                    <button className="w-full py-2.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-500/20">
                        Analyze Docs <ChevronRight size={16} />
                    </button>
                </div>

                {/* Interview Assistant (Stealth) */}
                <div
                    onClick={() => onNavigate('interview')}
                    className="group glass-card p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] border-rose-200 dark:border-rose-500/10 hover:border-rose-400 dark:hover:border-rose-500/30 relative overflow-hidden bg-white/60 dark:bg-slate-800/40"
                >
                    <div className="absolute top-4 right-4">
                        <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                            Stealth Mode
                        </span>
                    </div>

                    <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-rose-200 dark:border-rose-500/20">
                        <Ghost className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Interview Assistant</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                        Stealth mode live assistance.
                    </p>

                    <button className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20">
                        Enter Stealth <ChevronRight size={16} />
                    </button>
                </div>

                {/* Mock Interview */}
                <div
                    onClick={() => onNavigate('mock')}
                    className="group glass-card p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] border-violet-200 dark:border-violet-500/10 hover:border-violet-400 dark:hover:border-violet-500/30 relative overflow-hidden bg-white/60 dark:bg-slate-800/40"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-20 h-20 bg-violet-500/10 dark:bg-violet-500/20 blur-2xl rounded-full"></div>
                    </div>

                    <div className="w-12 h-12 bg-violet-100 dark:bg-violet-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-violet-200 dark:border-violet-500/20">
                        <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Mock Interview</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                        Practice with realistic AI scenarios.
                    </p>

                    <button className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20">
                        Start Practice <ChevronRight size={16} />
                    </button>
                </div>

                {/* Recent Activity */}
                <div className="glass-card p-6 rounded-2xl border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h3>
                        <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300">View All</button>
                    </div>

                    <div className="space-y-4">
                        {[
                            { title: 'System Design Interview', time: '2h ago', icon: Brain, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-500/10' },
                            { title: 'Weekly Standup', time: '5h ago', icon: Mic, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/10' },
                            { title: 'Voice Enrollment', time: '1d ago', icon: Activity, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-500/10' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
                                <div className={`w - 8 h - 8 rounded - lg ${item.bg} flex items - center justify - center`}>
                                    <item.icon size={14} className={item.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-200 truncate">{item.title}</p>
                                    <p className="text-xs text-slate-500">{item.time}</p>
                                </div>
                                <ChevronRight size={14} className="text-slate-400 dark:text-slate-600" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
