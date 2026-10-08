import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import SpeakingModule from './pages/SpeakingModule';
import ReadAloud from './pages/ReadAloud';
import RepeatSentence from './pages/RepeatSentence';
import DescribeImage from './pages/DescribeImage';
import RetellLecture from './pages/RetellLecture';
import AnswerShortQuestion from './pages/AnswerShortQuestion';
import RespondToSituation from './pages/RespondToSituation';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

function App() {
  const [userInfo, setUserInfo] = useState(null);
  const [logoUrl, setLogoUrl] = useState('http://localhost:5000/api/settings/logo');

  useEffect(() => {
    const user = localStorage.getItem('userInfo');
    if (user) {
      setUserInfo(JSON.parse(user));
    }
    
    // Update favicon
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/jpeg';
    link.rel = 'icon';
    link.href = logoUrl;
    document.head.appendChild(link);
  }, [logoUrl]);

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    setUserInfo(null);
    window.location.href = '/login';
  };

  return (
    <Router>
      <nav style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '2rem', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.2rem', background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            <img src={logoUrl} alt="Logo" style={{ height: '32px', width: '32px', borderRadius: '8px', objectFit: 'cover' }} />
            PTETool
          </Link>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <Link to="/speaking" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Speaking</Link>
            <Link to="/pricing" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Pricing</Link>
            
            {userInfo ? (
              <>
                {userInfo.role === 'admin' && (
                  <Link to="/admin" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500 }}>Admin</Link>
                )}
                <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Dashboard</Link>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/admin" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500 }}>Admin</Link>
                <Link to="/login" className="btn btn-secondary">Login</Link>
                <Link to="/register" className="btn btn-primary">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/speaking" element={<SpeakingModule />} />
          <Route path="/speaking/read-aloud" element={<ReadAloud />} />
          <Route path="/speaking/repeat-sentence" element={<RepeatSentence />} />
          <Route path="/speaking/describe-image" element={<DescribeImage />} />
          <Route path="/speaking/retell-lecture" element={<RetellLecture />} />
          <Route path="/speaking/answer-short-question" element={<AnswerShortQuestion />} />
          <Route path="/speaking/respond-to-situation" element={<RespondToSituation />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
