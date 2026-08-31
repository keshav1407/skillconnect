# SkillConnect Matching Platform 🤝

SkillConnect is a premium, full-stack matching platform designed to connect **Recruiters** and **Freelancers** based on skill alignment, wages, experience, and project metrics.

Featuring a modern Glassmorphism dark/light interface, real-time messaging, and high-signal match scoring, SkillConnect makes it easy to hire or find contracts.


---

## 🚀 Key Features

* **Dual-role Authentication**: Users register as either a Freelancer or a Recruiter with custom-tailored profile setup fields.
* **Smart Match Scoring**: Automatic calculation of a match score (0-100%) between published job requirements and candidate skills.
* **Advanced Filters**: Recruiters can filter candidates by customized wage ranges (hourly, weekly, monthly, yearly), currency bases (USD, EUR, INR), min projects completed, and experience years.
* **Custom Appearance Controls**: Toggle between standard/compact card feeds, show/hide analytics charts, and switch themes (Dark/Light).
* **Live Chat Messaging**: Real-time communication inbox between recruiters and matched candidates.
* **Delivery Efficiency Graphs**: Visually check delivery satisfaction percentages on freelancer profiles based on previous employer reviews.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), CSS Custom Properties, Vanilla Glassmorphic Styles.
* **Backend**: Python Django, Django REST style views, CORS Headers.
* **Database**: SQLite (built-in and seeded).

---

## 📦 Local Installation & Setup

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **Python** (v3.10+) installed.

### 2. Backend (Django)
1. Navigate to the root directory.
2. Install Python dependencies:
   ```bash
   pip install django django-cors-headers
   ```
3. Run database migrations:
   ```bash
   python manage.py makemigrations api
   python manage.py migrate
   ```
4. Populate mock test accounts:
   ```bash
   python manage.py seed_db
   ```
5. Launch backend server:
   ```bash
   python manage.py runserver 5000
   ```

### 3. Frontend (React)
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Mock Test Credentials
Use these pre-seeded accounts to explore recruiter and candidate perspectives:
example
* **Recruiter**: Username: `sarah` / Password: `sarah123`
* **Freelancer**: Username: `alice` / Password: `alice123`
