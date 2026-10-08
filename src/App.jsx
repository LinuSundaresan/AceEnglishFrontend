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
      <nav className="navbar">
        <div className="container nav-container">
          <Link to="/" className="nav-logo">
            <img src={logoUrl} alt="Logo" className="logo-img" />
            PTETool
          </Link>
          <div className="nav-links">
            <Link to="/speaking" className="nav-link">Speaking</Link>
            <Link to="/pricing" className="nav-link">Pricing</Link>
            
            {userInfo ? (
              <>
                {userInfo.role === 'admin' && (
                  <Link to="/admin" className="nav-link-accent">Admin</Link>
                )}
                <Link to="/dashboard" className="nav-link-active">Dashboard</Link>
                <button onClick={handleLogout} className="btn btn-secondary nav-btn">Logout</button>
              </>
            ) : (
              <>
                <Link to="/admin" className="nav-link-accent">Admin</Link>
                <Link to="/login" className="btn btn-secondary nav-btn">Login</Link>
                <Link to="/register" className="btn btn-primary nav-btn">Sign Up</Link>
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
