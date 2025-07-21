// src/pages/StartPage.tsx
import { useNavigate } from 'react-router-dom';
import './StartPage.css';

const StartPage = () => {
  const navigate = useNavigate();

  return (
    <div className="start-page">
      <div className="overlay">
        <div className="content-box">
          <h1 className="slogan">학생들이 자율적으로 집중개발을 경험하는 프로그래밍 캠프입니다.</h1>
          <div className="button-wrapper">
            <button
              className="start-button"
              onClick={() => {
                console.log('✅ Button clicked');
                navigate('/login');
              }}
            >
              몰입캠프 지원하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StartPage;