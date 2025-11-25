import React, { useState, useEffect } from 'react';
import { Brain, Server, Sparkles, Check, Shield } from 'lucide-react';

const NeuralEngineCard = ({ selectedEngine, onEngineChange }) => {
    const [isLoading, setIsLoading] = useState(false);

    const engines = [
        {
            id: 'openai_gpt4o',
            name: 'OpenAI GPT-4o',
            subtitle: 'Best for reasoning & conversation',
            icon: Brain,
            color: 'blue',
            gradient: 'from-blue-500/20 to-blue-600/10'
        },
        {
            id: 'local_llm',
            name: 'Local LLM',
            subtitle: 'Private, offline execution',
            icon: Server,
            color: 'emerald',
            gradient: 'from-emerald-500/20 to-emerald-600/10',
            badge: 'SECURE'
        },
        {
            id: 'claude_3_5_sonnet',
            name: 'Claude 3 Opus',
            subtitle: 'Most capable model',
            icon: Sparkles,
            color: 'violet',
            gradient: 'from-violet-500/20 to-violet-600/10'
        }
    ];

    const handleSelect = async (engineId) => {
        if (engineId === selectedEngine || isLoading) return;

        setIsLoading(true);
        try {
            await onEngineChange(engineId);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-card p-6 rounded-2xl border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
                    <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Neural Engine</h3>
            </div>

            <div className="space-y-3">
                {engines.map((engine) => {
                    const Icon = engine.icon;
                    const isSelected = selectedEngine === engine.id;
                    const colorClasses = {
                        blue: {
                            border: 'border-blue-500/30 dark:border-blue-500/40',
                            bg: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
                            icon: 'text-blue-600 dark:text-blue-400',
                            iconBg: 'bg-blue-100 dark:bg-blue-500/20',
                            check: 'bg-blue-500'
                        },
                        emerald: {
                            border: 'border-emerald-500/30 dark:border-emerald-500/40',
                            bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
                            icon: 'text-emerald-600 dark:text-emerald-400',
                            iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
                            check: 'bg-emerald-500'
                        },
                        violet: {
                            border: 'border-violet-500/30 dark:border-violet-500/40',
                            bg: 'bg-gradient-to-br from-violet-500/10 to-violet-600/5',
                            icon: 'text-violet-600 dark:text-violet-400',
                            iconBg: 'bg-violet-100 dark:bg-violet-500/20',
                            check: 'bg-violet-500'
                        }
                    };

                    const colors = colorClasses[engine.color];

                    return (
                        <div
                            key={engine.id}
                            onClick={() => handleSelect(engine.id)}
                            className={`
                                relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                                ${isSelected
                                    ? `${colors.border} ${colors.bg} shadow-lg`
                                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                }
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5'}
                            `}
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center border
                                    ${isSelected
                                        ? `${colors.iconBg} border-${engine.color}-200 dark:border-${engine.color}-500/20`
                                        : 'bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                                    }
                                `}>
                                    <Icon className={`w-5 h-5 ${isSelected ? colors.icon : 'text-slate-600 dark:text-slate-400'}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {engine.name}
                                        </h4>
                                        {engine.badge && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                                {engine.badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {engine.subtitle}
                                    </p>
                                </div>

                                {/* Selection Indicator */}
                                <div className={`
                                    flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                                    ${isSelected
                                        ? `${colors.check} border-transparent`
                                        : 'border-slate-300 dark:border-slate-600'
                                    }
                                `}>
                                    {isSelected && (
                                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Info text */}
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                Your selection powers all AI features across Amplified
            </p>
        </div>
    );
};

export default NeuralEngineCard;
