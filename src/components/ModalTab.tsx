import React from 'react';
import '../pages/GamePage.css';

interface ModalTabProps {
  title: string;
  description: string;
  image: string;
  okText?: string;
  onOk: () => void;
  countText?: string; // 예: '2 / 4'
  visible: boolean;
  skillName?: string;
}

const ModalTab: React.FC<ModalTabProps> = ({
  title,
  description,
  image,
  okText = 'OK',
  onOk,
  countText,
  visible,
  skillName,
}) => {
  if (!visible) return null;
  return (
<div className={`modal-skill-wrapper skill-${skillName?.toLowerCase() || ''}`}>
    <img src={image} alt={title} style={{ width: 80, height: 80, marginBottom: 16 }} />
    <h2 style={{ margin: '8px 0' }}>{title}</h2>
    <p
      style={{ margin: '8px 0 24px 0', color: '#333', whiteSpace: 'pre-line' }}
      dangerouslySetInnerHTML={{ __html: description }}
    />
    {countText && <div style={{ marginBottom: 16, color: '#888' }}>{countText}</div>}
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
      }}
      onClick={onOk}
    >
      {okText}
    </button>
  </div>
  );
};

export default ModalTab; 