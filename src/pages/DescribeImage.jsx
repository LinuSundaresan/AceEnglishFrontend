import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import WaveformPlayer from '../components/WaveformPlayer';

const DescribeImage = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [allUserAttempts, setAllUserAttempts] = useState([]);
  const [currentQuestionAttempts, setCurrentQuestionAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [score, setScore] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
  const [playbackState, setPlaybackState] = useState('idle'); // 'idle', 'preparing', 'recording', 'finished'
  const [prepCountdown, setPrepCountdown] = useState(25);
  const [recordCountdown, setRecordCountdown] = useState(40);
  
  const recognitionRef = useRef(null);
  const recordRtcRef = useRef(null);
  const streamRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qRes = await fetch('http://localhost:5000/api/questions');
        const qData = await qRes.json();
        const diQuestions = qData.filter(q => q.questionType === 'Describe Image');
        setQuestions(diQuestions);

        if (user) {
          const aRes = await fetch(`http://localhost:5000/api/attempts/user/${user._id}`);
          const aData = await aRes.json();
          setAllUserAttempts(aData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [user]);

  const checkIsCompleted = (questionId) => {
    if (!questionId) return false;
    return allUserAttempts.some(a => {
      const qId = a.question && typeof a.question === 'object' ? a.question._id : a.question;
      return String(qId) === String(questionId);
    });
  };

  const filteredQuestions = questions.filter(q => {
    const isCompleted = checkIsCompleted(q._id);
    if (activeTab === 'completed') return isCompleted;
    if (activeTab === 'incomplete') return !isCompleted;
    return true;
  });

  const currentQuestion = filteredQuestions[currentQuestionIndex] || null;

  useEffect(() => {
    if (currentQuestion && user) {
      fetch(`http://localhost:5000/api/attempts/user/${user._id}/question/${currentQuestion._id}`)
        .then(res => res.json())
        .then(data => setCurrentQuestionAttempts(data))
        .catch(err => console.error(err));
    } else {
      setCurrentQuestionAttempts([]);
    }
    // Reset state for new question
    resetAttemptState();
  }, [currentQuestion, user]);

  const resetAttemptState = () => {
    setTranscript('');
    finalTranscriptRef.current = '';
    setScore(null);
    setAnalysisResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setPlaybackState('idle');
    setPrepCountdown(25);
    setRecordCountdown(40);
    if (isRecording) {
      stopRecording();
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = finalTranscriptRef.current;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        finalTranscriptRef.current = finalTranscript;
        setTranscript(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (playbackState === 'recording') {
            stopRecording();
        }
      };

      recognitionRef.current.onend = () => {
        if (playbackState === 'recording') {
            stopRecording();
        }
      };
    }
  }, []);

  useEffect(() => {
    let timer;
    if (playbackState === 'preparing' && prepCountdown > 0) {
      timer = setTimeout(() => setPrepCountdown(prepCountdown - 1), 1000);
    } else if (playbackState === 'preparing' && prepCountdown === 0) {
      startRecording();
    } else if (playbackState === 'recording' && recordCountdown > 0) {
      timer = setTimeout(() => setRecordCountdown(recordCountdown - 1), 1000);
    } else if (playbackState === 'recording' && recordCountdown === 0) {
      stopRecording();
    }
    return () => clearTimeout(timer);
  }, [playbackState, prepCountdown, recordCountdown]);

  const startPreparation = () => {
    setPlaybackState('preparing');
    setPrepCountdown(25);
  };

  const startRecording = async () => {
    setPlaybackState('recording');
    setRecordCountdown(40);
    setTranscript('');
    finalTranscriptRef.current = '';
    setScore(null);
    setAnalysisResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      recordRtcRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        desiredSampRate: 16000
      });
      recordRtcRef.current.startRecording();
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone for audio recording.');
      setPlaybackState('idle');
    }
  };

  const stopRecording = () => {
    setPlaybackState('finished');
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (recordRtcRef.current) {
        recordRtcRef.current.stopRecording(() => {
          const blob = recordRtcRef.current.getBlob();
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
          calculateScore(blob);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
        });
      } else {
        calculateScore(null);
      }
    }
  };

  const calculateScore = async (blob) => {
    if (!currentQuestion) return;
    
    const expectedKeywords = (currentQuestion.keywords || []).map(w => w.toLowerCase());
    const spokenWordsRaw = transcript.trim().split(/\s+/).filter(w => w);
    const spokenWords = spokenWordsRaw.map(w => w.toLowerCase().replace(/[.,?!']/g, ''));
    
    if (spokenWords.length === 0 || expectedKeywords.length === 0) {
      const result = { matches: 0, totalExpected: expectedKeywords.length, fluencyScore: 10, pronunciationScore: 10, matchedKeywords: [], missedKeywords: expectedKeywords };
      setScore(0);
      setAnalysisResult(result);
      saveAttempt(0, result, blob);
      return;
    }

    const matchedKeywords = [];
    const missedKeywords = [];
    
    expectedKeywords.forEach(kw => {
       if (spokenWords.some(w => w.includes(kw) || kw.includes(w))) {
           matchedKeywords.push(kw);
       } else {
           missedKeywords.push(kw);
       }
    });

    const matches = matchedKeywords.length;
    // Calculate content score based on keywords found
    let contentScore = Math.min(90, Math.max(10, Math.round((matches / expectedKeywords.length) * 90)));
    
    // Adjust fluency based on speaking length
    let fluencyScore = Math.min(90, Math.max(10, Math.round((spokenWords.length / 40) * 90))); 
    let pronunciationScore = contentScore;

    const overallScore = Math.round((contentScore + fluencyScore + pronunciationScore) / 3);

    const result = {
      matches,
      totalExpected: expectedKeywords.length,
      matchedKeywords,
      missedKeywords,
      fluencyScore,
      pronunciationScore,
      contentScore
    };
    
    setScore(overallScore);
    setAnalysisResult(result);
    saveAttempt(overallScore, result, blob);
  };

  const saveAttempt = async (attemptScore, result, blob) => {
    if (!user || !currentQuestion) return;
    try {
      const formData = new FormData();
      formData.append('user', user._id);
      formData.append('question', currentQuestion._id);
      formData.append('questionType', 'Describe Image');
      formData.append('score', attemptScore);
      formData.append('details', JSON.stringify(result));
      if (blob) {
        formData.append('audio', blob, 'recording.wav');
      }

      const res = await fetch('http://localhost:5000/api/attempts', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const savedAttempt = await res.json();
        setCurrentQuestionAttempts([savedAttempt, ...currentQuestionAttempts]);
        setAllUserAttempts(prev => [...prev, savedAttempt]);
      }
    } catch (err) {
      console.error('Error saving attempt', err);
    }
  };

  const handleAttemptClick = (attempt) => {
    setScore(attempt.score);
    setAnalysisResult(attempt.details);
    setAudioUrl(attempt.audioUrl);
    setPlaybackState('finished');
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '5rem', maxWidth: '1400px' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>Speaking Module: Describe Image</h2>
    
      <div className="module-layout">
        
        {/* LEFT SIDEBAR - Question Navigation */}
        <div className="glass-panel module-sidebar">
          <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Questions</h4>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 1 }} onClick={() => { setActiveTab('all'); setCurrentQuestionIndex(0); }}>All</button>
            <button className={`btn ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 1 }} onClick={() => { setActiveTab('completed'); setCurrentQuestionIndex(0); }}>Completed</button>
            <button className={`btn ${activeTab === 'incomplete' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '0.5rem', fontSize: '0.8rem', flex: 1 }} onClick={() => { setActiveTab('incomplete'); setCurrentQuestionIndex(0); }}>Incomplete</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {filteredQuestions.map((q, index) => {
              const isCompleted = checkIsCompleted(q._id);
              return (
                <div 
                  key={q._id} 
                  onClick={() => setCurrentQuestionIndex(index)}
                  style={{ 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    background: currentQuestionIndex === index ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: currentQuestionIndex === index ? '1px solid var(--primary-color)' : '1px solid transparent',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: currentQuestionIndex === index ? 'bold' : 'normal', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '150px' }}>
                      {q.content || `Question ${index + 1}`}
                    </span>
                    {isCompleted ? (
                      <span style={{ fontSize: '0.75rem', background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>Completed</span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', background: 'var(--border-color)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>New</span>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredQuestions.length === 0 && (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>No questions found.</p>
            )}
          </div>
        </div>

        {/* RIGHT AREA - Question Content & Recording */}
        <div className="module-main">
          {!currentQuestion ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Please select a question from the sidebar.</p>
            </div>
          ) : (
            <>
              <div className="grid-2">
                <div>
                  <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center', minHeight: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ color: 'var(--text-secondary)' }}>
                        Question {questions.findIndex(allQ => allQ._id === currentQuestion._id) + 1}
                      </h4>
                      <div>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', marginRight: '0.5rem' }} disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)}>Prev</button>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={currentQuestionIndex === filteredQuestions.length - 1} onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Next</button>
                      </div>
                    </div>
                    
                    {currentQuestion.imageUrl && (
                      <div style={{ marginBottom: '1.5rem', background: 'white', padding: '1rem', borderRadius: '8px' }}>
                         <img src={currentQuestion.imageUrl} alt="Describe" style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain' }} />
                      </div>
                    )}

                    <div style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                      {playbackState === 'idle' && (
                        <button className="btn btn-primary" style={{ fontSize: '1.2rem', padding: '1rem 2rem' }} onClick={startPreparation}>
                          ▶️ Start Preparation
                        </button>
                      )}
                      
                      {playbackState === 'preparing' && (
                        <div style={{ color: 'var(--secondary-color)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                          Preparing: {prepCountdown}s
                        </div>
                      )}
                      
                      {playbackState === 'recording' && (
                         <div style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }} className="animate-pulse">
                           <div style={{ width: '15px', height: '15px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '10px' }}></div>
                           Recording: {recordCountdown}s
                         </div>
                      )}

                      {playbackState === 'finished' && (
                         <div style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 'bold' }}>
                           ✅ Recording finished.
                         </div>
                      )}
                    </div>
                  </div>

                  {playbackState === 'recording' && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={stopRecording}
                      style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: 'var(--accent-color)' }}
                    >
                      Finish Recording Early
                    </button>
                  )}
                </div>

                <div>
                  <div className="glass-panel" style={{ padding: '2rem', minHeight: '200px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Your Transcript:</h4>
                      {isRecording && (
                        <div style={{ display: 'flex', alignItems: 'center', color: '#ef4444', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          <div className="animate-pulse-dot" style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '8px' }}></div>
                          Listening...
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '1.1rem', color: transcript ? 'var(--text-primary)' : 'var(--border-color)', lineHeight: '1.8' }}>
                      {transcript || (playbackState === 'recording' ? "Speak to see your transcript here..." : "Complete attempt to see transcript")}
                    </p>
                  </div>

                  {/* Previous Attempts Section */}
                  {currentQuestionAttempts.length > 0 && (
                    <div className="glass-panel" style={{ padding: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                      <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Previous Attempts</h4>
                      {currentQuestionAttempts.map((attempt, i) => (
                        <React.Fragment key={attempt._id}>
                        <div 
                          onClick={() => handleAttemptClick(attempt)}
                          style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'var(--transition)' }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div>
                            <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Score: {attempt.score}</span>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(attempt.createdAt).toLocaleString()}</div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            F: {attempt.details?.fluencyScore || 0} | P: {attempt.details?.pronunciationScore || 0}
                          </div>
                        </div>
                        {attempt.audioUrl && (
                          <div style={{ padding: '0 0.8rem 0.8rem 0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <WaveformPlayer audioUrl={attempt.audioUrl} />
                          </div>
                        )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {score !== null && analysisResult && (
                <div className="glass-panel animate-fade-in" style={{ padding: '2rem', marginTop: '2rem', borderTop: '4px solid var(--secondary-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>AI Scoring Analysis</h3>
                    <button className="btn btn-primary" onClick={resetAttemptState} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path></svg>
                      Retry
                    </button>
                  </div>

                  {audioUrl && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Voice Recording</h4>
                      <WaveformPlayer audioUrl={audioUrl} />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{score}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overall Score</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{analysisResult.contentScore}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Content</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>{analysisResult.fluencyScore}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fluency</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Content Breakdown</h4>
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Keywords Found:</span> {analysisResult.matches} / {analysisResult.totalExpected}
                    </p>
                    
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Keywords Successfully Mentioned:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {analysisResult.matchedKeywords && analysisResult.matchedKeywords.length > 0 ? analysisResult.matchedKeywords.map((w, i) => (
                          <span key={i} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            {w}
                          </span>
                        )) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>None</span>}
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Keywords Missed:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {analysisResult.missedKeywords && analysisResult.missedKeywords.length > 0 ? analysisResult.missedKeywords.map((w, i) => (
                          <span key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            {w}
                          </span>
                        )) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>None</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DescribeImage;
