# TeraExam SaaS - Online Examination & Assessment Infrastructure

A complete, multi-tenant online examination and assessment SaaS platform built for third-party Indian local educators, tutors, coaching institutes, and independent teachers.

The platform provides end-to-end educational operations:
```
Educator / Institute → Students & Batches → Subjects & Question Bank → Scheduled & Live Exams → Indian CBT Test Interface → Auto-Evaluation & Scoring → Rank & Percentile Generation → Performance Analytics & Scorecards → Notice Board & Announcements
```

---

## 🚀 Key Architectural Features

### 1. Multi-Tenant SaaS Isolation
- **Tenant Scope:** Every coaching institute (`Institution`) operates with complete data isolation.
- **Custom Educator Branding:** Each institute configures its own name, tagline, logo, contact details, and primary theme colors.
- **Role Hierarchy:**
  - `PLATFORM_ADMIN`: Superuser managing multi-tenant instances, subscription tiers, and global audit logs.
  - `INSTITUTE_ADMIN`: Coaching Director / Principal managing batches, faculty, exams, and branding.
  - `TEACHER`: Faculty creating subjects, question bank items, and authoring exams.
  - `STUDENT`: Enrolled candidate viewing available assessments, taking tests via the CBT interface, and reviewing official scorecards.

### 2. Comprehensive Question Bank
- Supports multiple question types tailored to Indian competitive examinations (JEE Main, JEE Advanced, NEET, UPSC/State PCS, SSC, Boards):
  - **Single Choice (MCQ)**: Single correct option with automated instant grading.
  - **Multiple Choice (MSQ)**: Multiple correct options with exact matching.
  - **Numerical Value**: Integer or float response with configurable tolerance (e.g. JEE Advanced numericals).
  - **True / False**: Binary evaluation.
  - **Short Answer**: Keyword/phrase matching.
- LaTeX formula and Markdown statement rendering.
- Step-by-step teacher explanations and solutions displayed upon result publication.
- **Bulk CSV Import & Export** with built-in format validation and sample template download.

### 3. Examination Scheduling & Rules Engine
- **Exam Modes:** Flexible assessment window or strict timed schedule.
- **Configurable Negative Marking:** Standard Indian competitive exam marking (e.g., +4.00 for correct, -1.00 for wrong) or zero penalty.
- **Question Shuffling:** Randomizes question order per student attempt while preserving deterministic audit history.
- **Batch Enrollment Control:** Assign exams to specific batches (e.g. "Target JEE 2026 Alpha") or institute-wide.
- **Result Publishing Control:** Educators decide when scorecards, solutions, and rank lists become visible to candidates.

### 4. Indian Computer-Based Test (CBT) Student Interface
- Modelled after NTA / JEE / NEET Computer-Based Test standards:
  - **Candidate Header:** Institute branding, exam code, candidate details, and roll number.
  - **Live Countdown Timer:** Color-coded alerts (`HH:MM:SS`) with automatic submission at 00:00:00.
  - **5-State Question Palette:**
    - 🟢 **Answered**
    - 🔴 **Not Answered**
    - ⚪ **Not Visited**
    - 🟣 **Marked for Review**
    - 🟣🟢 **Answered & Marked for Review** (evaluated)
  - Navigation controls: *Clear Response*, *Mark for Review & Next*, and *Save & Next*.
  - Submission confirmation summary dialog before final submission.

### 5. Automated Evaluation, Ranking & Item Analytics
- Instant grading against official answer keys upon submission or timeout.
- **NTA/JEE Percentile Formula:** `(Candidates with score <= student's score / Total candidates) * 100`.
- **Leaderboards & Merit Lists:** Instant top rankers list with score, accuracy %, and completion time.
- **Question Discrimination Index:** Measures difficulty and item accuracy (% of students answering correctly) for educator feedback.
- One-click **Merit List Export to CSV**.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | Python 3.12, Django 5.2, Django REST Framework 3.18 |
| **Frontend** | React 19, Vite 8, Lucide React Icons |
| **Database** | SQLite (Default relational store; PostgreSQL-ready via `DATABASE_URL`) |
| **Security** | Session-based CSRF-protected authentication, Multi-tenant query scoping |
| **Testing** | Django TestCase & DRF APIClient (16/16 tests passing, 100% pass rate) |

---

## ⚡ Seed Personas & Demo Accounts

The database comes pre-seeded with realistic Indian coaching data (**Apex IIT-JEE & NEET Academy**, Kota):

| Persona | Username | Password | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Institute Director** | `educator_apex` | `ApexPass123!` | `INSTITUTE_ADMIN` | Full control of Apex Academy, exams, questions, batches, and branding |
| **Physics Faculty** | `teacher_verma` | `TeacherPass123!` | `TEACHER` | Senior faculty managing questions and syllabus |
| **Student (Rank 1)** | `student_arjun` | `StudentPass123!` | `STUDENT` | Arjun Mehta (Roll: `APEX-2026-001`, Score: 18/18, Rank #1) |
| **Student (Take Exam)** | `student_rohit` | `StudentPass123!` | `STUDENT` | Rohit Gupta (Can take live mock tests via CBT interface) |
| **Platform Admin** | `admin` | `AdminPass123!` | `PLATFORM_ADMIN` | Global SaaS operator managing all tenant institutes |

---

## 🏃 Running the Application

### 1. Backend Server
```bash
cd backend
source venv/bin/activate
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend Development Server
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

### 3. Running Backend Tests
```bash
cd backend
source venv/bin/activate
python manage.py test exams administration
```

---

## 📂 Project Structure

```
tera1/
├── backend/
│   ├── administration/            # Legacy control plane & audit logging
│   ├── exams/                     # Core Multi-Tenant Examination SaaS App
│   │   ├── auth_views.py          # Multi-role authentication & session endpoints
│   │   ├── models.py              # Tenant, Batch, Subject, Question, Exam, Attempt, Answer
│   │   ├── serializers.py         # DRF serializers (including sanitized student serializers)
│   │   ├── services.py            # Evaluation engine, ranking & percentile math, CSV parsers
│   │   ├── views.py               # REST API viewsets & actions
│   │   ├── urls.py                # Router configuration
│   │   ├── tests.py               # Automated test suite (16 tests)
│   │   └── management/commands/   # Seed commands
│   ├── tera_backend/              # Django root settings & URL routing
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # Unified API client & CSRF token manager
│   │   ├── context/AuthContext.jsx # Role-aware authentication context
│   │   ├── layouts/AdminLayout.jsx # Adaptive multi-role navigation & switcher
│   │   ├── pages/
│   │   │   ├── educator/          # Dashboard, QuestionBank, ExamsManager, StudentManager, Branding
│   │   │   ├── student/           # StudentPortal, CbtExamView, ScorecardView
│   │   │   └── Login.jsx          # Login view with 1-click persona cards
│   │   ├── index.css              # Custom responsive stylesheet & CBT theme
│   │   └── App.jsx
│   └── package.json
└── README.md
```
