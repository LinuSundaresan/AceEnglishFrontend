import React from 'react';
import { Link } from 'react-router-dom';

const SpeakingModule = () => {
  const subModules = [
    {
      title: "Read Aloud",
      description: "Read a 60-word text on screen after 35-40 seconds of prep time.",
      path: "/speaking/read-aloud"
    },
    {
      title: "Repeat Sentence",
      description: "Listen to a 3-9 second audio clip and repeat it verbatim immediately.",
      path: "/speaking/repeat-sentence"
    },
    {
      title: "Describe Image",
      description: "Analyze and speak about a graph, chart, or image within 40 seconds.",
      path: "/speaking/describe-image"
    },
    {
      title: "Retell Lecture",
      description: "Listen to an audio/video clip and summarize the main points (PTE Academic only).",
      path: "/speaking/retell-lecture"
    },
    {
      title: "Answer Short Question",
      description: "Answer a simple, general knowledge question with one or a few words.",
      path: "/speaking/answer-short-question"
    },
    {
      title: "Respond to a Situation",
      description: "Newer interactive tasks testing real-world spoken responses.",
      path: "/speaking/respond-to-situation"
    }
  ];

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>Speaking Modules</h2>
      <div className="grid-2">
        {subModules.map((module, index) => (
          <Link key={index} to={module.path} style={{ textDecoration: 'none' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', transition: 'transform 0.2s', cursor: 'pointer', height: '100%' }}
                 onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                 onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>{module.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{module.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SpeakingModule;
