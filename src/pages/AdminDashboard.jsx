import React, { useState, useEffect } from 'react';

const AdminDashboard = () => {
  const [questions, setQuestions] = useState([]);
  const [formData, setFormData] = useState({
    moduleType: 'speaking',
    questionType: 'Read Aloud',
    content: '',
    audio: null,
    image: null,
    keywords: ''
  });
  const [logoFile, setLogoFile] = useState(null);

  const handleLogoSubmit = async (e) => {
    e.preventDefault();
    if (!logoFile) return;
    try {
      const data = new FormData();
      data.append('logo', logoFile);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/settings/logo`, {
        method: 'POST',
        body: data
      });
      if (response.ok) {
        alert('Logo updated successfully! Please refresh the page to see changes globally.');
        setLogoFile(null);
        const logoInput = document.querySelector('input[name="logo"]');
        if (logoInput) logoInput.value = '';
      } else {
        alert('Failed to update logo');
      }
    } catch (error) {
      console.error('Error updating logo:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/questions`);
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleChange = (e) => {
    if (e.target.name === 'audio' || e.target.name === 'image') {
      setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('moduleType', formData.moduleType);
      data.append('questionType', formData.questionType);
      data.append('content', formData.content);
      if (formData.keywords) {
        data.append('keywords', formData.keywords);
      }
      if (formData.audio) {
        data.append('audio', formData.audio);
      }
      if (formData.image) {
        data.append('image', formData.image);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/questions`, {
        method: 'POST',
        body: data
      });
      if (response.ok) {
        setFormData({ ...formData, content: '', audio: null, image: null, keywords: '' }); // reset
        // clear file input
        const audioInput = document.querySelector('input[name="audio"]');
        if (audioInput) audioInput.value = '';
        const imageInput = document.querySelector('input[name="image"]');
        if (imageInput) imageInput.value = '';
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error adding question:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/questions/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchQuestions();
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--primary-color)' }}>Admin Dashboard</h2>
      
      {/* Logo Settings */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Site Settings</h3>
        <form onSubmit={handleLogoSubmit}>
          <div className="input-group">
            <label className="input-label">Update Site Logo (also updates Favicon)</label>
            <input type="file" name="logo" accept="image/*" className="input-field" onChange={(e) => setLogoFile(e.target.files[0])} required />
          </div>
          <button type="submit" className="btn btn-secondary">Upload Logo</button>
        </form>
      </div>

      <div className="grid-2">
        {/* Add Question Form */}
        <div className="glass-panel" style={{ padding: '2rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Add New Question</h3>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Module Type</label>
              <select name="moduleType" className="input-field" value={formData.moduleType} onChange={handleChange}>
                <option value="speaking">Speaking</option>
                <option value="writing">Writing</option>
                <option value="reading">Reading</option>
                <option value="listening">Listening</option>
              </select>
            </div>
            
            <div className="input-group">
              <label className="input-label">Question Type</label>
              <select name="questionType" className="input-field" value={formData.questionType} onChange={handleChange} required>
                <option value="Read Aloud">Read Aloud</option>
                <option value="Repeat Sentence">Repeat Sentence</option>
                <option value="Describe Image">Describe Image</option>
                <option value="Retell Lecture">Retell Lecture</option>
                <option value="Answer Short Question">Answer Short Question</option>
                <option value="Essay">Essay</option>
                <option value="Summarize Written Text">Summarize Written Text</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Question Content / Text</label>
              <textarea name="content" className="input-field" value={formData.content} onChange={handleChange} rows="5" required placeholder="Enter the question text or passage here..."></textarea>
            </div>
            
            {formData.questionType === 'Repeat Sentence' && (
              <div className="input-group">
                <label className="input-label">Upload Audio (for Repeat Sentence)</label>
                <input type="file" name="audio" accept="audio/*" className="input-field" onChange={handleChange} required />
              </div>
            )}

            {formData.questionType === 'Describe Image' && (
              <>
                <div className="input-group">
                  <label className="input-label">Upload Image (for Describe Image)</label>
                  <input type="file" name="image" accept="image/*" className="input-field" onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Keywords (comma separated)</label>
                  <input type="text" name="keywords" className="input-field" value={formData.keywords} onChange={handleChange} required placeholder="e.g. population, growth, highest" />
                </div>
              </>
            )}
            
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Question</button>
          </form>
        </div>

        {/* Question List */}
        <div>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Manage Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {questions.map((q) => (
              <div key={q._id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, marginRight: '1rem' }}>
                  <span style={{ 
                    background: 'var(--secondary-color)', 
                    color: '#fff', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    marginRight: '0.5rem'
                  }}>
                    {q.moduleType}
                  </span>
                  <strong>{q.questionType}</strong>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: '1.4' }}>
                    {q.content.length > 70 ? q.content.substring(0, 70) + '...' : q.content}
                  </p>
                </div>
                <button onClick={() => handleDelete(q._id)} style={{ 
                  background: 'rgba(244, 63, 94, 0.15)', 
                  color: 'var(--accent-color)', 
                  border: '1px solid rgba(244, 63, 94, 0.3)', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'var(--transition)'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(244, 63, 94, 0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(244, 63, 94, 0.15)'}
                >
                  Delete
                </button>
              </div>
            ))}
            
            {questions.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No questions found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
