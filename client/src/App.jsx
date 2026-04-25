import React from 'react';
import Home from './pages/Home';
import PasswordGate from './components/PasswordGate';

function App() {
  return (
    <PasswordGate>
      <Home />
    </PasswordGate>
  );
}

export default App;
