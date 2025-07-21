import React from 'react';

interface ModalTabProps {
  title: string;
  description: string;
  image: string;
  okText?: string;
  onOk: () => void;
  countText?: string; // 예: '2 / 4'
  visible: boolean;
}

const ModalTab: React.FC<ModalTabProps> = ({
  title,
  description,
  image,
  okText = 'OK',
  onOk,
  countText,
  visible,
}) => {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: 32,
        minWidth: 320,
        maxWidth: 400,
        boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
        textAlign: 'center',
      }}>
        <img src={image} alt={title} style={{ width: 80, height: 80, marginBottom: 16 }} />
        <h2 style={{ margin: '8px 0' }}>{title}</h2>
        <p style={{ margin: '8px 0 24px 0', color: '#333' }}>{description}</p>
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
    </div>
  );
};

export default ModalTab; 