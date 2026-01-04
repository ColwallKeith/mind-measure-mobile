import React from 'react';
import { MobileAppStructure } from './components/mobile/MobileAppStructure';
import { AuthProvider } from './contexts/AuthContext';

// Use the existing mobile app structure with AWS Amplify auth integrated behind the scenes
function App() {
  return (
    <AuthProvider>
      <MobileAppStructure />
    </AuthProvider>
  );
}

export default App;
