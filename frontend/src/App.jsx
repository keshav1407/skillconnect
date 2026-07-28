import React, { useState, useEffect } from 'react';
import Login from './views/Login';
import RecruiterDashboard from './views/RecruiterDashboard';
import FreelancerDashboard from './views/FreelancerDashboard';
import Inbox from './views/Inbox';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [currentUser, setCurrentUser] = useState(null); // { id, username, role, profile_id }
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'inbox'
  
  // Theme state persisted in localStorage
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('skillconnect-theme') || 'dark';
  });

  // Dropdown & Modal states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);
  const [myProfileData, setMyProfileData] = useState(null);

  // Transition data for chat
  const [preselectedPartner, setPreselectedPartner] = useState(null);

  // Effect to toggle the theme class on document body
  useEffect(() => {
    const bodyClass = window.document.body.classList;
    if (theme === 'light') {
      bodyClass.add('light-theme');
    } else {
      bodyClass.remove('light-theme');
    }
    localStorage.setItem('skillconnect-theme', theme);
  }, [theme]);

  // Page and appearance profile settings state
  const [compactCards, setCompactCards] = useState(() => {
    return localStorage.getItem('sc-compact-cards') === 'true';
  });
  const [showEfficiencyChart, setShowEfficiencyChart] = useState(() => {
    return localStorage.getItem('sc-show-chart') !== 'false';
  });
  const [matchSorting, setMatchSorting] = useState(() => {
    return localStorage.getItem('sc-match-sorting') || 'score';
  });

  useEffect(() => {
    localStorage.setItem('sc-compact-cards', compactCards);
  }, [compactCards]);

  useEffect(() => {
    localStorage.setItem('sc-show-chart', showEfficiencyChart);
  }, [showEfficiencyChart]);

  useEffect(() => {
    localStorage.setItem('sc-match-sorting', matchSorting);
  }, [matchSorting]);

  // Load user profile details for profile preview modal
  const fetchMyProfile = async () => {
    if (!currentUser) return;
    try {
      const endpoint = currentUser.role === 'freelancer' 
        ? `${API_BASE}/freelancers/${currentUser.profile_id}`
        : `${API_BASE}/recruiters`; // recruiters endpoint gets all recruiters

      const res = await fetch(endpoint);
      const data = await res.json();
      
      if (currentUser.role === 'freelancer') {
        setMyProfileData(data);
      } else {
        // Find current recruiter in the list
        const match = data.find(r => r.id === currentUser.profile_id);
        setMyProfileData(match || null);
      }
    } catch (e) {
      console.error('Error fetching own profile details:', e);
    }
  };

  useEffect(() => {
    if (isViewProfileOpen) {
      fetchMyProfile();
    }
  }, [isViewProfileOpen]);

  const handleOpenChat = (partnerId, partnerRole) => {
    setPreselectedPartner({ id: partnerId, role: partnerRole });
    setActiveTab('inbox');
  };

  const handleTabChange = (tab) => {
    if (tab === 'dashboard') {
      setPreselectedPartner(null);
    }
    setActiveTab(tab);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPreselectedPartner(null);
    setActiveTab('dashboard');
  };

  // If not logged in, render authentication card
  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="app-container">
      {/* Navbar Header */}
      <nav className="navbar">
        <div 
          className="logo-container" 
          style={{ cursor: 'pointer' }}
          onClick={() => handleTabChange('dashboard')}
        >
          {/* Handshake inline SVG Logo */}
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="url(#logo-grad)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <defs>
              <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="var(--secondary)" />
              </linearGradient>
            </defs>
            <path d="M10 12h4m-3.5-3h3M8 15h8m-8-6a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V9z" />
            <path d="M3 13a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v0a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" style={{ opacity: 0.3 }} />
            <path d="M6 10h12" />
          </svg>
          <span className="logo-text">SkillConnect</span>
        </div>

        {/* Center Title / Branding Tab */}
        <div style={{ flex: 1 }}></div>

        {/* Logged in User Profile Detail (dropdown in top-right) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          
          {/* Message box SVG logo */}
          <div 
            className="message-icon-wrapper" 
            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleTabChange('inbox')}
            title="Inbox & Messages"
          >
            <svg 
              viewBox="0 0 24 24" 
              width="26" 
              height="26" 
              fill={activeTab === 'inbox' ? 'rgba(139, 92, 246, 0.12)' : 'none'} 
              stroke={activeTab === 'inbox' ? 'var(--primary)' : 'var(--text-muted)'} 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ transition: 'color var(--transition-fast)' }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span 
              style={{ 
                position: 'absolute', 
                top: '-2px', 
                right: '-2px', 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--danger)', 
                boxShadow: '0 0 8px var(--danger)' 
              }} 
            />
          </div>

          {/* Top-Right Menu Container */}
          <div className="user-menu-container">
            <div className="avatar-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              {currentUser.username.charAt(0).toUpperCase()}
            </div>

            {/* Dropdown Menu List */}
            {isDropdownOpen && (
              <div className="dropdown-menu glass-panel">
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                    {currentUser.username}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {currentUser.role} Account
                  </div>
                </div>

                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setIsViewProfileOpen(true);
                    setIsDropdownOpen(false);
                  }}
                >
                  👤 View My Profile
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsDropdownOpen(false);
                  }}
                >
                  ⚙️ Platform Settings
                </button>
                
                <div className="dropdown-divider"></div>
                
                <button 
                  className="dropdown-item" 
                  style={{ color: 'var(--danger)' }} 
                  onClick={() => {
                    handleLogout();
                    setIsDropdownOpen(false);
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'dashboard' ? (
          currentUser.role === 'recruiter' ? (
            <RecruiterDashboard 
              currentRecruiterId={currentUser.profile_id} 
              onOpenChat={handleOpenChat}
              compactCards={compactCards}
              showEfficiencyChart={showEfficiencyChart}
              matchSorting={matchSorting}
            />
          ) : (
            <FreelancerDashboard 
              currentFreelancerId={currentUser.profile_id} 
              onOpenChat={handleOpenChat}
              compactCards={compactCards}
            />
          )
        ) : (
          <Inbox 
            currentUserId={currentUser.profile_id}
            currentUserRole={currentUser.role}
            preselectedPartner={preselectedPartner}
          />
        )}
      </main>

      {/* Account Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '480px' }}>
            <button className="modal-close" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            <h2 style={{ marginBottom: '20px' }}>Account Settings</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ marginBottom: '12px', color: 'var(--primary)' }}>Application & Appearance Settings</h4>
                
                {/* Theme mode */}
                <div className="theme-switch-container" style={{ marginBottom: '12px' }}>
                  <span>Theme Contrast</span>
                  <div className="theme-pill-switch">
                    <button 
                      type="button"
                      className={`theme-pill-btn ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      Dark
                    </button>
                    <button 
                      type="button"
                      className={`theme-pill-btn ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      Light
                    </button>
                  </div>
                </div>

                {/* Compact Card density */}
                <div className="theme-switch-container" style={{ marginBottom: '12px' }}>
                  <span>Compact Card Layout</span>
                  <div className="theme-pill-switch">
                    <button 
                      type="button"
                      className={`theme-pill-btn ${compactCards ? 'active' : ''}`}
                      onClick={() => setCompactCards(true)}
                    >
                      Enable
                    </button>
                    <button 
                      type="button"
                      className={`theme-pill-btn ${!compactCards ? 'active' : ''}`}
                      onClick={() => setCompactCards(false)}
                    >
                      Disable
                    </button>
                  </div>
                </div>

                {/* Past projects chart */}
                <div className="theme-switch-container" style={{ marginBottom: '12px' }}>
                  <span>Show Past Projects Chart</span>
                  <div className="theme-pill-switch">
                    <button 
                      type="button"
                      className={`theme-pill-btn ${showEfficiencyChart ? 'active' : ''}`}
                      onClick={() => setShowEfficiencyChart(true)}
                    >
                      Show
                    </button>
                    <button 
                      type="button"
                      className={`theme-pill-btn ${!showEfficiencyChart ? 'active' : ''}`}
                      onClick={() => setShowEfficiencyChart(false)}
                    >
                      Hide
                    </button>
                  </div>
                </div>

                {/* Default sorting preference */}
                <div className="theme-switch-container">
                  <span>Match Sorting Metric</span>
                  <select 
                    className="form-control"
                    style={{ width: '150px', height: '32px', padding: '2px 8px', fontSize: '0.8rem', borderRadius: '6px' }}
                    value={matchSorting}
                    onChange={(e) => setMatchSorting(e.target.value)}
                  >
                    <option value="score">Match Score</option>
                    <option value="experience">Experience</option>
                    <option value="wages">Wages (Cheapest)</option>
                  </select>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
                <h4 style={{ marginBottom: '8px' }}>Security & Login</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Active Username: <strong>{currentUser.username}</strong>
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Role Permission: <strong style={{ textTransform: 'capitalize' }}>{currentUser.role}</strong>
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setIsSettingsOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View My Public Profile Modal */}
      {isViewProfileOpen && myProfileData && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={() => setIsViewProfileOpen(false)}>&times;</button>
            <h2 style={{ marginBottom: '20px' }}>Public Profile Preview</h2>

            <div className="profile-details-top" style={{ marginBottom: '24px' }}>
              <div className="profile-avatar">
                {myProfileData.name ? myProfileData.name.charAt(0) : 'U'}
              </div>
              <div>
                <h2>{myProfileData.name}</h2>
                <p style={{ color: 'var(--secondary)', fontWeight: 600 }}>
                  {currentUser.role === 'freelancer' ? myProfileData.title : `Recruiter at ${myProfileData.company}`}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {currentUser.role === 'freelancer' ? `Rating: ⭐ ${myProfileData.rating} / 5.0` : `Industry: ${myProfileData.industry}`}
                </p>
              </div>
            </div>

            {currentUser.role === 'freelancer' && (
              <div className="efficiency-gauge" style={{ marginBottom: '24px' }}>
                <div className="gauge-header">
                  <strong>Cumulative Delivery Efficiency</strong>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{myProfileData.efficiency_rating}%</span>
                </div>
                <div className="gauge-bar-container">
                  <div className="gauge-bar-fill" style={{ width: `${myProfileData.efficiency_rating}%`, backgroundColor: 'var(--accent)' }}></div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <h4>Summary Bio</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, marginTop: '6px' }}>
                {myProfileData.bio || 'No profile biography published yet.'}
              </p>
            </div>

            {currentUser.role === 'freelancer' && (
              <div style={{ marginBottom: '20px' }}>
                <h4>Registered Skill Stack</h4>
                <div className="skills-wrapper" style={{ marginTop: '8px' }}>
                  {JSON.parse(myProfileData.skills || '[]').map((s, i) => (
                    <span key={i} className="badge badge-skill">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
              <button className="btn btn-secondary" onClick={() => setIsViewProfileOpen(false)}>Close Preview</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ padding: '20px 40px', textAlign: 'center', borderTop: '1px solid var(--border-light)', fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '40px' }}>
        SkillConnect Matching Platform © 2026. Powered by Express + SQLite + React.
      </footer>
    </div>
  );
}

export default App;
