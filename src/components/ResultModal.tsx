// src/components/ResultModal.tsx
import React from 'react';
import '../pages/GamePage.css';

interface ResultModalProps {
  result: 'win' | 'lose';
  commitCount: number;
  skillName: string;
  timeTaken: string;
  onExit: () => void;
  style?: React.CSSProperties;
  visible?: boolean;
}

const ResultModal: React.FC<ResultModalProps> = ({ result, commitCount, skillName, timeTaken, onExit, style, visible = true }) => {
  if (!visible) return null;
  const title = result === 'win' ? '🎉 승리!' : '😢 패배';
  const message = result === 'win'
    ? '축하합니다! 당신이 승리했습니다.'
    : '아쉽지만 다음엔 꼭 승리해요!';

  return (
    <div className={`modal-skill-wrapper skill-${skillName?.toLowerCase() || ''}`} style={{ ...style, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999, minWidth: 320, maxWidth: 400 }}>
      <h2 style={{ margin: '8px 0' }}>{title}</h2>
      <p style={{ margin: '8px 0 24px 0', color: '#333', whiteSpace: 'pre-line' }}>{message}</p>
      <div style={{ marginBottom: 16, color: '#888' }}><strong>사용한 스킬:</strong> {skillName}</div>
      <div style={{ marginBottom: 16, color: '#888' }}><strong>커밋 수:</strong> {commitCount}</div>
      <div style={{ marginBottom: 16, color: '#888' }}><strong>게임 시간:</strong> {timeTaken}</div>
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
  );
};

export default ResultModal;
