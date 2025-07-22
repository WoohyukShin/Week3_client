// src/components/ResultModal.tsx
import React from 'react';
import '../pages/GamePage.css';

interface ResultModalProps {
  result: 'win' | 'lose';
  commitCount: number;
  skillName: string;
  timeTaken: string;
  onExit: () => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ result, commitCount, skillName, timeTaken, onExit }) => {
  const title = result === 'win' ? '🎉 승리!' : '😢 패배';
  const message = result === 'win'
    ? '축하합니다! 당신이 승리했습니다.'
    : '아쉽지만 다음엔 꼭 승리해요!';

  return (
    <div className="result-modal-overlay">
      <div className={`modal-skill-wrapper skill-${skillName}`}>
        <h2>{title}</h2>
        <p>{message}</p>
        <p><strong>사용한 스킬:</strong> {skillName}</p>
        <p><strong>커밋 수:</strong> {commitCount}</p>
        <p><strong>게임 시간:</strong> {timeTaken}</p>
        <button
          style={{
            padding: '8px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#1976d2',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 16,
            cursor: 'pointer',
            marginTop: 16,
          }}
          onClick={onExit}
        >
          로비로 나가기
        </button>
      </div>
    </div>
  );
};

export default ResultModal;
