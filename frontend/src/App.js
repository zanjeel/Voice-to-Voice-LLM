import React from 'react';
import VoiceInterface from './components/VoiceInterface';
import styled from 'styled-components';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

function App() {
  return (
    <AppContainer>
      <VoiceInterface />
    </AppContainer>
  );
}

export default App;
