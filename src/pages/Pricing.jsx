import React from 'react';

const Pricing = () => {
  return (
    <div className="container animate-fade-in" style={{ paddingTop: '5rem', paddingBottom: '5rem', textAlign: 'center' }}>
      <h1>Simple, Transparent Pricing</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>Unlock full PTE mock exams and detailed AI scoring.</p>
      
      <div className="flex-center">
        <div className="glass-panel" style={{ padding: '3rem', maxWidth: '400px', width: '100%', borderTop: '4px solid var(--primary-color)' }}>
          <h2>Pro Plan</h2>
          <div style={{ margin: '2rem 0' }}>
            <span style={{ fontSize: '3rem', fontWeight: 'bold' }}>$19</span>
            <span style={{ color: 'var(--text-secondary)' }}>/month</span>
          </div>
          <ul style={{ listStyle: 'none', textAlign: 'left', marginBottom: '2rem', color: 'var(--text-secondary)', lineHeight: '2' }}>
            <li>✓ Unlimited AI Speaking Scoring</li>
            <li>✓ Full Mock Tests</li>
            <li>✓ Advanced Progress Statistics</li>
            <li>✓ UK & US Pronunciation Support</li>
          </ul>
          <button className="btn btn-primary" style={{ width: '100%' }}>Upgrade Now</button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
