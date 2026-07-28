const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper for running queries with Promises
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize tables and seed data
const initDb = async () => {
  try {
    // 1. Users table (for login credentials)
    await run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL, -- 'freelancer' or 'recruiter'
      profile_id INTEGER NOT NULL
    )`);

    // 2. Freelancers table with wage amount and wage basis
    await run(`CREATE TABLE IF NOT EXISTS freelancers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      bio TEXT,
      skills TEXT, -- JSON array of strings
      wage_amount REAL NOT NULL,
      wage_basis TEXT DEFAULT 'Hourly', -- 'Hourly', 'Per Day', 'Weekly', 'Monthly', 'Yearly'
      experience_years INTEGER NOT NULL,
      availability TEXT DEFAULT 'Immediate',
      rating REAL DEFAULT 5.0,
      efficiency_rating REAL DEFAULT 90.0, -- Default Efficiency Average
      portfolio_url TEXT
    )`);

    // 3. Recruiters table
    await run(`CREATE TABLE IF NOT EXISTS recruiters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      industry TEXT,
      bio TEXT
    )`);

    // 4. Past Work table (freelancer work history)
    await run(`CREATE TABLE IF NOT EXISTS past_work (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      freelancer_id INTEGER NOT NULL,
      project_name TEXT NOT NULL,
      client_company TEXT NOT NULL,
      duration TEXT NOT NULL,
      description TEXT NOT NULL,
      project_efficiency INTEGER NOT NULL, -- efficiency score for this project
      FOREIGN KEY (freelancer_id) REFERENCES freelancers(id)
    )`);

    // 5. Jobs table
    await run(`CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      budget REAL NOT NULL, -- hourly rate cap
      required_skills TEXT NOT NULL, -- JSON array of strings
      duration TEXT NOT NULL,
      recruiter_id INTEGER NOT NULL,
      FOREIGN KEY (recruiter_id) REFERENCES recruiters(id)
    )`);

    // 6. Messages table
    await run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL, -- 'freelancer' or 'recruiter'
      receiver_id INTEGER NOT NULL,
      receiver_role TEXT NOT NULL, -- 'freelancer' or 'recruiter'
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Check if table contains data, if not seed it
    const userCount = await get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      console.log('Seeding SkillConnect database with demo data...');

      // Seed freelancers with new wage structures
      await run(`INSERT INTO freelancers (name, title, bio, skills, wage_amount, wage_basis, experience_years, availability, rating, efficiency_rating, portfolio_url) VALUES 
        ('Alice Chen', 'Senior React Developer', 'Passionate front-end architect with 8 years of React expertise. Specializes in performance optimization, custom hook designs, and glassmorphic micro-animations.', '["React", "JavaScript", "CSS", "TypeScript", "Redux"]', 85.00, 'Hourly', 8, 'Immediate', 4.9, 98.0, 'https://alicechen.dev'),
        ('Bob Smith', 'Backend Engineer', 'Database and backend engineer focused on scalability, performance tuning, and robust security practices. Over 6 years of experience building solid API architectures.', '["Node.js", "Express", "SQL", "PostgreSQL", "Docker"]', 600.00, 'Per Day', 6, 'Part-Time', 4.8, 92.0, 'https://bobcodes.io'),
        ('Clara Lopez', 'UI/UX Engineer', 'Creating beautiful, pixel-perfect user interfaces with clean CSS layouts, SVG graphics, and interactive dashboard UI. Blends coding skills with design principles.', '["CSS", "Figma", "React", "HTML", "UI/UX"]', 2600.00, 'Weekly', 4, 'Immediate', 5.0, 96.0, 'https://claradesigns.com'),
        ('David Kim', 'Fullstack Cloud Architect', 'Versatile developer who builds enterprise-scale codebases from inception to deployment. Expert in cloud deployment, serverless backends, and modular frontends.', '["React", "Node.js", "TypeScript", "AWS", "SQL"]', 12000.00, 'Monthly', 10, 'Unavailable', 4.7, 89.0, 'https://davidkim.cloud'),
        ('Emma Watson', 'Junior Frontend Builder', 'Motivated junior developer eager to build highly interactive visual client applications. Fast learner with strong foundations in semantic HTML, clean CSS, and modern React design.', '["HTML", "CSS", "JavaScript", "React"]', 40.00, 'Hourly', 1, 'Immediate', 5.0, 90.0, '')
      `);

      // Seed past work for freelancers (Emma has none)
      await run(`INSERT INTO past_work (freelancer_id, project_name, client_company, duration, description, project_efficiency) VALUES 
        (1, 'Google Analytics Redesign', 'Google Inc.', '3 Months', 'Rewrote core client-facing dashboards to use modern React charts, reducing loading latency by 45%.', 98),
        (1, 'Fintech SaaS Portal', 'Apex Finance', '2 Months', 'Constructed secure multi-tenant client portals with live state updates and glassmorphic UI components.', 97),
        (2, 'Microservices API Migration', 'CloudCorp SaaS', '4 Months', 'Refactored a legacy API server monolith to lightweight scalable Node.js microservices.', 93),
        (2, 'Realtime Payment Web Gateway', 'PaySwift', '3 Months', 'Engineered custom secure webhook handling pipelines for low-latency transaction routing.', 91),
        (3, 'Creative Portfolio Builder UI', 'CreativeStudio', '2 Months', 'Designed and built accessible reusable HTML/CSS templates and Figma visual tokens.', 96),
        (4, 'Serverless Event Pipeline', 'LogiTech Solutions', '6 Months', 'Architected serverless databases and Lambda functions processing 10M+ daily events.', 89)
      `);

      // Seed recruiters
      await run(`INSERT INTO recruiters (name, company, industry, bio) VALUES 
        ('Sarah Jenkins', 'Google', 'Technology', 'Lead Talent Scout for Developer Tooling and Core Infrastructure teams. Passionate about linking high-agency builders with complex problems.'),
        ('Michael Vance', 'TechCorp Inc.', 'E-commerce & SaaS', 'Technical Product Manager looking for quick-turnaround software engineers to ship innovative MVP web apps.')
      `);

      // Seed users
      await run(`INSERT INTO users (username, password, role, profile_id) VALUES 
        ('alice', 'alice123', 'freelancer', 1),
        ('bob', 'bob123', 'freelancer', 2),
        ('clara', 'clara123', 'freelancer', 3),
        ('david', 'david123', 'freelancer', 4),
        ('emma', 'emma123', 'freelancer', 5),
        ('sarah', 'sarah123', 'recruiter', 1),
        ('michael', 'michael123', 'recruiter', 2)
      `);

      // Seed jobs
      await run(`INSERT INTO jobs (title, description, budget, required_skills, duration, recruiter_id) VALUES 
        ('React Frontend Expert', 'Looking for an advanced React developer to lead the rewrite of our dashboard using high-fidelity glassmorphism themes, responsive charts, and custom layouts.', 90.00, '["React", "CSS", "JavaScript"]', '3 Months', 1),
        ('Scalable Node.js Backend API Developer', 'Need a senior engineer to optimize our Express-based API backend and design migrations for our relational databases.', 80.00, '["Node.js", "Express", "SQL"]', '6 Months', 2),
        ('Fullstack Cloud Web Creator', 'Looking for a fullstack developer with AWS and TypeScript experience to build a secure SaaS client portal from scratch.', 120.00, '["React", "Node.js", "TypeScript", "SQL"]', '2 Months', 1)
      `);

      // Seed initial messages
      await run(`INSERT INTO messages (sender_id, sender_role, receiver_id, receiver_role, content, timestamp) VALUES 
        (1, 'recruiter', 1, 'freelancer', 'Hi Alice, I saw your past Google Analytics project and 98% efficiency rating. We have a position for a React Frontend Expert at Google. Are you free to chat?', datetime('now', '-2 hours')),
        (1, 'freelancer', 1, 'recruiter', 'Hi Sarah! Yes, I am absolutely interested. Dashboard optimization is one of my specialties. What details can you share?', datetime('now', '-1 hour')),
        (1, 'recruiter', 1, 'freelancer', 'Fantastic! It is a 3-month contract, fully remote. Let me send over the specifications.', datetime('now', '-45 minutes')),
        (2, 'recruiter', 2, 'freelancer', 'Hey Bob, we are looking for someone to optimize our Express API. Your profile fits our backend stack perfectly.', datetime('now', '-10 minutes'))
      `);

      console.log('Database seeded successfully.');
    }
  } catch (err) {
    console.error('Error during database initialization:', err);
  }
};

module.exports = {
  db,
  run,
  all,
  get,
  initDb
};
