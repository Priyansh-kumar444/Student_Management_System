# Student Management System

## Overview

The Student Management System is a full-stack web application designed to manage student records, departments, courses, marks, and reports in an educational institution. The project provides a user-friendly dashboard for administrators to perform academic management tasks efficiently.

## Features

* Dashboard with system statistics
* Student Management (Add, View, Search, and Manage Students)
* Department Management
* Course Management
* Marks Management
* Student Profile View
* Reports and Analytics
* Responsive User Interface
* MySQL Database Integration
* RESTful API using Express.js

## Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Font Awesome

### Backend

* Node.js
* Express.js

### Database

* MySQL

## Project Structure

```bash
student-management-system/
│
├── index.html
├── students.html
├── add-student.html
├── student-profile.html
├── departments.html
├── courses.html
├── marks.html
├── reports.html
├── server.js
├── package.json
├── package-lock.json
├── student_management_system.sql
├── css/
└── js/
```

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/student-management-system.git
cd student-management-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Database

Open MySQL Workbench and create a database:

```sql
CREATE DATABASE student_management_system;
```

### 4. Import SQL File

Import the provided:

```sql
student_management_system.sql
```

file into MySQL Workbench.

### 5. Configure Database

Update database credentials in `server.js`:

```javascript
const pool = mysql.createPool({
  host: "localhost",
  user: "your_username",
  password: "your_password",
  database: "student_management_system",
});
```

### 6. Start Server

```bash
npm start
```

### 7. Open Application

```bash
http://localhost:3000
```

## Modules

### Dashboard

Displays total students, departments, courses, and performance statistics.

### Students

Manage student records, search students, and view detailed profiles.

### Departments

Create and manage academic departments.

### Courses

Add and manage courses under different departments.

### Marks

Store and manage subject-wise student marks.

### Reports

Generate academic summaries and performance reports.

## Future Enhancements

* Authentication & Authorization
* Role-Based Access Control
* PDF Report Generation
* Attendance Management
* Student Photo Upload
* Data Export to Excel

## Author

Developed as a College Mini Project using Node.js, Express.js, and MySQL.

