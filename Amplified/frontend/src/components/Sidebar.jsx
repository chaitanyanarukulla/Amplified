import React, { useState } from 'react';
import {
    LayoutDashboard,
    History,
    Database,
    Mic,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Moon,
    Sun,
    FileText
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ currentView, onNavigate }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-500 dark:text-blue-400' },
        { id: 'history', label: 'History', icon: History, color: 'text-slate-500 dark:text-slate-400' },
        { id: 'vault', label: 'Knowledge Vault', icon: Database, color: 'text-slate-500 dark:text-slate-400' },
        { id: 'doc-analyzer', label: 'Doc Analyzer', icon: FileText, color: 'text-slate-500 dark:text-slate-400' },
        { id: 'test-plan-gen', label: 'Test Plan Gen', icon: FileText, color: 'text-slate-500 dark:text-slate-400' },
        { id: 'voice', label: 'Voice Profile', icon: Mic, color: 'text-slate-500 dark:text-slate-400' },
    ];

    // Get user initials
    const getInitials = (name) => {
        if (!name) return '?';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div
            data-testid="sidebar"
            className={`
        h-full glass-panel border-r border-slate-200 dark:border-white/5 transition-all duration-300 flex flex-col
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
        >
            {/* Logo Area */}
            <div className="p-6 flex items-center gap-3 border-b border-slate-200 dark:border-white/5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                {!isCollapsed && (
                    <div>
                        <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Amplified</h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Engineering AI</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        data-testid={`nav-item-${item.id}`}
                        onClick={() => onNavigate(item.id)}
                        className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
              ${currentView === item.id
                                ? 'bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 shadow-sm dark:shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                : 'hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'}
            `}
                    >
                        <item.icon
                            size={20}
                            className={`
                ${currentView === item.id ? 'text-blue-600 dark:text-blue-400' : item.color}
                group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors
              `}
                        />
                        {!isCollapsed && (
                            <span className={`
                text-sm font-medium
                ${currentView === item.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}
              `}>
                                {item.label}
                            </span>
                        )}
                        {!isCollapsed && currentView === item.id && (
                            <div className="ml-auto w-1 h-4 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-slate-200 dark:border-white/5 space-y-2 relative">
                {/* Settings Menu */}
                {showSettings && !isCollapsed && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 p-2 rounded-xl glass-card border border-slate-200 dark:border-white/10 shadow-xl animate-in slide-in-from-bottom-2">
                        <button
                            onClick={toggleTheme}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            <span className="text-sm font-medium">
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </span>
                        </button>
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors"
                        >
                            <LogOut size={18} />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 group text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 ${showSettings ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-200' : ''}`}
                >
                    <Settings size={20} className="group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors" />
                    {!isCollapsed && <span className="text-sm font-medium">Settings</span>}
                </button>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center p-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 mt-2"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {/* User Profile (Mini) */}
            {!isCollapsed && user && (
                <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white">
                            {getInitials(user.name)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;
