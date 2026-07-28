const jobs = [
  { title: 'Senior React Developer', company: 'Northstar Labs', location: 'Remote', pay: '$90/hr' },
  { title: 'AI Product Designer', company: 'Nova Studio', location: 'New York', pay: '$75/hr' },
  { title: 'Full Stack Engineer', company: 'BrightPath', location: 'Hybrid', pay: '$85/hr' }
];

const freelancers = [
  { name: 'Ava Chen', role: 'Frontend Engineer', skill: 'React, Accessibility' },
  { name: 'Marcus Lee', role: 'Product Designer', skill: 'UI Systems, Figma' },
  { name: 'Priya Shah', role: 'Data Engineer', skill: 'Python, Azure' }
];

const app = document.getElementById('app');
app.innerHTML = `
  <div class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">SkillConnect</p>
        <h1>Find the right freelance talent faster.</h1>
        <p class="hero-copy">Recruiters and freelancers can discover opportunities, collaborate smoothly, and grow together.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#jobs">Explore jobs</a>
          <a class="btn secondary" href="#freelancers">Meet freelancers</a>
        </div>
      </div>
      <div class="hero-card">
        <h3>Live platform stats</h3>
        <div class="stats-grid">
          <div><strong>24</strong><span>Open jobs</span></div>
          <div><strong>128</strong><span>Freelancers</span></div>
          <div><strong>97</strong><span>Matches</span></div>
        </div>
      </div>
    </header>

    <main>
      <section id="jobs" class="section">
        <div class="section-title">
          <h2>Featured opportunities</h2>
          <p>High-signal roles curated for fast-moving teams.</p>
        </div>
        <div class="card-grid">
          ${jobs.map((job) => `
            <article class="card">
              <h3>${job.title}</h3>
              <p>${job.company}</p>
              <span>${job.location}</span>
              <strong>${job.pay}</strong>
            </article>
          `).join('')}
        </div>
      </section>

      <section id="freelancers" class="section">
        <div class="section-title">
          <h2>Top freelancers</h2>
          <p>Trusted specialists ready for your next sprint.</p>
        </div>
        <div class="card-grid">
          ${freelancers.map((person) => `
            <article class="card">
              <h3>${person.name}</h3>
              <p>${person.role}</p>
              <span>${person.skill}</span>
            </article>
          `).join('')}
        </div>
      </section>
    </main>
  </div>
`;
