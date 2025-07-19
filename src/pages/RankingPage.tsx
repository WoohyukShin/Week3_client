// src/pages/RankingPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRanking } from '../services/api';
import './RankingPage.css';

type Ranking = {
  username: string;
  score: number;
};

const RankingPage = () => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getRanking()
      .then(({ data }) => setRankings(data))
      .catch(() => alert('랭킹을 불러오지 못했습니다.'));
  }, []);

  return (
    <div className="ranking-page-container">
      <div className="ranking-background" />
      <div className="ranking-content">
        <div className="top-bar">
          <button className="icon-button" onClick={() => navigate(-1)}> 뒤로가기</button>
        </div>
        <h1 className="ranking-title">전체 랭킹</h1>
        <ol className="ranking-list">
  {rankings.map((r, index) => {
    let medal = '';
    if (index === 0) medal = '🥇';
    else if (index === 1) medal = '🥈';
    else if (index === 2) medal = '🥉';

    return (
      <li key={index} className={`ranking-item ${index < 3 ? 'medal' : ''}`}>
        {medal} {r.username} - {r.score}
      </li>
    );
  })}
</ol>
      </div>
    </div>
  );
};

export default RankingPage;
