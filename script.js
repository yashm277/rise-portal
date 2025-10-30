const container = document.getElementById('studentsContainer');
const addStudentBtn = document.getElementById('addStudentBtn');
let studentCount = 0;

addStudentBtn.addEventListener('click', addStudentSection);

function addStudentSection() {
  studentCount++;
  const studentDiv = document.createElement('div');
  studentDiv.classList.add('student-section');
  studentDiv.dataset.studentId = studentCount;

  studentDiv.innerHTML = `
    <div class="student-header">
      <h3>Student ${studentCount}</h3>
      <button type="button" class="remove-btn" onclick="removeStudent(this)">Remove</button>
    </div>
    <label>Student ID</label>
    <input type="text" name="student_${studentCount}_id" placeholder="Enter Student ID" required />

    <label>Student Name</label>
    <input type="text" name="student_${studentCount}_name" placeholder="Enter Student Name" required />

    <div class="class-dates">
      ${generateDateFields(studentCount)}
    </div>
  `;

  container.appendChild(studentDiv);
}

function generateDateFields(studentId) {
  let html = '';
  for (let i = 1; i <= 10; i++) {
    html += `
      <div class="date-field" id="student_${studentId}_class_${i}" style="display:${i === 1 ? 'block' : 'none'};">
        <label>Class ${i} Date</label>
        <input type="date" name="student_${studentId}_class_${i}_date"
               onchange="showNextDateField(${studentId}, ${i})" />
      </div>
    `;
  }
  return html;
}

function showNextDateField(studentId, currentClass) {
  const nextField = document.getElementById(`student_${studentId}_class_${currentClass + 1}`);
  if (nextField) nextField.style.display = 'block';
}

function removeStudent(btn) {
  btn.closest('.student-section').remove();
}

document.getElementById('studentForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const data = [];
  const students = document.querySelectorAll('.student-section');

  students.forEach((student) => {
    const id = student.querySelector(`[name^="student_${student.dataset.studentId}_id"]`).value;
    const name = student.querySelector(`[name^="student_${student.dataset.studentId}_name"]`).value;

    const classes = [];
    for (let i = 1; i <= 10; i++) {
      const dateInput = student.querySelector(`[name="student_${student.dataset.studentId}_class_${i}_date"]`);
      if (dateInput && dateInput.value) classes.push(dateInput.value);
    }

    data.push({ id, name, classes });
  });

  console.log('Submitted data:', data);

  alert('Form submitted! Check console for data.');
});
