import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="container animate-fade-in" style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center' }}>
      <h1>Master the PTE Exam with AI</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 3rem' }}>
        Practice Speaking, Writing, Reading, and Listening. Get instant, highly accurate AI scoring on pronunciation, fluency, and clarity for both UK and US English.
      </p>
      
      <div className="flex-center" style={{ gap: '1.5rem', marginBottom: '4rem' }}>
        <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>Start Practicing Free</Link>
        <Link to="/pricing" className="btn btn-secondary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>View Plans</Link>
      </div>

      <div className="grid-2">
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left' }}>
          <h3 style={{ color: 'var(--secondary-color)', marginBottom: '1rem', fontSize: '1.5rem' }}>AI Speaking Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Our cutting-edge speech recognition algorithm evaluates your reading aloud and repeating sentences, matching exact words, fluency, and pauses just like the real Pearson test. Click any word to hear UK/US pronunciation instantly!
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'left' }}>
          <h3 style={{ color: 'var(--accent-color)', marginBottom: '1rem', fontSize: '1.5rem' }}>Comprehensive Modules</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Full access to Speaking, Writing, Reading, and Listening mock tests. Track your daily progress with advanced statistics and completion rates in your personalized dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
