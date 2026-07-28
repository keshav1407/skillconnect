# SkillConnect

SkillConnect is a polished starter platform for connecting recruiters with skilled freelancers. The project includes a modern React frontend and a lightweight Express backend that serves sample jobs, freelancers, and messages.

## Features

- Landing page for recruiters and freelancers
- Featured job listings from the backend API
- Freelancer spotlight cards
- Messaging overview for active conversations
- Easy local development workflow

## Project structure

- frontend: Vite + React app
- backend: Express API server

## Run locally

### 1. Install frontend dependencies

```bash
cd frontend
npm install
```

### 2. Install backend dependencies

```bash
cd ../backend
npm install
```

### 3. Start the backend

```bash
npm start
```

### 4. Start the frontend

```bash
cd ../frontend
npm run dev
```

The frontend will proxy API requests to the backend at http://localhost:5000.

## Tech stack

- React
- Vite
- Express
- Node.js
