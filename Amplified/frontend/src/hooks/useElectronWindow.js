import { useEffect } from 'react';

export const useElectronWindow = ({ transparency, clickThrough }) => {
    useEffect(() => {
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('set-transparency', transparency);
            ipcRenderer.send('set-ignore-mouse-events', clickThrough);
        }
    }, [transparency, clickThrough]);
};
