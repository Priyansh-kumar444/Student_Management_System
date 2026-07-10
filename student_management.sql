-- =========================================================
--  Student Management System — Database Schema
--  MySQL Workbench / MySQL 8.x

DROP DATABASE IF EXISTS student_management_system;
CREATE DATABASE student_management_system;
USE student_management_system;

-- ---------------------------------------------------------
-- 1. DEPARTMENTS
-- ---------------------------------------------------------
CREATE TABLE departments (
    department_id   VARCHAR(10)   NOT NULL PRIMARY KEY,   -- e.g. 'DPT-01'
    department_name VARCHAR(100)  NOT NULL UNIQUE
);

-- ---------------------------------------------------------
-- 2. COURSES
-- ---------------------------------------------------------
CREATE TABLE courses (
    course_id       VARCHAR(10)   NOT NULL PRIMARY KEY,   -- e.g. 'CRS-01'
    course_name     VARCHAR(100)  NOT NULL,
    credits         INT           NOT NULL CHECK (credits BETWEEN 1 AND 6),
    department_id   VARCHAR(10)   NOT NULL,

    CONSTRAINT fk_courses_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- a department shouldn't have two courses with the same name
    CONSTRAINT uq_course_per_department UNIQUE (department_id, course_name)
);

-- ---------------------------------------------------------
-- 3. STUDENTS
--    NOTE: no course_id here anymore. A student's course_id
--    field is gone — their subjects are derived from their
--    department via the courses table.
-- ---------------------------------------------------------
CREATE TABLE students (
    student_id      VARCHAR(10)   NOT NULL PRIMARY KEY,   -- e.g. 'STU-2201'
    full_name       VARCHAR(100)  NOT NULL,
    age             INT           NOT NULL CHECK (age BETWEEN 15 AND 60),
    gender          ENUM('Male', 'Female', 'Other') NOT NULL,
    department_id   VARCHAR(10)   NOT NULL,
    semester        INT           NOT NULL CHECK (semester BETWEEN 1 AND 8),
    phone_number    VARCHAR(20)   NOT NULL,
    email           VARCHAR(100)  NOT NULL UNIQUE,
    address         TEXT,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_students_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ---------------------------------------------------------
-- 4. MARKS
--    One row per (student, course). The set of valid courses
--    for a given student = courses WHERE department_id =
--    student's department_id — enforce this in your Servlet
--    when inserting, since plain FKs can't express that rule.
-- ---------------------------------------------------------
CREATE TABLE marks (
    mark_id         INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id      VARCHAR(10)   NOT NULL,
    course_id       VARCHAR(10)   NOT NULL,
    marks_obtained  DECIMAL(5,2)  NOT NULL CHECK (marks_obtained BETWEEN 0 AND 100),
    updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_marks_student
        FOREIGN KEY (student_id) REFERENCES students(student_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_marks_course
        FOREIGN KEY (course_id) REFERENCES courses(course_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT uq_student_course UNIQUE (student_id, course_id)
);

-- ---------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------
CREATE INDEX idx_students_name       ON students(full_name);
CREATE INDEX idx_students_department ON students(department_id);
CREATE INDEX idx_students_semester   ON students(semester);
CREATE INDEX idx_courses_department  ON courses(department_id);

-- =========================================================
--  Sample data
-- =========================================================

INSERT INTO departments (department_id, department_name) VALUES
('DPT-01', 'Computer Science'),
('DPT-02', 'Electronics'),
('DPT-03', 'Mechanical'),
('DPT-04', 'Civil');

-- Courses are now tied to a department (their curriculum)
INSERT INTO courses (course_id, course_name, credits, department_id) VALUES
('CRS-01', 'Java Programming',            4, 'DPT-01'),
('CRS-02', 'Database Management Systems', 4, 'DPT-01'),
('CRS-03', 'Operating Systems',           3, 'DPT-01'),
('CRS-04', 'Computer Networks',           3, 'DPT-02'),
('CRS-05', 'Digital Electronics',         3, 'DPT-02'),
('CRS-06', 'Thermodynamics',              4, 'DPT-03'),
('CRS-07', 'Machine Design',              3, 'DPT-03'),
('CRS-08', 'Structural Analysis',         4, 'DPT-04'),
('CRS-09', 'Surveying',                   3, 'DPT-04');

-- Students no longer store an individual course_id
INSERT INTO students
(student_id, full_name, age, gender, department_id, semester, phone_number, email, address) VALUES
('STU-2201', 'Aditi Nair',      20, 'Female', 'DPT-01', 4, '+91 98765 43210', 'aditi.nair@email.com',      '14 MG Road, Cuttack, Odisha'),
('STU-2202', 'Rohan Kulkarni',  19, 'Male',   'DPT-02', 2, '+91 91234 56780', 'rohan.kulkarni@email.com', '22 Church Street, Pune, Maharashtra'),
('STU-2203', 'Sneha Patil',     21, 'Female', 'DPT-03', 6, '+91 90909 80808', 'sneha.patil@email.com',    '9 Lake View, Nagpur, Maharashtra'),
('STU-2204', 'Vikram Joshi',    20, 'Male',   'DPT-04', 3, '+91 88990 11223', 'vikram.joshi@email.com',  '3 Park Lane, Bhubaneswar, Odisha'),
('STU-2205', 'Meera Shah',      21, 'Female', 'DPT-01', 5, '+91 97865 43012', 'meera.shah@email.com',    '17 Sea Face Road, Mumbai, Maharashtra'),
('STU-2206', 'Kabir Verma',     19, 'Male',   'DPT-02', 1, '+91 99887 76655', 'kabir.verma@email.com',   '5 Civil Lines, Cuttack, Odisha');

-- Marks: Aditi Nair (DPT-01) gets marks for all 3 Computer Science courses
INSERT INTO marks (student_id, course_id, marks_obtained) VALUES
('STU-2201', 'CRS-01', 82),
('STU-2201', 'CRS-02', 90),
('STU-2201', 'CRS-03', 85);

-- =========================================================
--  Views that power the app screens directly
-- =========================================================

-- Average % and grade per student (Profile page, Reports)
CREATE OR REPLACE VIEW student_performance AS
SELECT
    s.student_id,
    s.full_name,
    ROUND(AVG(m.marks_obtained), 2) AS average_marks,
    CASE
        WHEN AVG(m.marks_obtained) >= 90 THEN 'A+'
        WHEN AVG(m.marks_obtained) >= 80 THEN 'A'
        WHEN AVG(m.marks_obtained) >= 70 THEN 'B'
        WHEN AVG(m.marks_obtained) >= 60 THEN 'C'
        WHEN AVG(m.marks_obtained) >= 50 THEN 'D'
        ELSE 'F'
    END AS grade
FROM students s
LEFT JOIN marks m ON m.student_id = s.student_id
GROUP BY s.student_id, s.full_name;



