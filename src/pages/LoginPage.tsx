// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loginUser, registerUser, checkUsername, checkNickname } from '../services/api';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(''); // 회원가입용
  const [error, setError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{ available: boolean; message: string } | null>(null);
  const [nicknameStatus, setNicknameStatus] = useState<{ available: boolean; message: string } | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleCheckUsername = async () => {
    if (!username.trim()) {
      setError('사용자명을 입력해주세요.');
      return;
    }
    
    setIsCheckingUsername(true);
    setError('');
    try {
      const { data } = await checkUsername(username);
      setUsernameStatus(data);
    } catch (err: any) {
      setError('사용자명 확인 중 오류가 발생했습니다.');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleCheckNickname = async () => {
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return;
    }
    
    setIsCheckingNickname(true);
    setError('');
    try {
      const { data } = await checkNickname(nickname);
      setNicknameStatus(data);
    } catch (err: any) {
      setError('닉네임 확인 중 오류가 발생했습니다.');
    } finally {
      setIsCheckingNickname(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const { data } = await loginUser({ username, password });
        login(data.token, data.username);
        navigate('/');
      } else {
        // 회원가입 시 중복확인 검증
        if (usernameStatus && !usernameStatus.available) {
          setError('사용자명 중복확인을 해주세요.');
          return;
        }
        if (nicknameStatus && !nicknameStatus.available) {
          setError('닉네임 중복확인을 해주세요.');
          return;
        }
        
        await registerUser({ username, password, nickname });
        setIsLogin(true); 
        alert('회원가입이 완료되었습니다! 로그인해주세요.');
        setUsername('');
        setPassword('');
        setNickname('');
        setUsernameStatus(null);
        setNicknameStatus(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const getStatusColor = (status: { available: boolean; message: string } | null) => {
    if (!status) return '#666';
    return status.available ? '#4CAF50' : '#f44336';
  };

  return (
    <div style={{ color: 'white', textAlign: 'center', paddingTop: '100px' }}>
      <h1>{isLogin ? '로그인' : '회원가입'}</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="사용자명"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameStatus(null);
            }}
            required
            style={{ marginRight: '10px' }}
          />
          {!isLogin && (
            <button 
              type="button" 
              onClick={handleCheckUsername}
              disabled={isCheckingUsername}
              style={{ 
                padding: '5px 10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              {isCheckingUsername ? '확인중...' : '중복확인'}
            </button>
          )}
          {!isLogin && usernameStatus && (
            <div style={{ 
              color: getStatusColor(usernameStatus), 
              fontSize: '12px', 
              marginTop: '5px' 
            }}>
              {usernameStatus.message}
            </div>
          )}
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {!isLogin && (
          <div style={{ marginBottom: '15px' }}>
            <input
              type="text"
              placeholder="닉네임"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNicknameStatus(null);
              }}
              required
              style={{ marginRight: '10px' }}
            />
            <button 
              type="button" 
              onClick={handleCheckNickname}
              disabled={isCheckingNickname}
              style={{ 
                padding: '5px 10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              {isCheckingNickname ? '확인중...' : '중복확인'}
            </button>
            {nicknameStatus && (
              <div style={{ 
                color: getStatusColor(nicknameStatus), 
                fontSize: '12px', 
                marginTop: '5px' 
              }}>
                {nicknameStatus.message}
              </div>
            )}
          </div>
        )}
        
        <button type="submit" style={{ 
          padding: '10px 20px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          marginBottom: '15px'
        }}>
          {isLogin ? '로그인' : '회원가입'}
        </button>
      </form>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <button 
        onClick={() => {
          setIsLogin(!isLogin);
          setError('');
          setUsernameStatus(null);
          setNicknameStatus(null);
        }}
        style={{ 
          padding: '8px 16px',
          backgroundColor: '#666',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          cursor: 'pointer'
        }}
      >
        {isLogin ? '계정이 없으신가요? 회원가입' : '계정이 있으신가요? 로그인'}
      </button>
    </div>
  );
};

export default LoginPage;
