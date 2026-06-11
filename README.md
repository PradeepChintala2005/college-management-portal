# 🎓 College Management & Attendance Portal

A modern, high-fidelity full-stack web application designed to manage academic catalogs, course scheduling, coursework assignments, student grading, notice boards, and secure QR-based attendance tracking. Built with a sleek glassmorphic UI, robust Role-Based Access Control (RBAC), and a Node.js/Express SQLite backend.

---

## 🔗 Live Links
* **Live Web App (Vercel)**: [https://college-management-portal-five.vercel.app/](https://college-management-portal-five.vercel.app/)
* **Backend API (Render)**: [https://college-management-portal-a65e.onrender.com/status](https://college-management-portal-a65e.onrender.com/status)

---

## 🚀 Key Features

### 🔐 1. Multi-Role Authorization & Security
* **Three Defined Roles**: Admin, Faculty, and Student workspaces.
* **Session Integrity**: Secured with JSON Web Tokens (JWT) stored locally, with Axios interceptors that automatically clean up sessions and redirect on token expiration (401).

### 📅 2. QR & Manual Attendance Management
* **Rotating QR Session Codes**: Faculty can generate attendance QR sessions that auto-expire after 5 minutes.
* **QR Self Check-in**: Students scan the active QR token from their dashboard. Checks enforce enrollment validation.
* **Absence Automation**: Students who miss the QR window or manual marking are automatically computed as `"Absent"` using left-join aggregations. Ratios stay fully synchronized between student cards and teacher tables.
* **Manual Roster Logging**: Faculty can manually mark student status (`Present`, `Absent`, `Late`) on a section spreadsheet.

### 📚 3. Coursework, Submissions & Grading
* **Catalog Management**: Admins add departments, courses, and assign sections to faculty.
* **Assignments Board**: Faculty publish homework with deadlines; students upload text answers or repository links.
* **Evaluation Center**: Faculty review submissions and input grades; students receive immediate feedback.
* **Grade Book**: Faculty log exam scores ($0 \le x \le 100$). Students view a complete grades report card.

### 📢 4. Announcements Notice Board
* **Filtered Feed**: Notice boards filter bulletins based on the authenticated student's department (e.g. CSE, ECE) combined with campus-wide notices.
* **RBAC Limits**: Faculty notices are auto-bounded to their departments. Author ownership is enforced.

### 🔍 5. Student Academic Records Inspector (Admin)
* Admins can search the directory and open a detailed drawer displaying the selected student's bio profile, full grades transcript card, and attendance spreadsheets.

---

## 🛠️ Tech Stack

* **Frontend**: React (Vite), React Router DOM (v7), Axios, Vanilla CSS (Glassmorphism layout).
* **Backend**: Node.js, Express, SQLite3, JSON Web Tokens (JWT), BCryptJS.
* **Deployment**: Vercel (Client), Render (API).

---

## 📁 Repository Structure

```text
├── Backend/
│   ├── src/
│   │   ├── controllers/      # Route controllers (auth, attendance, marks, etc.)
│   │   ├── database/         # SQLite DB, schema.sql blueprint, and seed script
│   │   ├── middleware/       # JWT RBAC auth gates
│   │   ├── models/           # SQLite database queries models
│   │   ├── routes/           # REST endpoints definition
│   │   └── app.js            # Express app configuration
│   ├── server.js             # API entrypoint
│   └── test_attendance.js    # Integration test suite
└── Frontend/
    ├── src/
    │   ├── components/       # Protected routes and components
    │   ├── context/          # Authentication states
    │   ├── pages/            # Admin, Faculty, and Student sub-pages
    │   ├── services/         # Axios API configuration
    │   ├── App.jsx           # Client router
    │   └── index.css         # Midnight CSS Theme variables
    └── vercel.json           # Vercel fallback rules for SPA reloads
```

---

## ⚙️ Local Setup Instructions

### Prerequisites
* [Node.js](https://nodejs.org/) (v16+ recommended)

### 1. Clone the Repository
```bash
git clone https://github.com/PradeepChintala2005/college-management-portal.git
cd college-management-portal
```

### 2. Configure Backend
1. Go to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize and seed the local database:
   ```bash
   npm run seed
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   The backend will start on [http://localhost:5000](http://localhost:5000).

### 3. Configure Frontend
1. Open a new terminal and go to the `Frontend` directory:
   ```bash
   cd ../Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   The frontend will run on [http://localhost:5173](http://localhost:5173).

---

## 🔑 Default Seeded Accounts
You can log in locally or on the live link with these seeded accounts (or create fresh ones):

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@college.edu` | `password123` |
| **Faculty** | `prof.cse@college.edu` | `password123` |
| **Student** | `student.cse@college.edu` | `password123` |

---

## 🛡️ License
Distributed under the ISC License. See `LICENSE` for more information.
