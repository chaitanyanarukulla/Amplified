import React from 'react';
import { AuthProvider } from './context/AuthContext';
import AppContent from './components/AppContent';

// Wrap with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
