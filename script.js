/* =========================================================
   Student Management System — Shared JS
   Theme toggle + small page helpers
   ========================================================= */

(function () {
  const root = document.documentElement;
  const STORAGE_KEY = "sms-theme";

  function applyTheme(theme) {
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    const btn = document.getElementById("themeToggle");
    if (btn) {
      const icon = btn.querySelector("i");
      if (icon) icon.className = theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
  }

  // Apply saved theme immediately (before paint where possible)
  const saved = localStorage.getItem(STORAGE_KEY) || "light";
  applyTheme(saved);

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.getElementById("themeToggle");
    if (btn) {
      const current = localStorage.getItem(STORAGE_KEY) || "light";
      applyTheme(current);

      btn.addEventListener("click", function () {
        const now = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE_KEY, now);
        applyTheme(now);
      });
    }
  });
})();

/* ---- Grade helper: turns an average into a letter grade ---- */
function getGrade(avg) {
  if (avg >= 90) return "A+";
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "F";
}

/* ---- Marks entry page: live average + grade calculation ----
   Uses event delegation on the grid container so it keeps
   working even after the subject inputs are rebuilt dynamically
   (e.g. when the selected student's department changes). ---- */
function initMarksCalculator() {
  const grid = document.getElementById("marksSubjectsGrid");
  const avgEl = document.getElementById("marksAverage");
  const gradeEl = document.getElementById("marksGrade");
  if (!grid || !avgEl || !gradeEl) return;

  function recalc() {
    const inputs = grid.querySelectorAll("input[type='number']");
    let total = 0;
    let count = 0;
    inputs.forEach((inp) => {
      const val = parseFloat(inp.value);
      if (!isNaN(val)) {
        total += val;
        count++;
      }
    });
    const avg = count ? total / count : 0;
    avgEl.textContent = count ? avg.toFixed(2) : "--";
    gradeEl.textContent = count ? getGrade(avg) : "--";
  }

  grid.addEventListener("input", (e) => {
    if (e.target.matches("input[type='number']")) recalc();
  });

  // Expose so marks.html can trigger a recalc after rebuilding the grid
  window.recalcMarks = recalc;
}

document.addEventListener("DOMContentLoaded", initMarksCalculator);

/* ---- Marks page: load real students into the dropdown,
   then load real subjects for whichever department that
   student belongs to, straight from the database. ---- */
async function initMarksPage() {
  const studentSelect = document.getElementById("marksStudent");
  const grid = document.getElementById("marksSubjectsGrid");
  if (!studentSelect || !grid) return;

  try {
    const res = await fetch("/api/students");
    const students = await res.json();
    students.forEach((s) => {
      const opt = new Option(`#${s.student_id} — ${s.full_name} (${s.department_name})`, s.student_id);
      opt.dataset.deptId = s.department_id;
      studentSelect.appendChild(opt);
    });
  } catch (err) {
    console.error("Could not load students for marks page:", err);
  }

  studentSelect.addEventListener("change", async () => {
    const selected = studentSelect.options[studentSelect.selectedIndex];
    const deptId = selected?.dataset?.deptId;

    if (!deptId) {
      grid.innerHTML = '<p class="muted" id="marksEmptyState">Select a student above to load their subjects.</p>';
      if (window.recalcMarks) window.recalcMarks();
      return;
    }

    try {
      const [coursesRes, marksRes] = await Promise.all([
        fetch(`/api/courses?departmentId=${deptId}`),
        fetch(`/api/marks/${studentSelect.value}`)
      ]);
      const courses = await coursesRes.json();
      const existingMarks = await marksRes.json();
      const marksByCourseId = Object.fromEntries(existingMarks.map((m) => [m.course_id, m.marks_obtained]));

      grid.innerHTML = courses.length
        ? courses.map((c, i) => `
            <div class="form-field">
              <label for="markSubject${i}">${c.course_name}</label>
              <input type="number" id="markSubject${i}" data-course-id="${c.course_id}" min="0" max="100"
                     placeholder="Marks out of 100" value="${marksByCourseId[c.course_id] ?? ""}">
            </div>`).join("")
        : '<p class="muted">This department has no courses yet — add one on the Courses page.</p>';
    } catch (err) {
      console.error("Could not load subjects:", err);
    }

    if (window.recalcMarks) window.recalcMarks();
  });
}
document.addEventListener("DOMContentLoaded", initMarksPage);

/* =========================================================
   API-driven data loading
   Each function checks for its page's elements before running,
   so this one file works safely on every page.
   ========================================================= */

