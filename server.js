/* =========================================================
   Student Management System — Backend
   One file. Run: node server.js
   Serves the HTML/CSS/JS files AND the API on one port.
   ========================================================= */

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // serves index.html, css/, js/ as-is

// ---- MySQL connection pool ----
// EDIT these to match your MySQL Workbench login.
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "your_password", // <-- change this
  database: "student_management_system",
});

/* =========================================================
   DASHBOARD
   ========================================================= */
app.get("/api/dashboard", async (req, res) => {
  try {
    const [[{ totalStudents }]] = await pool.query("SELECT COUNT(*) AS totalStudents FROM students");
    const [[{ totalDepartments }]] = await pool.query("SELECT COUNT(*) AS totalDepartments FROM departments");
    const [[{ totalCourses }]] = await pool.query("SELECT COUNT(*) AS totalCourses FROM courses");
    const [[{ avgPercentage }]] = await pool.query("SELECT ROUND(AVG(marks_obtained),2) AS avgPercentage FROM marks");
    const [recent] = await pool.query(
      `SELECT s.student_id, s.full_name, d.department_name, s.semester
       FROM students s JOIN departments d ON s.department_id = d.department_id
       ORDER BY s.created_at DESC LIMIT 5`
    );
    res.json({
      totalStudents,
      totalDepartments,
      totalCourses,
      avgPercentage: avgPercentage || 0,
      recent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

/* =========================================================
   DEPARTMENTS
   ========================================================= */
app.get("/api/departments", async (req, res) => {
  const [rows] = await pool.query("SELECT * FROM departments ORDER BY department_id");
  res.json(rows);
});

app.post("/api/departments", async (req, res) => {
  const { departmentId, departmentName } = req.body;
  try {
    await pool.query(
      "INSERT INTO departments (department_id, department_name) VALUES (?, ?)",
      [departmentId, departmentName]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/departments/:id", async (req, res) => {
  await pool.query("DELETE FROM departments WHERE department_id = ?", [req.params.id]);
  res.json({ success: true });
});

/* =========================================================
   COURSES
   ========================================================= */
app.get("/api/courses", async (req, res) => {
  const { departmentId } = req.query;
  let sql = `SELECT c.*, d.department_name FROM courses c
             JOIN departments d ON c.department_id = d.department_id`;
  const params = [];
  if (departmentId) {
    sql += " WHERE c.department_id = ?";
    params.push(departmentId);
  }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

app.post("/api/courses", async (req, res) => {
  const { courseId, courseName, credits, departmentId } = req.body;
  try {
    await pool.query(
      "INSERT INTO courses (course_id, course_name, credits, department_id) VALUES (?, ?, ?, ?)",
      [courseId, courseName, credits, departmentId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  await pool.query("DELETE FROM courses WHERE course_id = ?", [req.params.id]);
  res.json({ success: true });
});

/* =========================================================
   STUDENTS
   ========================================================= */
app.get("/api/students", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.*, d.department_name FROM students s
     JOIN departments d ON s.department_id = d.department_id
     ORDER BY s.student_id`
  );
  res.json(rows);
});

// Get a single student by ID
app.get("/api/students/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, d.department_name
       FROM students s
       JOIN departments d ON s.department_id = d.department_id
       WHERE s.student_id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load student" });
  }
});

app.post("/api/students", async (req, res) => {
  const { studentId, fullName, age, gender, departmentId, semester, phoneNumber, email, address } = req.body;
  try {
    await pool.query(
      `INSERT INTO students
       (student_id, full_name, age, gender, department_id, semester, phone_number, email, address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentId, fullName, age, gender, departmentId, semester, phoneNumber, email, address]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  await pool.query("DELETE FROM students WHERE student_id = ?", [req.params.id]);
  res.json({ success: true });
});

/* =========================================================
   MARKS
   ========================================================= */
app.get("/api/marks/:studentId", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT m.*, c.course_name FROM marks m
     JOIN courses c ON m.course_id = c.course_id
     WHERE m.student_id = ?`,
    [req.params.studentId]
  );
  res.json(rows);
});

// Upsert: insert a mark, or update it if that student+course already has one
app.post("/api/marks", async (req, res) => {
  const { studentId, courseId, marksObtained } = req.body;
  try {
    await pool.query(
      `INSERT INTO marks (student_id, course_id, marks_obtained)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained)`,
      [studentId, courseId, marksObtained]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* =========================================================
   REPORTS
   ========================================================= */
app.get("/api/reports", async (req, res) => {
  const [byDept] = await pool.query(
    `SELECT d.department_name, COUNT(s.student_id) AS total
     FROM departments d LEFT JOIN students s ON s.department_id = d.department_id
     GROUP BY d.department_name`
  );
  const [bySem] = await pool.query(
    `SELECT semester, COUNT(*) AS total FROM students GROUP BY semester ORDER BY semester`
  );
  res.json({ byDept, bySem });
});

/* =========================================================
   Start server
   ========================================================= */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Student Management System running at http://localhost:${PORT}`);
});
