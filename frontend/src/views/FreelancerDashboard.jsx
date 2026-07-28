import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

const POPULAR_SKILLS = ['React', 'JavaScript', 'CSS', 'Node.js', 'SQL', 'TypeScript', 'Python', 'Figma'];

const getBasisLabel = (basis) => {
  switch (basis) {
    case 'Per Day': return 'day';
    case 'Weekly': return 'wk';
    case 'Monthly': return 'mo';
    case 'Yearly': return 'yr';
    default: return 'hr';
  }
};

export default function FreelancerDashboard({ currentFreelancerId, onOpenChat, compactCards }) {
  const [profile, setProfile] = useState(null);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [pastWorkList, setPastWorkList] = useState([]);
  
  // Profile edit modals
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    title: '',
    bio: '',
    wage_amount: '',
    wage_basis: 'Hourly',
    experience_years: '',
    availability: '',
    portfolio_url: ''
  });

  // Skills checkbox edit states
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [hasOthers, setHasOthers] = useState(false);
  const [otherSkillsText, setOtherSkillsText] = useState('');

  // Past work modal
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [workForm, setWorkForm] = useState({
    project_name: '',
    client_company: '',
    duration: '',
    description: '',
    project_efficiency: '95'
  });

  const [selectedJob, setSelectedJob] = useState(null);

  // Load profile details
  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/freelancers/${currentFreelancerId}`);
      const data = await res.json();
      setProfile(data);
    } catch (e) {
      console.error('Error fetching profile:', e);
    }
  };

  // Load matched jobs list
  const fetchMatchedJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/matches/jobs-for-freelancer/${currentFreelancerId}`);
      const data = await res.json();
      setMatchedJobs(data);
    } catch (e) {
      console.error('Error fetching matched jobs:', e);
    }
  };

  // Load completed projects (past work)
  const fetchPastWork = async () => {
    try {
      const res = await fetch(`${API_BASE}/freelancers/${currentFreelancerId}/past-work`);
      const data = await res.json();
      setPastWorkList(data);
    } catch (e) {
      console.error('Error fetching past work:', e);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchMatchedJobs();
    fetchPastWork();
  }, [currentFreelancerId]);

  const handleOpenEdit = () => {
    let currentSkills = [];
    try {
      currentSkills = JSON.parse(profile.skills || '[]');
    } catch (e) {
      currentSkills = [];
    }

    const standardMatched = currentSkills.filter(s => POPULAR_SKILLS.includes(s));
    const othersMatched = currentSkills.filter(s => !POPULAR_SKILLS.includes(s));

    setSelectedSkills(standardMatched);
    if (othersMatched.length > 0) {
      setHasOthers(true);
      setOtherSkillsText(othersMatched.join(', '));
    } else {
      setHasOthers(false);
      setOtherSkillsText('');
    }

    setEditForm({
      name: profile.name || '',
      title: profile.title || '',
      bio: profile.bio || '',
      wage_amount: profile.wage_amount || '',
      wage_basis: profile.wage_basis || 'Hourly',
      experience_years: profile.experience_years || '',
      availability: profile.availability || 'Immediate',
      portfolio_url: profile.portfolio_url || ''
    });

    setIsEditing(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      let combinedSkills = [...selectedSkills];
      if (hasOthers && otherSkillsText.trim()) {
        const othersParsed = otherSkillsText
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        combinedSkills = [...combinedSkills, ...othersParsed];
      }

      const res = await fetch(`${API_BASE}/freelancers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(currentFreelancerId),
          name: editForm.name,
          title: editForm.title,
          bio: editForm.bio,
          skills: combinedSkills,
          wage_amount: parseFloat(editForm.wage_amount),
          wage_basis: editForm.wage_basis,
          experience_years: parseInt(editForm.experience_years),
          availability: editForm.availability,
          efficiency_rating: profile.efficiency_rating,
          portfolio_url: editForm.portfolio_url
        })
      });

      if (res.ok) {
        setIsEditing(false);
        await fetchProfile();
        await fetchMatchedJobs();
      }
    } catch (e) {
      console.error('Error updating profile:', e);
    }
  };

  const handleAddPastWork = async (e) => {
    e.preventDefault();
    if (!workForm.project_name || !workForm.client_company || !workForm.duration || !workForm.description) return;

    try {
      const res = await fetch(`${API_BASE}/freelancers/${currentFreelancerId}/past-work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: workForm.project_name,
          client_company: workForm.client_company,
          duration: workForm.duration,
          description: workForm.description,
          project_efficiency: parseInt(workForm.project_efficiency)
        })
      });

      if (res.ok) {
        setIsWorkModalOpen(false);
        setWorkForm({
          project_name: '',
          client_company: '',
          duration: '',
          description: '',
          project_efficiency: '95'
        });
        await fetchProfile();
        await fetchPastWork();
      }
    } catch (e) {
      console.error('Error adding project history:', e);
    }
  };

  const getMatchScoreClass = (score) => {
    if (score >= 80) return 'badge-match-high';
    if (score >= 50) return 'badge-match-medium';
    return 'badge-match-low';
  };

  const getEfficiencyColor = (eff) => {
    if (eff >= 95) return 'var(--accent)';
    if (eff >= 90) return 'var(--secondary)';
    return 'var(--warning)';
  };

  if (!profile) {
    return <div className="empty-state">Loading Profile Data...</div>;
  }

  const isNewFreelancer = pastWorkList.length === 0;

  return (
    <div className="dashboard-grid">
      {/* Sidebar - Profile Card and Efficiency Metric */}
      <div className="sidebar-panel">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '20px' }}>
            <div className="profile-avatar" style={{ marginBottom: '12px', width: '70px', height: '70px', fontSize: '1.8rem' }}>
              {profile.name.charAt(0)}
            </div>
            <h3>{profile.name}</h3>
            <p style={{ color: 'var(--secondary)', fontSize: '0.9rem', fontWeight: 600 }}>{profile.title}</p>
            <span className="badge badge-skill" style={{ marginTop: '8px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--secondary)' }}>
              {profile.availability}
            </span>
          </div>

          {/* Efficiency Metric Panel */}
          <div className="efficiency-gauge" style={{ border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="gauge-header">
              <strong>My Efficiency</strong>
              <span style={{ color: getEfficiencyColor(isNewFreelancer ? 90 : profile.efficiency_rating), fontWeight: 700 }}>
                {isNewFreelancer ? 'N/A' : `${profile.efficiency_rating}%`}
              </span>
            </div>
            <div className="gauge-bar-container" style={{ height: '8px' }}>
              <div 
                className="gauge-bar-fill" 
                style={{ width: `${isNewFreelancer ? 90 : profile.efficiency_rating}%`, backgroundColor: getEfficiencyColor(isNewFreelancer ? 90 : profile.efficiency_rating) }}
              ></div>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              {isNewFreelancer 
                ? '🟢 New Freelancer - No client history yet.' 
                : 'Reflects the timeliness and completion quality of your past works.'}
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <div>
              <strong>Wages:</strong> ${profile.wage_amount}/{getBasisLabel(profile.wage_basis)}
            </div>
            <div>
              <strong>Projects Handled:</strong> {pastWorkList.length}
            </div>
            <div>
              <strong>Experience:</strong> {profile.experience_years} Years
            </div>
            <div>
              <strong>Portfolio:</strong>{' '}
              {profile.portfolio_url ? (
                <a href={profile.portfolio_url} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)' }}>
                  Visit Link
                </a>
              ) : 'None'}
            </div>
          </div>

          <button 
            className="btn btn-secondary" 
            style={{ width: '100%', marginTop: '20px' }}
            onClick={handleOpenEdit}
          >
            Edit Profile Info
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4>My Skill Tags</h4>
          <div className="skills-wrapper" style={{ marginTop: '12px' }}>
            {JSON.parse(profile.skills || '[]').map((skill, idx) => (
              <span key={idx} className="badge badge-skill">{skill}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Matched Jobs & Past Projects Feed */}
      <div className="feed-container">
        
        {/* Past Projects List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2>Completed Projects & Delivery History</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Demonstrate your project execution reliability and efficiency score to recruiters.
              </p>
            </div>
            <button className="btn btn-accent" onClick={() => setIsWorkModalOpen(true)}>
              + Add Past Work
            </button>
          </div>

          {pastWorkList.length === 0 ? (
            <div className="glass-panel empty-state">
              <h3>No past projects listed</h3>
              <p>Click "Add Past Work" to add record milestones and compute your delivery metrics.</p>
            </div>
          ) : (
            <div className="past-work-section">
              {pastWorkList.map(work => (
                <div key={work.id} className="glass-panel past-work-card">
                  <div className="past-work-header">
                    <div>
                      <div className="past-work-title">{work.project_name}</div>
                      <div className="past-work-client">Client: {work.client_company}</div>
                    </div>
                    <span 
                      className="badge" 
                      style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                    >
                      {work.project_efficiency}% Delivery Efficiency
                    </span>
                  </div>
                  <p className="past-work-desc">{work.description}</p>
                  <div className="past-work-footer">
                    <span>Term: {work.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr style={{ border: '0', borderTop: '1px solid var(--border-light)', margin: '20px 0' }} />

        {/* Matches Area */}
        <div>
          <h2>Smart Matched Job Offers</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Job opportunities sorted and scored by alignment to your qualifications.
          </p>

          {matchedJobs.length === 0 ? (
            <div className="glass-panel empty-state">
              <h3>No jobs found in the marketplace</h3>
              <p>Wait for recruiters to publish job descriptions matching your tech stack.</p>
            </div>
          ) : (
            <div className="card-grid">
              {matchedJobs.map(job => {
                const skillsArray = JSON.parse(job.required_skills || '[]');
                const score = job.matchDetails?.score || 0;
                
                return (
                  <div 
                    key={job.id} 
                    className={`glass-panel glass-panel-interactive item-card ${compactCards ? 'compact-card' : ''}`}
                    style={{ '--card-accent': score >= 80 ? 'var(--accent)' : 'var(--primary)' }}
                  >
                    <div>
                      <div className="card-header">
                        <div>
                          <h3 className="card-title">{job.title}</h3>
                          <span className="card-subtitle">{job.recruiter_company} • Rep: {job.recruiter_name}</span>
                        </div>
                        <div className={`match-circle ${getMatchScoreClass(score)}`}>
                          {score}%
                        </div>
                      </div>

                      <p className="card-body">
                        {job.description ? job.description.substring(0, 120) + '...' : 'No description.'}
                      </p>

                      <div className="skills-wrapper">
                        {skillsArray.map((skill, idx) => {
                          const isMatching = job.matchDetails?.matchingSkills.includes(skill);
                          return (
                            <span 
                              key={idx} 
                              className={`badge ${isMatching ? 'badge-match' : 'badge-skill'}`}
                              style={isMatching ? {} : { opacity: 0.7 }}
                            >
                              {skill}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="card-footer">
                      <div className="footer-info">
                        <span className="info-label">Max Budget / Duration</span>
                        <span className="info-value">${job.budget}/hr • {job.duration}</span>
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setSelectedJob(job)}
                      >
                        View Offer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setIsEditing(false)}>&times;</button>
            <h2 style={{ marginBottom: '20px' }}>Customize Freelance Profile</h2>
            
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Professional Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Professional Summary (Bio)</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  required
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                />
              </div>

              {/* Wage Selector: Amount & Basis */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Wage Rate Amount ($)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required
                    value={editForm.wage_amount}
                    onChange={(e) => setEditForm({ ...editForm, wage_amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Wage Billing Basis</label>
                  <select 
                    className="form-control"
                    value={editForm.wage_basis}
                    onChange={(e) => setEditForm({ ...editForm, wage_basis: e.target.value })}
                  >
                    <option value="Hourly">Hourly</option>
                    <option value="Per Day">Per Day</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Years of Experience</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required
                    value={editForm.experience_years}
                    onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Availability</label>
                  <select 
                    className="form-control"
                    value={editForm.availability}
                    onChange={(e) => setEditForm({ ...editForm, availability: e.target.value })}
                  >
                    <option value="Immediate">Immediate</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Portfolio URL</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="https://myportfolio.com"
                  value={editForm.portfolio_url}
                  onChange={(e) => setEditForm({ ...editForm, portfolio_url: e.target.value })}
                />
              </div>

              {/* Skills checklist checkboxes + Others field */}
              <div className="form-group" style={{ border: '1px solid var(--border-light)', borderRadius: '10px', padding: '16px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>Select Skills & Technologies</label>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {POPULAR_SKILLS.map(skill => {
                    const isChecked = selectedSkills.includes(skill);
                    return (
                      <label key={skill} style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedSkills(prev => prev.filter(s => s !== skill));
                            } else {
                              setSelectedSkills(prev => [...prev, skill]);
                            }
                          }}
                        />
                        {skill}
                      </label>
                    );
                  })}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'none', fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer', marginTop: '15px' }}>
                  <input 
                    type="checkbox" 
                    checked={hasOthers}
                    onChange={() => setHasOthers(!hasOthers)}
                  />
                  <strong>Others (Specify custom skills)</strong>
                </label>

                {hasOthers && (
                  <input 
                    type="text" 
                    className="form-control" 
                    style={{ marginTop: '10px' }}
                    placeholder="e.g. Golang, GraphQL, Rust"
                    value={otherSkillsText}
                    onChange={(e) => setOtherSkillsText(e.target.value)}
                  />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn btn-accent">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Past Work History Modal */}
      {isWorkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setIsWorkModalOpen(false)}>&times;</button>
            <h2 style={{ marginBottom: '20px' }}>Record Completed Project</h2>
            
            <form onSubmit={handleAddPastWork}>
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Analytics Portal Redesign"
                  required
                  value={workForm.project_name}
                  onChange={(e) => setWorkForm({ ...workForm, project_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Client / Employer Company</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Google Inc."
                  required
                  value={workForm.client_company}
                  onChange={(e) => setWorkForm({ ...workForm, client_company: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Project Term / Duration</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 3 Months"
                    required
                    value={workForm.duration}
                    onChange={(e) => setWorkForm({ ...workForm, duration: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Self Delivery Efficiency (%)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    max="100"
                    required
                    value={workForm.project_efficiency}
                    onChange={(e) => setWorkForm({ ...workForm, project_efficiency: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Milestones achieved & Duties performed</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  placeholder="Brief summary of what you delivered..."
                  required
                  value={workForm.description}
                  onChange={(e) => setWorkForm({ ...workForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsWorkModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-accent">Publish Project Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px' }}>
            <button className="modal-close" onClick={() => setSelectedJob(null)}>&times;</button>
            
            <div className="profile-details-top" style={{ marginBottom: '24px' }}>
              <div className="profile-avatar" style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, var(--primary) 100%)' }}>
                🏢
              </div>
              <div>
                <h2>{selectedJob.title}</h2>
                <p style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedJob.recruiter_company}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Representative: {selectedJob.recruiter_name}</p>
              </div>
            </div>

            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <div className="stat-number">${selectedJob.budget}/hr</div>
                <div className="stat-label">Budget Cap</div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-number">{selectedJob.duration}</div>
                <div className="stat-label">Term</div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-number" style={{ color: 'var(--accent)' }}>{selectedJob.matchDetails?.score}%</div>
                <div className="stat-label">Match Score</div>
              </div>
            </div>

            {selectedJob.matchDetails && (
              <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', borderLeft: '4px solid var(--secondary)' }}>
                <h4 style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span>Match Requirements Breakdown</span>
                  <span style={{ color: 'var(--secondary)' }}>Analysis Details</span>
                </h4>
                
                <div className="match-row">
                  <span style={{ width: '130px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Skills Match (50%):</span>
                  <div className="match-bar-bg">
                    <div className="match-bar-fill" style={{ width: `${selectedJob.matchDetails.skillMatchScore}%`, backgroundColor: 'var(--primary)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{Math.round(selectedJob.matchDetails.skillMatchScore)}%</span>
                </div>

                <div className="match-row">
                  <span style={{ width: '130px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rate Fit (30%):</span>
                  <div className="match-bar-bg">
                    <div className="match-bar-fill" style={{ width: `${selectedJob.matchDetails.rateFitScore}%`, backgroundColor: 'var(--secondary)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{Math.round(selectedJob.matchDetails.rateFitScore)}%</span>
                </div>

                <div className="match-row">
                  <span style={{ width: '130px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Experience (20%):</span>
                  <div className="match-bar-bg">
                    <div className="match-bar-fill" style={{ width: `${selectedJob.matchDetails.experienceScore}%`, backgroundColor: 'var(--warning)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{Math.round(selectedJob.matchDetails.experienceScore)}%</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '8px' }}>Project Details</h4>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.95rem' }}>{selectedJob.description}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedJob(null)}>Close</button>
              <button 
                className="btn btn-accent" 
                onClick={() => {
                  onOpenChat(selectedJob.recruiter_id, 'recruiter');
                  setSelectedJob(null);
                }}
              >
                💬 Apply & Message Recruiter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
