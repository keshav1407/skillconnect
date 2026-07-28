const express = require('express');
const cors = require('cors');
const { db, initDb, all, run, get } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Database on startup
initDb().then(() => {
  console.log('SkillConnect database initialized.');
});

// Helper: Normalize wage basis to hourly rate in USD
function getHourlyEquivalent(amount, basis) {
  switch (basis) {
    case 'Per Day': return amount / 8;
    case 'Weekly': return amount / 40;
    case 'Monthly': return amount / 160;
    case 'Yearly': return amount / 2000;
    default: return amount; // Hourly
  }
}

// Helper: Calculate Match Score
function calculateMatchScore(freelancer, job) {
  let requiredSkills = [];
  let freelancerSkills = [];

  try {
    requiredSkills = JSON.parse(job.required_skills || '[]');
  } catch (e) {
    requiredSkills = [];
  }

  try {
    freelancerSkills = JSON.parse(freelancer.skills || '[]');
  } catch (e) {
    freelancerSkills = [];
  }

  // 1. Skill Match Score (50%)
  let skillMatchScore = 100;
  let matchingSkills = [];
  let missingSkills = [];

  if (requiredSkills.length > 0) {
    const freeSkillsLower = freelancerSkills.map(s => s.toLowerCase());
    requiredSkills.forEach(reqSkill => {
      if (freeSkillsLower.includes(reqSkill.toLowerCase())) {
        matchingSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    });
    skillMatchScore = (matchingSkills.length / requiredSkills.length) * 100;
  }

  // 2. Rate Fit Score (30%) - Convert freelancer rate to hourly USD equivalent
  let rateFitScore = 100;
  const freelancerHourly = getHourlyEquivalent(freelancer.wage_amount, freelancer.wage_basis);
  if (freelancerHourly > job.budget) {
    const diff = freelancerHourly - job.budget;
    const penaltyPct = (diff / job.budget) * 100;
    rateFitScore = Math.max(0, 100 - penaltyPct * 2);
  }

  // 3. Experience Match Score (20%)
  let expScore = Math.min((freelancer.experience_years / 10) * 100, 100);

  // Total Weighted Score
  const totalScore = Math.round(
    (skillMatchScore * 0.5) +
    (rateFitScore * 0.3) +
    (expScore * 0.2)
  );

  return {
    score: totalScore,
    skillMatchScore,
    rateFitScore,
    experienceScore: expScore,
    matchingSkills,
    missingSkills
  };
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        profile_id: user.profile_id
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role, name, title, company } = req.body;
  
  if (!username || !password || !role || !name) {
    return res.status(400).json({ error: 'Username, password, role, and name are required' });
  }

  try {
    // Check if username exists
    const existingUser = await get('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken' });
    }

    let profileId = 0;

    if (role === 'freelancer') {
      // Create Freelancer profile
      const result = await run(
        `INSERT INTO freelancers (name, title, bio, skills, wage_amount, wage_basis, experience_years, availability, rating, efficiency_rating, portfolio_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name, 
          title || 'Freelancer', 
          'New SkillConnect freelancer profile.', 
          '[]', 
          45.00, // default rate amount
          'Hourly', // default rate basis
          1,     // default experience years
          'Immediate', 
          5.0, 
          90.0,  // default system efficiency
          ''
        ]
      );
      profileId = result.id;
    } else {
      // Create Recruiter profile
      const result = await run(
        `INSERT INTO recruiters (name, company, industry, bio) VALUES (?, ?, ?, ?)`,
        [name, company || 'Independent', 'General', 'Technical recruiter on SkillConnect.']
      );
      profileId = result.id;
    }

    // Insert user credentials
    const userResult = await run(
      `INSERT INTO users (username, password, role, profile_id) VALUES (?, ?, ?, ?)`,
      [username, password, role, profileId]
    );

    res.json({
      success: true,
      user: {
        id: userResult.id,
        username,
        role,
        profile_id: profileId
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 2. FREELANCER ENDPOINTS
// ==========================================

app.get('/api/freelancers', async (req, res) => {
  try {
    const { skills, minExp, availability, currency, wageBasis, minWage, maxWage, minProjects } = req.query;
    
    let query = 'SELECT f.*, (SELECT COUNT(*) FROM past_work WHERE freelancer_id = f.id) as completed_projects FROM freelancers f WHERE 1=1';
    const params = [];

    if (minExp) {
      query += ' AND f.experience_years >= ?';
      params.push(parseInt(minExp));
    }
    if (availability && availability !== 'All') {
      query += ' AND f.availability = ?';
      params.push(availability);
    }

    let freelancers = await all(query, params);

    // Apply currency and wage basis conversion filtering in JS
    if (minWage || maxWage) {
      const selectedCurrency = currency || 'USD';
      const selectedBasis = wageBasis || 'Hourly';
      
      freelancers = freelancers.filter(f => {
        // Convert freelancer's rate to hourly USD equivalent
        const hourlyUSD = getHourlyEquivalent(f.wage_amount, f.wage_basis);
        
        // Convert hourly USD to recruiter's selected basis in USD
        let usdInSelectedBasis = hourlyUSD;
        switch (selectedBasis) {
          case 'Per Day': usdInSelectedBasis = hourlyUSD * 8; break;
          case 'Weekly': usdInSelectedBasis = hourlyUSD * 40; break;
          case 'Monthly': usdInSelectedBasis = hourlyUSD * 160; break;
          case 'Yearly': usdInSelectedBasis = hourlyUSD * 2000; break;
        }

        // Convert USD in selected basis to selected currency amount
        let rate = 1.0;
        if (selectedCurrency === 'EUR') rate = 0.92;
        else if (selectedCurrency === 'INR') rate = 85.0;

        const convertedWage = usdInSelectedBasis * rate;

        if (minWage && convertedWage < parseFloat(minWage)) return false;
        if (maxWage && convertedWage > parseFloat(maxWage)) return false;
        return true;
      });
    }

    // Filter by completed project count bounds
    if (minProjects) {
      freelancers = freelancers.filter(f => f.completed_projects >= parseInt(minProjects));
    }

    // Filter by skills
    if (skills) {
      const searchSkills = skills.split(',').map(s => s.trim().toLowerCase());
      freelancers = freelancers.filter(f => {
        try {
          const fSkills = JSON.parse(f.skills || '[]').map(s => s.toLowerCase());
          return searchSkills.every(reqSkill => fSkills.includes(reqSkill));
        } catch (e) {
          return false;
        }
      });
    }

    res.json(freelancers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/freelancers/:id', async (req, res) => {
  try {
    const freelancer = await get('SELECT * FROM freelancers WHERE id = ?', [req.params.id]);
    if (!freelancer) return res.status(404).json({ error: 'Freelancer profile not found' });
    res.json(freelancer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/freelancers', async (req, res) => {
  const { id, name, title, bio, skills, wage_amount, wage_basis, experience_years, availability, efficiency_rating, portfolio_url } = req.body;
  try {
    const skillsString = Array.isArray(skills) ? JSON.stringify(skills) : skills;
    await run(
      `UPDATE freelancers 
       SET name = ?, title = ?, bio = ?, skills = ?, wage_amount = ?, wage_basis = ?, experience_years = ?, availability = ?, efficiency_rating = ?, portfolio_url = ? 
       WHERE id = ?`,
      [name, title, bio, skillsString, wage_amount, wage_basis, experience_years, availability, efficiency_rating || 90.0, portfolio_url, id]
    );
    res.json({ success: true, message: 'Profile updated successfully', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Past Work History Endpoints
app.get('/api/freelancers/:id/past-work', async (req, res) => {
  try {
    const history = await all('SELECT * FROM past_work WHERE freelancer_id = ? ORDER BY id DESC', [req.params.id]);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/freelancers/:id/past-work', async (req, res) => {
  const { project_name, client_company, duration, description, project_efficiency } = req.body;
  const freelancer_id = req.params.id;

  if (!project_name || !client_company || !duration || !description || !project_efficiency) {
    return res.status(400).json({ error: 'All past work details are required' });
  }

  try {
    // Add work history record
    const result = await run(
      `INSERT INTO past_work (freelancer_id, project_name, client_company, duration, description, project_efficiency) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [freelancer_id, project_name, client_company, duration, description, parseInt(project_efficiency)]
    );

    // Re-calculate and update global efficiency rating for the freelancer
    const allWorks = await all('SELECT project_efficiency FROM past_work WHERE freelancer_id = ?', [freelancer_id]);
    if (allWorks.length > 0) {
      const sum = allWorks.reduce((acc, curr) => acc + curr.project_efficiency, 0);
      const newAverage = parseFloat((sum / allWorks.length).toFixed(1));
      
      await run('UPDATE freelancers SET efficiency_rating = ? WHERE id = ?', [newAverage, freelancer_id]);
    }

    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 3. RECRUITER & JOB ENDPOINTS
// ==========================================

app.get('/api/recruiters', async (req, res) => {
  try {
    const recruiters = await all('SELECT * FROM recruiters');
    res.json(recruiters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await all(`
      SELECT jobs.*, recruiters.name as recruiter_name, recruiters.company as recruiter_company 
      FROM jobs 
      JOIN recruiters ON jobs.recruiter_id = recruiters.id
    `);
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', async (req, res) => {
  const { title, description, budget, required_skills, duration, recruiter_id } = req.body;
  try {
    const skillsString = Array.isArray(required_skills) ? JSON.stringify(required_skills) : required_skills;
    const result = await run(
      `INSERT INTO jobs (title, description, budget, required_skills, duration, recruiter_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, budget, skillsString, duration, recruiter_id]
    );
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 4. MATCHING ENGINE ENDPOINTS
// ==========================================

app.get('/api/matches/jobs-for-freelancer/:freelancerId', async (req, res) => {
  try {
    const freelancer = await get('SELECT * FROM freelancers WHERE id = ?', [req.params.freelancerId]);
    if (!freelancer) return res.status(404).json({ error: 'Freelancer profile not found' });

    const jobs = await all(`
      SELECT jobs.*, recruiters.name as recruiter_name, recruiters.company as recruiter_company 
      FROM jobs 
      JOIN recruiters ON jobs.recruiter_id = recruiters.id
    `);

    const matchedJobs = jobs.map(job => {
      const matchDetails = calculateMatchScore(freelancer, job);
      return {
        ...job,
        matchDetails
      };
    }).sort((a, b) => b.matchDetails.score - a.matchDetails.score);

    res.json(matchedJobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/matches/freelancers-for-job/:jobId', async (req, res) => {
  try {
    const job = await get('SELECT * FROM jobs WHERE id = ?', [req.params.jobId]);
    if (!job) return res.status(404).json({ error: 'Job requirement not found' });

    const freelancers = await all('SELECT f.*, (SELECT COUNT(*) FROM past_work WHERE freelancer_id = f.id) as completed_projects FROM freelancers f');

    const matchedFreelancers = freelancers.map(freelancer => {
      const matchDetails = calculateMatchScore(freelancer, job);
      return {
        ...freelancer,
        matchDetails
      };
    }).sort((a, b) => b.matchDetails.score - a.matchDetails.score);

    res.json(matchedFreelancers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ==========================================
// 5. MESSAGE ENDPOINTS (CHAT SYSTEM)
// ==========================================

app.get('/api/messages', async (req, res) => {
  const { freelancer_id, recruiter_id } = req.query;
  if (!freelancer_id || !recruiter_id) {
    return res.status(400).json({ error: 'freelancer_id and recruiter_id are required' });
  }
  try {
    const messages = await all(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND sender_role = 'freelancer' AND receiver_id = ? AND receiver_role = 'recruiter')
         OR (sender_id = ? AND sender_role = 'recruiter' AND receiver_id = ? AND receiver_role = 'freelancer')
      ORDER BY timestamp ASC
    `, [freelancer_id, recruiter_id, recruiter_id, freelancer_id]);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/partners', async (req, res) => {
  const { id, role } = req.query;
  if (!id || !role) {
    return res.status(400).json({ error: 'id and role are required' });
  }
  try {
    let sql = '';
    if (role === 'freelancer') {
      sql = `
        SELECT DISTINCT r.id, r.name, r.company, r.bio,
        (SELECT content FROM messages 
         WHERE (sender_id = r.id AND sender_role = 'recruiter' AND receiver_id = ? AND receiver_role = 'freelancer')
            OR (sender_id = ? AND sender_role = 'freelancer' AND receiver_id = r.id AND receiver_role = 'recruiter')
         ORDER BY timestamp DESC LIMIT 1) as last_message,
        (SELECT timestamp FROM messages 
         WHERE (sender_id = r.id AND sender_role = 'recruiter' AND receiver_id = ? AND receiver_role = 'freelancer')
            OR (sender_id = ? AND sender_role = 'freelancer' AND receiver_id = r.id AND receiver_role = 'recruiter')
         ORDER BY timestamp DESC LIMIT 1) as last_timestamp
        FROM recruiters r
        JOIN messages m ON (m.sender_id = r.id AND m.sender_role = 'recruiter' AND m.receiver_id = ? AND m.receiver_role = 'freelancer')
                        OR (m.sender_id = ? AND m.sender_role = 'freelancer' AND m.receiver_id = r.id AND m.receiver_role = 'recruiter')
      `;
      const partners = await all(sql, [id, id, id, id, id, id]);
      res.json(partners);
    } else {
      sql = `
        SELECT DISTINCT f.id, f.name, f.title, f.bio,
        (SELECT content FROM messages 
         WHERE (sender_id = f.id AND sender_role = 'freelancer' AND receiver_id = ? AND receiver_role = 'recruiter')
            OR (sender_id = ? AND sender_role = 'recruiter' AND receiver_id = f.id AND receiver_role = 'freelancer')
         ORDER BY timestamp DESC LIMIT 1) as last_message,
        (SELECT timestamp FROM messages 
         WHERE (sender_id = f.id AND sender_role = 'freelancer' AND receiver_id = ? AND receiver_role = 'recruiter')
            OR (sender_id = ? AND sender_role = 'recruiter' AND receiver_id = f.id AND receiver_role = 'freelancer')
         ORDER BY timestamp DESC LIMIT 1) as last_timestamp
        FROM freelancers f
        JOIN messages m ON (m.sender_id = f.id AND m.sender_role = 'freelancer' AND m.receiver_id = ? AND m.receiver_role = 'recruiter')
                        OR (m.sender_id = ? AND m.sender_role = 'recruiter' AND m.receiver_id = f.id AND m.receiver_role = 'freelancer')
      `;
      const partners = await all(sql, [id, id, id, id, id, id]);
      res.json(partners);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  const { sender_id, sender_role, receiver_id, receiver_role, content } = req.body;
  if (!sender_id || !sender_role || !receiver_id || !receiver_role || !content) {
    return res.status(400).json({ error: 'All message parameters are required' });
  }
  try {
    const result = await run(
      `INSERT INTO messages (sender_id, sender_role, receiver_id, receiver_role, content) VALUES (?, ?, ?, ?, ?)`,
      [sender_id, sender_role, receiver_id, receiver_role, content]
    );
    res.json({ success: true, id: result.id, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SkillConnect Backend running on http://localhost:${PORT}`);
});
