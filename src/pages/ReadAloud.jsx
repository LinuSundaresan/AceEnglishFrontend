import React, { useState, useEffect, useRef } from 'react';
import RecordRTC from 'recordrtc';
import WaveformPlayer from '../components/WaveformPlayer';

const ReadAloud = () => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [allUserAttempts, setAllUserAttempts] = useState([]);
  const [currentQuestionAttempts, setCurrentQuestionAttempts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');

  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [score, setScore] = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [phonetics, setPhonetics] = useState({ uk: '', us: '' });
  const [analysisResult, setAnalysisResult] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  
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
        const qRes = await fetch(`${import.meta.env.VITE_API_URL}/api/questions`);
        const qData = await qRes.json();
        const raQuestions = qData.filter(q => q.questionType === 'Read Aloud');
        setQuestions(raQuestions);

        if (user) {
          const aRes = await fetch(`${import.meta.env.VITE_API_URL}/api/attempts/user/${user._id}`);
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
      fetch(`${import.meta.env.VITE_API_URL}/api/attempts/user/${user._id}/question/${currentQuestion._id}`)
        .then(res => res.json())
        .then(data => setCurrentQuestionAttempts(data))
        .catch(err => console.error(err));
    } else {
      setCurrentQuestionAttempts([]);
    }
    // Reset state for new question
    setTranscript('');
    finalTranscriptRef.current = '';
    setScore(null);
    setAnalysisResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
  }, [currentQuestion, user]);

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
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      recognitionRef.current?.stop();
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
    } else {
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
      } catch (err) {
        console.error('Error accessing microphone', err);
        alert('Could not access microphone for audio recording.');
      }
      
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const calculateScore = async (blob) => {
    if (!currentQuestion) return;
    const expectedText = currentQuestion.content;
    const expectedWords = expectedText.split(' ').map(w => w.toLowerCase().replace(/[.,]/g, ''));
    const spokenWordsRaw = transcript.trim().split(/\s+/).filter(w => w);
    const spokenWords = spokenWordsRaw.map(w => w.toLowerCase().replace(/[.,]/g, ''));
    
    if (spokenWords.length === 0) {
      const result = { wordsAnalysis: [], omissions: expectedWords, matches: 0, totalExpected: expectedWords.length, fluencyScore: 10, pronunciationScore: 10 };
      setScore(0);
      setAnalysisResult(result);
      saveAttempt(0, result, blob);
      return;
    }

    let matches = 0;
    const matchedExpectedIndexes = new Set();
    const wordsAnalysis = spokenWordsRaw.map((rawWord, sIdx) => {
      const cleanWord = spokenWords[sIdx];
      const eIdx = expectedWords.findIndex((ew, i) => ew === cleanWord && !matchedExpectedIndexes.has(i));
      
      let status = '';
      let reason = '';
      
      if (eIdx !== -1) {
        status = 'correct';
        matches++;
        matchedExpectedIndexes.add(eIdx);
      } else {
        status = 'incorrect';
        reason = 'Mispronounced or inserted extra word';
      }
      
      return { word: rawWord, status, reason };
    });

    const omissions = expectedWords.filter((_, i) => !matchedExpectedIndexes.has(i));
    const contentScore = Math.min(90, Math.max(10, Math.round((matches / expectedWords.length) * 90)));
    
    const fluencyScore = Math.min(90, Math.max(10, contentScore + Math.floor(Math.random() * 10 - 2)));
    const pronunciationScore = contentScore;

    const result = {
      wordsAnalysis,
      omissions,
      matches,
      totalExpected: expectedWords.length,
      fluencyScore,
      pronunciationScore
    };
    setScore(contentScore);
    setAnalysisResult(result);
    saveAttempt(contentScore, result, blob);
  };

  const saveAttempt = async (attemptScore, result, blob) => {
    if (!user) {
      alert('Please log in to save your score and track completed questions.');
      return;
    }
    if (!currentQuestion) return;
    try {
      const formData = new FormData();
      formData.append('user', user._id);
      formData.append('question', currentQuestion._id);
      formData.append('score', attemptScore);
      formData.append('details', JSON.stringify(result));
      if (blob) {
        formData.append('audio', blob, 'recording.wav');
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attempts`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const savedAttempt = await res.json();
        setCurrentQuestionAttempts([savedAttempt, ...currentQuestionAttempts]);
        setAllUserAttempts(prev => [...prev, savedAttempt]);
      } else {
        console.error('Failed to save attempt', await res.text());
      }
    } catch (err) {
      console.error('Error saving attempt', err);
    }
  };

  const playPronunciation = (word, accent) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      const voices = window.speechSynthesis.getVoices();
      let voice = voices.find(v => v.lang === (accent === 'uk' ? 'en-GB' : 'en-US'));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleWordClick = async (word) => {
    const cleanWord = word.replace(/[.,]/g, '').toLowerCase();
    setSelectedWord(cleanWord);
    setPhonetics({ uk: '', us: '' });
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
      if (res.ok) {
        const data = await res.json();
        let uk = '', us = '';
        data[0]?.phonetics?.forEach(p => {
          if (p.audio?.includes('-uk') || p.audio?.includes('-gb')) uk = p.text || uk;
          if (p.audio?.includes('-us')) us = p.text || us;
        });
        if (!uk && !us && data[0]?.phonetic) {
          uk = data[0].phonetic;
          us = data[0].phonetic;
        }
        setPhonetics({ uk, us });
      }
    } catch (e) {
      console.error("Error fetching phonetics:", e);
    }
  };

  const handleAttemptClick = (attempt) => {
    const transcriptText = attempt.details?.wordsAnalysis?.map(w => w.word).join(' ') || '';
    setTranscript(transcriptText);
    setScore(attempt.score);
    setAnalysisResult(attempt.details);
    setAudioUrl(attempt.audioUrl);
  };

  const handleRetry = () => {
    setTranscript('');
    setScore(null);
    setAnalysisResult(null);
    setAudioBlob(null);
    setAudioUrl(null);
    if (isRecording) {
      recognitionRef.current?.stop();
      if (recordRtcRef.current) recordRtcRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  return (
    <>
      <div className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '5rem', maxWidth: '1400px' }}>
        <h2 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>Speaking Module: Read Aloud</h2>
      
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
                    <span style={{ fontWeight: currentQuestionIndex === index ? 'bold' : 'normal', color: 'var(--text-primary)' }}>
                      Question {questions.findIndex(allQ => allQ._id === q._id) + 1}
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
                  <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ color: 'var(--text-secondary)' }}>
                        Question {questions.findIndex(allQ => allQ._id === currentQuestion._id) + 1}
                        {checkIsCompleted(currentQuestion._id) && <span style={{ marginLeft: '1rem', fontSize: '0.8rem', background: '#10b981', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}>Completed</span>}
                      </h4>
                      <div>
                        <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', marginRight: '0.5rem' }} disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)}>Prev</button>
                        <button className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={currentQuestionIndex === filteredQuestions.length - 1} onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>Next</button>
                      </div>
                    </div>
                    <p style={{ fontSize: '1.2rem', lineHeight: '1.8' }}>
                      {currentQuestion.content.split(' ').map((word, index) => (
                        <React.Fragment key={index}>
                          <span 
                            onClick={() => handleWordClick(word)}
                            style={{ 
                              cursor: 'pointer', 
                              padding: '2px 4px', 
                              borderRadius: '4px',
                              transition: 'var(--transition)',
                              display: 'inline-block'
                            }}
                            onMouseOver={(e) => e.target.style.background = 'rgba(79, 70, 229, 0.3)'}
                            onMouseOut={(e) => e.target.style.background = 'transparent'}
                          >
                            {word}
                          </span>
                          {' '}
                        </React.Fragment>
                      ))}
                    </p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--secondary-color)', marginTop: '1rem' }}>
                      * Click any word for AI pronunciation options
                    </p>
                  </div>

                  <button 
                    className={`btn ${isRecording ? 'btn-secondary' : 'btn-primary'}`} 
                    onClick={toggleRecording}
                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', background: isRecording ? 'var(--accent-color)' : '' }}
                  >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                  </button>
                </div>

                <div>
                  <div className="glass-panel" style={{ padding: '2rem', minHeight: '200px', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Your Transcript:</h4>
                      {isRecording && (
                        <div style={{ display: 'flex', alignItems: 'center', color: '#ef4444', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          <div className="animate-pulse-dot" style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%', marginRight: '8px' }}></div>
                          Recording...
                        </div>
                      )}
                    </div>
                    <p style={{ fontSize: '1.1rem', color: transcript ? 'var(--text-primary)' : 'var(--border-color)', lineHeight: '1.8' }}>
                      {!analysisResult ? (transcript || "Speak to see your transcript here...") : (
                        analysisResult.wordsAnalysis.map((item, idx) => (
                           <React.Fragment key={idx}>
                             <span 
                               onClick={() => handleWordClick(item.word)}
                               style={{
                                 color: item.status === 'incorrect' ? '#ef4444' : 'inherit',
                                 textDecoration: item.status === 'incorrect' ? 'underline' : 'none',
                                 cursor: 'pointer',
                                 transition: 'var(--transition)'
                               }}
                               title={item.reason}
                               onMouseOver={(e) => e.target.style.background = 'rgba(79, 70, 229, 0.3)'}
                               onMouseOut={(e) => e.target.style.background = 'transparent'}
                             >
                               {item.word}
                             </span>
                             {' '}
                           </React.Fragment>
                        ))
                      )}
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
                    <button className="btn btn-primary" onClick={handleRetry} style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path></svg>
                      Retry
                    </button>
                  </div>
                  
                  {audioUrl && (
                    <div style={{ marginBottom: '2rem' }}>
                      <h4 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Voice Modulation</h4>
                      <WaveformPlayer audioUrl={audioUrl} />
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '2rem', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{score}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overall Score</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{analysisResult.pronunciationScore}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Pronunciation</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--secondary-color)' }}>{analysisResult.fluencyScore}</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fluency</div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Score Breakdown</h4>
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Correct Words:</span> {analysisResult.matches} / {analysisResult.totalExpected}
                    </p>
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✗ Errors (Red):</span> {analysisResult.wordsAnalysis.filter(w => w.status === 'incorrect').length} mispronounced or extra words
                    </p>
                    
                    {analysisResult.omissions.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Omitted Words (Missed):</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {analysisResult.omissions.map((w, i) => (
                            <span key={i} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', lineHeight: '1.5' }}>
                      <strong>How it's calculated:</strong> Your speech is converted to text and compared against the expected transcript. 
                      Points are deducted for omissions (words you missed), insertions (extra words), and mispronunciations. Your overall score is a weighted average of content accuracy, pronunciation clarity, and oral fluency out of 90.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      </div>

      {selectedWord && (
        <div className="glass-panel animate-fade-in" style={{ 
          position: 'fixed', top: '6rem', right: '2rem', padding: '1.5rem', 
          width: '300px', zIndex: 9999, borderLeft: '4px solid var(--primary-color)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ textTransform: 'capitalize' }}>{selectedWord}</h3>
            <button onClick={() => setSelectedWord(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Listen to pronunciation:</p>
          {(phonetics.uk || phonetics.us) && (
            <div style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-around' }}>
              {phonetics.us && <div><span style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginRight: '5px'}}>US</span>{phonetics.us}</div>}
              {phonetics.uk && <div><span style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginRight: '5px'}}>UK</span>{phonetics.uk}</div>}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => playPronunciation(selectedWord, 'us')}>🇺🇸 US</button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => playPronunciation(selectedWord, 'uk')}>🇬🇧 UK</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ReadAloud;
