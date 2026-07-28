import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

// Helper: Normalize wage basis to hourly rate in USD
const getHourlyEquivalent = (amount, basis) => {
  switch (basis) {
    case 'Per Day': return amount / 8;
    case 'Weekly': return amount / 40;
    case 'Monthly': return amount / 160;
    case 'Yearly': return amount / 2000;
    default: return amount; // Hourly
  }
};

const getCurrencySymbol = (currency) => {
  switch (currency) {
    case 'EUR': return '€';
    case 'INR': return '₹';
    default: return '$';
  }
};

const getBasisLabel = (basis) => {
  switch (basis) {
    case 'Per Day': return 'day';
    case 'Weekly': return 'wk';
    case 'Monthly': return 'mo';
    case 'Yearly': return 'yr';
    default: return 'hr';
  }
};

export default function RecruiterDashboard({ currentRecruiterId, onOpenChat, compactCards, showEfficiencyChart, matchSorting }) {
  const [freelancers, setFreelancers] = useState([]);
  const [recruiterJobs, setRecruiterJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  
  // Filter States
  const [searchSkills, setSearchSkills] = useState('');
  const [minExp, setMinExp] = useState('');
  const [availability, setAvailability] = useState('All');
  
  // Advanced Wage & Currency Filters
  const [filterCurrency, setFilterCurrency] = useState('USD');
  const [filterWageBasis, setFilterWageBasis] = useState('Hourly');
  const [minWage, setMinWage] = useState('');
  const [maxWage, setMaxWage] = useState('');
  const [minProjects, setMinProjects] = useState('');
  
  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    budget: '',
    required_skills: '',
    duration: '3 Months'
  });
  
  const [selectedFreelancer, setSelectedFreelancer] = useState(null);
  const [freelancerHistory, setFreelancerHistory] = useState([]);

  // Load recruiter's jobs
  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs`);
      const data = await res.json();
      const filtered = data.filter(job => job.recruiter_id === parseInt(currentRecruiterId));
      setRecruiterJobs(filtered);
      if (filtered.length > 0 && !selectedJobId) {
        setSelectedJobId(filtered[0].id.toString());
      }
    } catch (e) {
      console.error('Error fetching jobs:', e);
    }
  };

  // Fetch freelancers with queries
  const sortFreelancers = (list) => {
    const sorted = [...list];
    if (matchSorting === 'experience') {
      sorted.sort((a, b) => b.experience_years - a.experience_years);
    } else if (matchSorting === 'wages') {
      sorted.sort((a, b) => getHourlyEquivalent(a.wage_amount, a.wage_basis) - getHourlyEquivalent(b.wage_amount, b.wage_basis));
    } else if (matchSorting === 'score') {
      sorted.sort((a, b) => (b.matchDetails?.score || 0) - (a.matchDetails?.score || 0));
    }
    return sorted;
  };

  // Fetch freelancers with queries
  const fetchFreelancers = async () => {
    try {
      let url = `${API_BASE}/freelancers?`;
      const params = new URLSearchParams();
      if (searchSkills) params.append('skills', searchSkills);
      if (minExp) params.append('minExp', minExp);
      if (availability !== 'All') params.append('availability', availability);
      if (filterCurrency) params.append('currency', filterCurrency);
      if (filterWageBasis) params.append('wageBasis', filterWageBasis);
      if (minWage) params.append('minWage', minWage);
      if (maxWage) params.append('maxWage', maxWage);
      if (minProjects) params.append('minProjects', minProjects);
      
      url += params.toString();

      if (selectedJobId) {
        const matchRes = await fetch(`${API_BASE}/matches/freelancers-for-job/${selectedJobId}`);
        const matchedData = await matchRes.json();
        
        // Frontend filtering overrides
        let filteredMatches = matchedData;
        if (minExp) filteredMatches = filteredMatches.filter(f => f.experience_years >= parseInt(minExp));
        if (availability !== 'All') filteredMatches = filteredMatches.filter(f => f.availability === availability);
        if (minProjects) filteredMatches = filteredMatches.filter(f => f.completed_projects >= parseInt(minProjects));
        if (searchSkills) {
          const searchArr = searchSkills.split(',').map(s => s.trim().toLowerCase());
          filteredMatches = filteredMatches.filter(f => {
            const fSkills = JSON.parse(f.skills || '[]').map(s => s.toLowerCase());
            return searchArr.every(s => fSkills.includes(s));
          });
        }
        if ((minWage && minWage.trim() !== '') || (maxWage && maxWage.trim() !== '')) {
          filteredMatches = filteredMatches.filter(f => {
            const hourlyUSD = getHourlyEquivalent(f.wage_amount, f.wage_basis);
            let usdInSelectedBasis = hourlyUSD;
            switch (filterWageBasis) {
              case 'Per Day': usdInSelectedBasis = hourlyUSD * 8; break;
              case 'Weekly': usdInSelectedBasis = hourlyUSD * 40; break;
              case 'Monthly': usdInSelectedBasis = hourlyUSD * 160; break;
              case 'Yearly': usdInSelectedBasis = hourlyUSD * 2000; break;
            }
            let rate = 1.0;
            if (filterCurrency === 'EUR') rate = 0.92;
            else if (filterCurrency === 'INR') rate = 85.0;

            const convertedWage = usdInSelectedBasis * rate;
            if (minWage && minWage.trim() !== '' && convertedWage < parseFloat(minWage)) return false;
            if (maxWage && maxWage.trim() !== '' && convertedWage > parseFloat(maxWage)) return false;
            return true;
          });
        }
        
        setFreelancers(sortFreelancers(filteredMatches));
      } else {
        const res = await fetch(url);
        const data = await res.json();
        setFreelancers(sortFreelancers(data));
      }
    } catch (e) {
      console.error('Error fetching freelancers:', e);
    }
  };

  // Fetch past work history when a freelancer is selected
  const fetchFreelancerHistory = async (freelancerId) => {
    try {
      const res = await fetch(`${API_BASE}/freelancers/${freelancerId}/past-work`);
      const data = await res.json();
      setFreelancerHistory(data);
    } catch (e) {
      console.error('Error fetching past work:', e);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [currentRecruiterId]);

  useEffect(() => {
    fetchFreelancers();
  }, [selectedJobId, searchSkills, minExp, availability, filterCurrency, filterWageBasis, minWage, maxWage, minProjects, matchSorting]);

  useEffect(() => {
    if (selectedFreelancer) {
      fetchFreelancerHistory(selectedFreelancer.id);
    } else {
      setFreelancerHistory([]);
    }
  }, [selectedFreelancer]);

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.budget || !newJob.required_skills) return;

    try {
      const skillsArray = newJob.required_skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const res = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newJob.title,
          description: newJob.description,
          budget: parseFloat(newJob.budget),
          required_skills: skillsArray,
          duration: newJob.duration,
          recruiter_id: currentRecruiterId
        })
      });

      if (res.ok) {
        const created = await res.json();
        setIsJobModalOpen(false);
        setNewJob({ title: '', description: '', budget: '', required_skills: '', duration: '3 Months' });
        await fetchJobs();
        setSelectedJobId(created.id.toString());
      }
    } catch (e) {
      console.error('Error posting job:', e);
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

  // Helper: Display converted wage beside native wage
  const getWageDisplay = (f) => {
    const hourlyUSD = getHourlyEquivalent(f.wage_amount, f.wage_basis);
    let usdInSelectedBasis = hourlyUSD;
    switch (filterWageBasis) {
      case 'Per Day': usdInSelectedBasis = hourlyUSD * 8; break;
      case 'Weekly': usdInSelectedBasis = hourlyUSD * 40; break;
      case 'Monthly': usdInSelectedBasis = hourlyUSD * 160; break;
      case 'Yearly': usdInSelectedBasis = hourlyUSD * 2000; break;
    }
    
    let rate = 1.0;
    if (filterCurrency === 'EUR') rate = 0.92;
    else if (filterCurrency === 'INR') rate = 85.0;

    const convertedWage = usdInSelectedBasis * rate;
    const formattedConverted = `${getCurrencySymbol(filterCurrency)}${Math.round(convertedWage)}/${getBasisLabel(filterWageBasis)}`;
    const formattedNative = `$${f.wage_amount}/${getBasisLabel(f.wage_basis)}`;

    if (filterCurrency !== 'USD' || filterWageBasis !== 'Hourly') {
      return `${formattedConverted} (${formattedNative})`;
    }
    return formattedNative;
  };

  return (
    <div className="dashboard-grid">
      {/* Sidebar Filters */}
      <div className="sidebar-panel glass-panel" style={{ padding: '24px' }}>
        <h3>Find Talent</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Select one of your jobs to activate the smart matching engine.
        </p>

        <div className="form-group">
          <label>Compare against Job</label>
          <select 
            className="form-control" 
            value={selectedJobId} 
            onChange={(e) => setSelectedJobId(e.target.value)}
          >
            <option value="">-- No Smart Match (Show All) --</option>
            {recruiterJobs.map(job => (
              <option key={job.id} value={job.id}>{job.title} (${job.budget}/hr)</option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setIsJobModalOpen(true)}>
          + Post New Job
        </button>

        <hr style={{ border: '0', borderTop: '1px solid var(--border-light)', margin: '10px 0' }} />

        <h4>Filter Candidates</h4>

        <div className="form-group">
          <label>Skills Required (comma separated)</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="e.g. React, Node.js"
            value={searchSkills}
            onChange={(e) => setSearchSkills(e.target.value)}
          />
        </div>

        {/* Currency & Wages Ranges Filters */}
        <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', padding: '12px', marginBottom: '15px' }}>
          <h5 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary)', marginBottom: '8px' }}>Wages Filter</h5>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '0.75rem' }}>Currency</label>
              <select className="form-control" value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '0.75rem' }}>Wage Basis</label>
              <select className="form-control" value={filterWageBasis} onChange={(e) => setFilterWageBasis(e.target.value)}>
                <option value="Hourly">Hourly</option>
                <option value="Per Day">Per Day</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '0.75rem' }}>Min Wage</label>
              <input type="number" className="form-control" placeholder="Min" value={minWage} onChange={(e) => setMinWage(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '0' }}>
              <label style={{ fontSize: '0.75rem' }}>Max Wage</label>
              <input type="number" className="form-control" placeholder="Max" value={maxWage} onChange={(e) => setMaxWage(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Experience & Projects Completed Ranges */}
        <div style={{ border: '1px solid var(--border-light)', borderRadius: '10px', padding: '12px', marginBottom: '15px' }}>
          <h5 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--secondary)', marginBottom: '8px' }}>Experience Scope</h5>
          
          <div className="form-group" style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '0.75rem' }}>Min Projects Completed</label>
            <input 
              type="number" 
              className="form-control" 
              placeholder="e.g. 2"
              value={minProjects}
              onChange={(e) => setMinProjects(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0' }}>
            <label style={{ fontSize: '0.75rem' }}>Min Experience (Years)</label>
            <input 
              type="number" 
              className="form-control" 
              placeholder="e.g. 5"
              value={minExp}
              onChange={(e) => setMinExp(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Availability</label>
          <select 
            className="form-control"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option value="All">All Availabilities</option>
            <option value="Immediate">Immediate</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Main Freelancers Feed */}
      <div className="feed-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Matched Freelancers</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              {selectedJobId 
                ? `Showing candidates prioritized by match score for "${recruiterJobs.find(j => j.id.toString() === selectedJobId)?.title}"`
                : 'Showing all active freelancers.'}
            </p>
          </div>
          <span className="badge badge-skill">{freelancers.length} Candidates Found</span>
        </div>

        {freelancers.length === 0 ? (
          <div className="glass-panel empty-state">
            <h3>No freelancers found matching these criteria</h3>
            <p>Try broadening your filter parameters or posting another requirement.</p>
          </div>
        ) : (
          <div className="card-grid">
            {freelancers.map(freelancer => {
              const skillsArray = JSON.parse(freelancer.skills || '[]');
              const hasMatchScore = selectedJobId && freelancer.matchDetails;
              const hasRecruiterHistory = freelancer.completed_projects > 0;
              
              return (
                <div 
                  key={freelancer.id} 
                  className={`glass-panel glass-panel-interactive item-card ${compactCards ? 'compact-card' : ''}`}
                  style={{ '--card-accent': hasMatchScore ? (freelancer.matchDetails.score >= 80 ? 'var(--accent)' : 'var(--primary)') : 'var(--border-light)' }}
                >
                  <div>
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">{freelancer.name}</h3>
                        <span className="card-subtitle">{freelancer.title}</span>
                      </div>
                      
                      {hasMatchScore && (
                        <div className={`match-circle ${getMatchScoreClass(freelancer.matchDetails.score)}`}>
                          {freelancer.matchDetails.score}%
                        </div>
                      )}
                    </div>

                    {/* Efficiency & Project Badge Rows */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {hasRecruiterHistory ? (
                        <>
                          <span className="badge badge-match-high" style={{ background: 'rgba(6, 182, 212, 0.12)', color: 'var(--secondary)' }}>
                            ⚡ {freelancer.efficiency_rating}% Efficiency
                          </span>
                          <span className="badge badge-skill" style={{ border: '1px solid var(--border-light)' }}>
                            📂 {freelancer.completed_projects} Project{freelancer.completed_projects === 1 ? '' : 's'}
                          </span>
                        </>
                      ) : (
                        <span className="badge badge-match-medium" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--accent)' }}>
                          🟢 New Freelancer
                        </span>
                      )}
                    </div>

                    <p className="card-body">
                      {freelancer.bio ? freelancer.bio.substring(0, 120) + '...' : 'No bio available.'}
                    </p>

                    <div className="skills-wrapper">
                      {skillsArray.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="badge badge-skill">{skill}</span>
                      ))}
                      {skillsArray.length > 4 && (
                        <span className="badge badge-skill">+{skillsArray.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="footer-info">
                      <span className="info-label">Wages / Experience</span>
                      <span className="info-value" style={{ fontSize: '0.9rem' }}>
                        {getWageDisplay(freelancer)} • {freelancer.experience_years} yrs
                      </span>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setSelectedFreelancer(freelancer)}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Job Poster Modal */}
      {isJobModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <button className="modal-close" onClick={() => setIsJobModalOpen(false)}>&times;</button>
            <h2 style={{ marginBottom: '20px' }}>Post a New Project</h2>
            
            <form onSubmit={handlePostJob}>
              <div className="form-group">
                <label>Job Title</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Lead React Developer"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  placeholder="Describe the duties, stack, and project goals..."
                  required
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label>Max Budget ($/hr)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="e.g. 95"
                    required
                    value={newJob.budget}
                    onChange={(e) => setNewJob({ ...newJob, budget: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <select 
                    className="form-control"
                    value={newJob.duration}
                    onChange={(e) => setNewJob({ ...newJob, duration: e.target.value })}
                  >
                    <option value="1 Month">1 Month</option>
                    <option value="3 Months">3 Months</option>
                    <option value="6 Months">6 Months</option>
                    <option value="12 Months">12 Months</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Required Skills (comma separated)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="React, CSS, TypeScript"
                  required
                  value={newJob.required_skills}
                  onChange={(e) => setNewJob({ ...newJob, required_skills: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsJobModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Publish Project</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Freelancer Profile Details Modal */}
      {selectedFreelancer && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px' }}>
            <button className="modal-close" onClick={() => setSelectedFreelancer(null)}>&times;</button>
            
            <div className="profile-details-top" style={{ marginBottom: '24px' }}>
              <div className="profile-avatar">
                {selectedFreelancer.name.charAt(0)}
              </div>
              <div>
                <h2>{selectedFreelancer.name}</h2>
                <p style={{ color: 'var(--secondary)', fontWeight: 600 }}>{selectedFreelancer.title}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rating: ⭐ {selectedFreelancer.rating || '5.0'} / 5.0</p>
              </div>
            </div>

            {/* Overall Efficiency Progress Indicator */}
            <div className="efficiency-gauge">
              <div className="gauge-header">
                <strong>Project Delivery Efficiency</strong>
                <span style={{ color: getEfficiencyColor(selectedFreelancer.completed_projects === 0 ? 90 : selectedFreelancer.efficiency_rating), fontWeight: 700 }}>
                  {selectedFreelancer.completed_projects === 0 ? '90% (System Average)' : `${selectedFreelancer.efficiency_rating}%`}
                </span>
              </div>
              <div className="gauge-bar-container">
                <div 
                  className="gauge-bar-fill" 
                  style={{ width: `${selectedFreelancer.completed_projects === 0 ? 90 : selectedFreelancer.efficiency_rating}%`, backgroundColor: getEfficiencyColor(selectedFreelancer.completed_projects === 0 ? 90 : selectedFreelancer.efficiency_rating) }}
                ></div>
              </div>
              <div className="gauge-summary" style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {selectedFreelancer.completed_projects === 0 
                  ? '🟢 New Freelancer - No client history documented yet. Overall efficiency calculated based on system average.'
                  : 'Calculated on past performance, timeliness of delivery, and client satisfaction marks.'}
              </div>
            </div>

            {/* Visual Project Efficiency Comparison Chart */}
            {showEfficiencyChart && freelancerHistory.length > 0 && (
              <div className="efficiency-chart-container" style={{ marginBottom: '24px' }}>
                <h4 style={{ marginBottom: '4px' }}>Project Delivery Efficiency Analytics</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Comparing the quality/delivery scores of completed project milestones.
                </p>
                <div className="chart-bars-wrapper">
                  {freelancerHistory.map((work) => {
                    const heightPct = `${work.project_efficiency}%`;
                    return (
                      <div className="chart-column" key={work.id}>
                        <div 
                          className="chart-bar" 
                          style={{ height: heightPct }}
                        >
                          <span className="chart-tooltip">
                            {work.project_efficiency}% Efficiency
                          </span>
                        </div>
                        <div className="chart-label" title={work.project_name}>
                          {work.project_name}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                  Hover over bars to inspect individual project ratings.
                </p>
              </div>
            )}

            <div className="stats-grid">
              <div className="glass-panel stat-card">
                <div className="stat-number" style={{ fontSize: '1.4rem' }}>
                  {getCurrencySymbol(filterCurrency)}{Math.round(getHourlyEquivalent(selectedFreelancer.wage_amount, selectedFreelancer.wage_basis) * (filterCurrency === 'EUR' ? 0.92 : filterCurrency === 'INR' ? 85.0 : 1.0))}/hr
                </div>
                <div className="stat-label">Hourly Rate Eq.</div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-number">{selectedFreelancer.experience_years} yrs</div>
                <div className="stat-label">Experience</div>
              </div>
              <div className="glass-panel stat-card">
                <div className="stat-number" style={{ fontSize: '1.25rem', padding: '5px 0' }}>{selectedFreelancer.availability}</div>
                <div className="stat-label">Availability</div>
              </div>
            </div>

            {selectedJobId && selectedFreelancer.matchDetails && (
              <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', borderLeft: '4px solid var(--accent)' }}>
                <h4 style={{ display: 'flex', justifycontent: 'space-between', marginBottom: '12px' }}>
                  <span>Matching Score Analysis</span>
                  <span style={{ color: 'var(--accent)' }}>{selectedFreelancer.matchDetails.score}% Match</span>
                </h4>
                
                <div className="match-row">
                  <span style={{ width: '130px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Skills Match (50%):</span>
                  <div className="match-bar-bg">
                    <div className="match-bar-fill" style={{ width: `${selectedFreelancer.matchDetails.skillMatchScore}%`, backgroundColor: 'var(--primary)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{Math.round(selectedFreelancer.matchDetails.skillMatchScore)}%</span>
                </div>

                <div className="match-row">
                  <span style={{ width: '130px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rate Fit (30%):</span>
                  <div className="match-bar-bg">
                    <div className="match-bar-fill" style={{ width: `${selectedFreelancer.matchDetails.rateFitScore}%`, backgroundColor: 'var(--secondary)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{Math.round(selectedFreelancer.matchDetails.rateFitScore)}%</span>
                </div>

                <div className="match-row">
                  <span style={{ width: '130px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Experience (20%):</span>
                  <div className="match-bar-bg">
                    <div className="match-bar-fill" style={{ width: `${selectedFreelancer.matchDetails.experienceScore}%`, backgroundColor: 'var(--warning)' }}></div>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{Math.round(selectedFreelancer.matchDetails.experienceScore)}%</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '8px' }}>About Candidate</h4>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.95rem' }}>{selectedFreelancer.bio}</p>
            </div>

            {/* Highlighted Skills Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '8px' }}>Skills & Technologies (Highlights)</h4>
              <div className="skills-wrapper">
                {JSON.parse(selectedFreelancer.skills || '[]').map((skill, idx) => {
                  const isMatching = selectedJobId && selectedFreelancer.matchDetails?.matchingSkills.includes(skill);
                  return (
                    <span 
                      key={idx} 
                      className={`badge ${isMatching ? 'badge-match-high' : 'badge-skill'}`} 
                      style={{ fontSize: '0.85rem', padding: '6px 12px', border: isMatching ? '1px solid var(--accent)' : '1px solid var(--border-light)' }}
                    >
                      {isMatching ? '✓ ' : ''}{skill}
                    </span>
                  );
                })}
                {selectedJobId && selectedFreelancer.matchDetails?.missingSkills.map((skill, idx) => (
                  <span 
                    key={`missing-${idx}`} 
                    className="badge badge-match-low" 
                    style={{ fontSize: '0.85rem', padding: '6px 12px', border: '1px solid var(--danger)' }}
                  >
                    ✗ {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Past Work History */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '12px' }}>Past Work History & Client Reviews</h4>
              {freelancerHistory.length === 0 ? (
                <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>No work records documented yet.</p>
              ) : (
                <div className="past-work-section">
                  {freelancerHistory.map(work => (
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
                          {work.project_efficiency}% Efficiency
                        </span>
                      </div>
                      <p className="past-work-desc">{work.description}</p>
                      <div className="past-work-footer">
                        <span>Duration: {work.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              {selectedFreelancer.portfolio_url ? (
                <a href={selectedFreelancer.portfolio_url} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'none', fontWeight: 500 }}>
                  🌐 Visit Portfolio Website
                </a>
              ) : <span />}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedFreelancer(null)}>Close</button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    onOpenChat(selectedFreelancer.id, 'freelancer');
                    setSelectedFreelancer(null);
                  }}
                >
                  💬 Start Conversation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
