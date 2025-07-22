// src/components/TestResultModal.tsx
// src/pages/TestResultModalPage.tsx
import React from 'react';
import ResultModal from '../components/ResultModal';

interface Props {
  result: 'win' | 'lose';
  commitCount: number;
  skillName: string;
  gameTime: string;
  onExit: () => void;
}

const TestResultModalPage: React.FC<Props> = ({ result, commitCount, gameTime, onExit }) => {
  return (
    <div style={{ height: '100vh', background: '#f0f0f0' }}>
      <ResultModal
        result={result}
        commitCount={commitCount}
        skillName="bumpercar"
        timeTaken={gameTime}
        onExit={() => alert('나가기')}
      />
    </div>
  );
};

export default TestResultModalPage;