import React, { useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('freelancer'); // 'freelancer' | 'recruiter'
  
  // Registration Profile Details
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const payload = isRegister 
      ? { username, password, role, name, title: role === 'freelancer' ? title : undefined, company: role === 'recruiter' ? company : undefined }
      : { username, password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      if (data.success) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError('Connection to backend server failed.');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card">
        <h1 className="auth-title">SkillConnect</h1>
        <p className="auth-subtitle">
          {isRegister ? 'Create your platform account' : 'Sign in to access your dashboard'}
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. alice"
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              placeholder="••••••••"
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label style={{ marginBottom: '8px', display: 'block' }}>Register Mode</label>
                <div style={{ display: 'flex', gap: '24px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-main)', textTransform: 'none' }}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="freelancer" 
                      checked={role === 'freelancer'} 
                      onChange={() => setRole('freelancer')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    Freelancer
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-main)', textTransform: 'none' }}>
                    <input 
                      type="radio" 
                      name="role" 
                      value="recruiter" 
                      checked={role === 'recruiter'} 
                      onChange={() => setRole('recruiter')}
                      style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    Recruiter
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Alice Chen"
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {role === 'freelancer' ? (
                <div className="form-group">
                  <label>Professional Title</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Senior Frontend Architect"
                    required 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Company / Agency</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Google"
                    required 
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', height: '46px', justifyContent: 'center' }}>
            {isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <span onClick={() => setIsRegister(false)}>Login here</span>
            </>
          ) : (
            <>
              Don't have an account?{' '}
              <span onClick={() => setIsRegister(true)}>Register here</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
