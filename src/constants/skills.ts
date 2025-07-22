import bumpercarImg from '../assets/img/bumpercar_icon.png';
import coffeeImg from '../assets/img/coffee_icon.png';
import exerciseImg from '../assets/img/exercise_icon.png';
import shotgunImg from '../assets/img/shotgun_icon.png';
import gameImg from '../assets/img/game_icon.png';

// 스킬 이름 → 설명/이미지 매핑 객체
export const SKILL_INFO = {
  bumpercar: {
    name: '노래',
    description: '최강 1분반 운영진 이승민의 불후의 명곡 "범퍼카"를 <br />불러 모든 플레이어의 몰입을 방해합니다.',
    image: bumpercarImg,
  },
  coffee: {
    name: '커피',
    description: '커피를 마셔 각성합니다.<br /> 5초간 몰입 게이지가 감소하지 않습니다.',
    image: coffeeImg,
  },
  exercise: {
    name: '운동',
    description: '운동에 성공하면 근육량이 오릅니다.<br />근육량을 최대로 달성하면 게임에서 승리합니다.',
    image: exerciseImg,
  },
  shotgun: {
    name: '샷건',
    description: '키보드를 내려쳐 모두를 놀라게 합니다.<br />운영진을 즉시 등장시킵니다.',
    image: shotgunImg,
  },
  game: {
    name: '게임',
    description: '게임을 플레이해서 지루함을 해소합니다.<br />Alt+Tab을 통해 빠른 화면 전환이 가능하므로,<br />운영진이 등장해도 안전합니다.',
    image: gameImg,
  },
}as const; 