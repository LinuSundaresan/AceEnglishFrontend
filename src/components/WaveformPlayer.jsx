import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const WaveformPlayer = ({ audioUrl }) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(79, 70, 229, 0.5)',
      progressColor: 'var(--primary-color)',
      cursorColor: 'var(--accent-color)',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true
    });

    wavesurferRef.current.load(audioUrl);

    wavesurferRef.current.on('ready', () => {
      setIsReady(true);
    });

    wavesurferRef.current.on('finish', () => {
      setIsPlaying(false);
    });

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.playPause();
      setIsPlaying(wavesurferRef.current.isPlaying());
    }
  };

  if (!audioUrl) return null;

  return (
    <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={togglePlay}
          disabled={!isReady}
          className="btn btn-secondary"
          style={{ width: '40px', height: '40px', borderRadius: '50%', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div ref={containerRef} style={{ flex: 1 }}></div>
      </div>
    </div>
  );
};

export default WaveformPlayer;
