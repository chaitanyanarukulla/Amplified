import React from 'react';
import { Minus, X, RefreshCw } from 'lucide-react';

const WindowControls = ({ className = "" }) => {
    const handleMinimize = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('minimize-window');
        }
    };

    const handleClose = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('close-app');
        }
    };

    const handleRefresh = () => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('refresh-window');
        } else {
            window.location.reload();
        }
    };

    return (
        <div className={`flex items-center gap-2 no-drag ${className}`}>
            <button
                onClick={handleRefresh}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Refresh"
            >
                <RefreshCw className="w-4 h-4" />
            </button>
            <button
                onClick={handleMinimize}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Minimize"
            >
                <Minus className="w-4 h-4" />
            </button>
            <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default WindowControls;
