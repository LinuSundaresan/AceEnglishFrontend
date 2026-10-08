import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ totalAttempts: 0, averageScore: 0 });
  const [analyticsData, setAnalyticsData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      // Fetch general stats
      fetch(`http://localhost:5000/api/attempts/user/${user._id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const totalAttempts = data.length;
            const sumScore = data.reduce((acc, curr) => acc + curr.score, 0);
            const averageScore = Math.round(sumScore / totalAttempts);
            setStats({ totalAttempts, averageScore });
          }
        })
        .catch(err => console.error(err));
        
      // Fetch detailed analytics for charts
      fetch(`http://localhost:5000/api/attempts/analytics/user/${user._id}`)
        .then(res => res.json())
        .then(data => setAnalyticsData(data))
        .catch(err => console.error('Error fetching analytics:', err));
    }
  }, [user]);

  if (!user) return null;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Welcome back, {user.name}!</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1.2rem' }}>Ready to crush your PTE goals today?</p>
      
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Your Performance Statistics</h3>
      <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel flex-center" style={{ padding: '2rem', flexDirection: 'column' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>{stats.totalAttempts}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Questions Attempted</div>
        </div>
        <div className="glass-panel flex-center" style={{ padding: '2rem', flexDirection: 'column' }}>
          <div style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{stats.averageScore}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Average Score (out of 90)</div>
        </div>
      </div>
      
      {analyticsData && (
        <div className="grid-2" style={{ gap: '1.5rem', marginBottom: '4rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(30, 41, 59, 0.4)' }}>
            <h4 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Average Module Scores</h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart
                  data={[
                    { name: 'Speaking', score: analyticsData.speaking.average },
                    { name: 'Writing', score: analyticsData.writing.average },
                    { name: 'Reading', score: analyticsData.reading.average },
                    { name: 'Listening', score: analyticsData.listening.average },
                  ]}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: 'var(--primary-color)' }}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="score" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(30, 41, 59, 0.4)' }}>
            <h4 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Progress Over Time</h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart
                  data={analyticsData.history.map((h, i) => ({
                    attempt: `Attempt ${i + 1}`,
                    score: h.score,
                    module: h.module
                  }))}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="attempt" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: 'var(--secondary-color)' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--secondary-color)" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Practice Modules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <Link to="/speaking" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'var(--transition)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️</div>
            <h4 style={{ color: 'white' }}>Speaking</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Read Aloud, Repeat Sentence</p>
          </div>
        </Link>
        <Link to="/writing" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'var(--transition)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✍️</div>
            <h4 style={{ color: 'white' }}>Writing</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Essay, Summarize Text</p>
          </div>
        </Link>
        <Link to="/reading" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'var(--transition)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
            <h4 style={{ color: 'white' }}>Reading</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Fill in Blanks, MCQs</p>
          </div>
        </Link>
        <Link to="/listening" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', transition: 'var(--transition)' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎧</div>
            <h4 style={{ color: 'white' }}>Listening</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Write from Dictation</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default UserDashboard;
