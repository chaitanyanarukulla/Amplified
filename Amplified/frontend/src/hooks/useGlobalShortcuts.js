import { useEffect } from 'react';

export const useGlobalShortcuts = ({ onSuggest }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd+Shift+S to trigger suggestion
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') {
                onSuggest();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSuggest]);
};