/* ---- Dashboard ---- */
async function loadDashboard() {
  const el = document.getElementById("statTotalStudents");
  if (!el) return;
  try {
    const res = await fetch("/api/dashboard");
    const data = await res.json();
    document.getElementById("statTotalStudents").textContent = data.totalStudents;
    document.getElementById("statTotalDepartments").textContent = data.totalDepartments;
    document.getElementById("statTotalCourses").textContent = data.totalCourses;
    document.getElementById("statAvgPercentage").textContent = data.avgPercentage + "%";

    const body = document.getElementById("recentStudentsBody");
    body.innerHTML = data.recent.length
      ? data.recent.map((s) => `
          <tr>
            <td>#${s.student_id}</td>
            <td class="name-flex"><span class="avatar-sm">${initials(s.full_name)}</span><span class="cell-name">${s.full_name}</span></td>
            <td>${s.department_name}</td>
            <td>Semester ${s.semester}</td>
          </tr>`).join("")
      : '<tr><td colspan="4" class="muted">No students yet.</td></tr>';
  } catch (err) {
    console.error("Dashboard load failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", loadDashboard);

/* ---- Students list page ---- */
async function loadStudents() {
  const body = document.getElementById("studentsTableBody");
  if (!body) return;
  try {
    const res = await fetch("/api/students");
    const students = await res.json();
    body.innerHTML = students.length
      ? students.map((s) => `
          <tr data-id="${s.student_id}" data-name="${s.full_name}" data-dept="${s.department_name}" data-sem="${s.semester}">
            <td>#${s.student_id}</td>
            <td class="name-flex"><span class="avatar-sm">${initials(s.full_name)}</span><span class="cell-name">${s.full_name}</span></td>
            <td>${s.department_name}</td>
            <td>Semester ${s.semester}</td>
            <td>${s.phone_number}</td>
            <td>
              <div class="row-actions">
                <a href="student-profile.html?id=${s.student_id}" class="icon-action" title="View"><i class="fa-regular fa-eye"></i></a>
                <button class="icon-action danger" title="Delete" onclick="deleteStudent('${s.student_id}')"><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </td>
          </tr>`).join("")
      : '<tr><td colspan="6" class="muted">No students yet — add one above.</td></tr>';
    initStudentFilters(); // re-attach filter listeners now that rows exist
  } catch (err) {
    console.error("Students load failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", loadStudents);

async function deleteStudent(id) {
  if (!confirm(`Delete student ${id}? This cannot be undone.`)) return;
  await fetch(`/api/students/${id}`, { method: "DELETE" });
  loadStudents();
}

/* ---- Departments page ---- */
async function loadDepartments() {
  const body = document.getElementById("departmentsTableBody");
  if (!body) return;
  try {
    const res = await fetch("/api/departments");
    const depts = await res.json();
    body.innerHTML = depts.length
      ? depts.map((d) => `
          <tr>
            <td>#${d.department_id}</td>
            <td class="cell-name">${d.department_name}</td>
            <td>
              <div class="row-actions">
                <button class="icon-action danger" title="Delete" onclick="deleteDepartment('${d.department_id}')"><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </td>
          </tr>`).join("")
      : '<tr><td colspan="3" class="muted">No departments yet.</td></tr>';
  } catch (err) {
    console.error("Departments load failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", loadDepartments);

async function deleteDepartment(id) {
  if (!confirm(`Delete department ${id}? This will fail if students are still assigned to it.`)) return;
  const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
  if (res.ok) loadDepartments();
  else alert("Could not delete — students may still be assigned to this department.");
}

/* ---- Populate any <select> that needs a live department list ----
   Looks for #department (Add Student) and #courseDept (Add Course) ---- */
async function loadDepartmentOptions() {
  const targets = [document.getElementById("department"), document.getElementById("courseDept")].filter(Boolean);
  if (!targets.length) return;
  try {
    const res = await fetch("/api/departments");
    const depts = await res.json();
    targets.forEach((select) => {
      const placeholder = select.querySelector("option");
      select.innerHTML = "";
      select.appendChild(placeholder || new Option("Select department", ""));
      depts.forEach((d) => select.appendChild(new Option(d.department_name, d.department_id)));
    });
  } catch (err) {
    console.error("Department options load failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", loadDepartmentOptions);

/* ---- Courses page ---- */
async function loadCourses() {
  const body = document.getElementById("coursesTableBody");
  if (!body) return;
  try {
    const res = await fetch("/api/courses");
    const courses = await res.json();
    body.innerHTML = courses.length
      ? courses.map((c) => `
          <tr>
            <td>#${c.course_id}</td>
            <td class="cell-name">${c.course_name}</td>
            <td><span class="badge badge-blue">${c.department_name}</span></td>
            <td>${c.credits}</td>
            <td>
              <div class="row-actions">
                <button class="icon-action danger" title="Delete" onclick="deleteCourse('${c.course_id}')"><i class="fa-regular fa-trash-can"></i></button>
              </div>
            </td>
          </tr>`).join("")
      : '<tr><td colspan="5" class="muted">No courses yet.</td></tr>';
  } catch (err) {
    console.error("Courses load failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", loadCourses);

async function deleteCourse(id) {
  if (!confirm(`Delete course ${id}?`)) return;
  await fetch(`/api/courses/${id}`, { method: "DELETE" });
  loadCourses();
}

/* ---- Reports page ---- */
async function loadReports() {
  const el = document.getElementById("reportTotalStudents");
  if (!el) return;
  try {
    const [dashRes, repRes] = await Promise.all([fetch("/api/dashboard"), fetch("/api/reports")]);
    const dash = await dashRes.json();
    const rep = await repRes.json();

    document.getElementById("reportTotalStudents").textContent = dash.totalStudents;
    document.getElementById("reportTotalDepartments").textContent = dash.totalDepartments;
    document.getElementById("reportTotalCourses").textContent = dash.totalCourses;

    document.getElementById("deptReportBody").innerHTML = rep.byDept
      .map((r) => `<tr><td>${r.department_name}</td><td>${r.total}</td></tr>`).join("");
    document.getElementById("semReportBody").innerHTML = rep.bySem
      .map((r) => `<tr><td>Semester ${r.semester}</td><td>${r.total}</td></tr>`).join("");
  } catch (err) {
    console.error("Reports load failed:", err);
  }
}
document.addEventListener("DOMContentLoaded", loadReports);

/* ---- Small helper: initials for the avatar circles ---- */
function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
}
function initStudentFilters() {
  const searchInput = document.getElementById("studentSearch");
  const deptFilter = document.getElementById("deptFilter");
  const semFilter = document.getElementById("semFilter");
  const rows = document.querySelectorAll("#studentsTableBody tr");
  if (!rows.length) return;

  function applyFilters() {
    const term = (searchInput?.value || "").toLowerCase().trim();
    const dept = deptFilter?.value || "";
    const sem = semFilter?.value || "";

    rows.forEach((row) => {
      const id = row.dataset.id?.toLowerCase() || "";
      const name = row.dataset.name?.toLowerCase() || "";
      const rowDept = row.dataset.dept || "";
      const rowSem = row.dataset.sem || "";

      const matchesTerm = !term || id.includes(term) || name.includes(term);
      const matchesDept = !dept || rowDept === dept;
      const matchesSem = !sem || rowSem === sem;

      row.style.display = matchesTerm && matchesDept && matchesSem ? "" : "none";
    });
  }

  [searchInput, deptFilter, semFilter].forEach((el) => {
    if (el) el.addEventListener("input", applyFilters);
    if (el) el.addEventListener("change", applyFilters);
  });
}

document.addEventListener("DOMContentLoaded", initStudentFilters);

/* ---- Student Profile Page ---- */

async function loadStudentProfile() {

    if (!window.location.pathname.includes("student-profile.html")) return;

    const id = new URLSearchParams(window.location.search).get("id");

    if (!id) return;

    try {

        // Load student details
        const studentRes = await fetch(`/api/students/${id}`);
        const student = await studentRes.json();

        // ===== Fill Student Details =====

        document.querySelector(".profile-card h2").textContent = student.full_name;
        document.querySelector(".profile-card p").textContent =
            `#${student.student_id} · ${student.department_name}`;

        document.getElementById("studentAvatar").textContent = initials(student.full_name);

        const details = document.querySelectorAll(".detail-grid p");

        details[0].textContent = "#" + student.student_id;
        details[1].textContent = student.full_name;
        details[2].textContent = student.department_name;
        details[3].textContent = "Semester " + student.semester;
        details[4].textContent = student.age;
        details[5].textContent = student.gender;
        details[6].textContent = student.phone_number;
        details[7].textContent = student.email;
        details[8].textContent = student.address;

        document.querySelector(".info-list").innerHTML = `
            <div><span>Age</span><span>${student.age}</span></div>
            <div><span>Gender</span><span>${student.gender}</span></div>
            <div><span>Phone</span><span>${student.phone_number}</span></div>
            <div><span>Email</span><span>${student.email}</span></div>
        `;

        // ===== Load Marks =====

        const marksRes = await fetch(`/api/marks/${id}`);
        const marks = await marksRes.json();

        const tbody = document.getElementById("marksTableBody");

        tbody.innerHTML = "";

        let total = 0;

        marks.forEach(mark => {

            total += Number(mark.marks_obtained);

            tbody.innerHTML += `
                <tr>
                    <td>${mark.course_name}</td>
                    <td>${mark.marks_obtained}</td>
                </tr>
            `;

        });

        const average = marks.length ? total / marks.length : 0;

        document.getElementById("averageMarks").textContent =
            average.toFixed(2);

        document.getElementById("studentGrade").textContent =
            getGrade(average);

    }
    catch(err){
        console.error(err);
    }

}

document.addEventListener("DOMContentLoaded", loadStudentProfile);