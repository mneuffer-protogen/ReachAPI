document.addEventListener('DOMContentLoaded', () => {
  const lpSelect            = document.getElementById('lpSelect');
  const userSelect          = document.getElementById('userSelect');
  const courseSelect        = document.getElementById('courseSelect');
  const selectedCourseIdDiv = document.getElementById('selectedCourseId');  // ← new
  const markBtn             = document.getElementById('markCompleteBtn');
  const messageEl           = document.getElementById('message');

  // 1. Load all learning paths
  async function loadLearningPaths() {
    try {
      const res  = await fetch('/api/learning-paths');
      const data = await res.json();
      const paths = Array.isArray(data.learningPaths) ? data.learningPaths : [];

      lpSelect.innerHTML = '<option value="">-- Select a Learning Path --</option>';
      paths.forEach(lp => {
        const o = document.createElement('option');
        o.value       = lp.id;
        o.textContent = lp.title;
        lpSelect.appendChild(o);
      });
    } catch (err) {
      messageEl.textContent = `Error loading paths: ${err.message}`;
    }
  }

  // 2. When a learning path is selected, load its users and courses
  lpSelect.addEventListener('change', async () => {
    const lpId = lpSelect.value;

    // Reset downstream selects & UI
    userSelect.innerHTML        = '<option value="">-- Select a User --</option>';
    courseSelect.innerHTML      = '<option value="">-- Select a Course --</option>';
    userSelect.disabled         = true;
    courseSelect.disabled       = true;
    markBtn.disabled            = true;
    selectedCourseIdDiv.textContent = '';
    messageEl.textContent       = '';

    if (!lpId) return;

    // Fetch users in this learning path
    try {
      const uRes  = await fetch(`/api/users?learningPathId=${encodeURIComponent(lpId)}`);
      const uData = await uRes.json();
      const users = Array.isArray(uData.users) ? uData.users : [];

      users.forEach(u => {
        const o = document.createElement('option');
        o.value       = u.id;
        o.textContent = `${u.firstName} ${u.lastName}`;
        userSelect.appendChild(o);
      });
      userSelect.disabled = false;
    } catch (err) {
      messageEl.textContent = `Error loading users: ${err.message}`;
    }

    // Fetch courses in this learning path
    try {
      const cRes     = await fetch(`/api/courses?learningPathId=${encodeURIComponent(lpId)}`);
      const cData    = await cRes.json();
      const courses  = Array.isArray(cData.courses) ? cData.courses : [];

      courses.forEach(c => {
        const o = document.createElement('option');
        o.value       = c.id;
        o.textContent = c.title;
        courseSelect.appendChild(o);
      });
      courseSelect.disabled = false;
    } catch (err) {
      messageEl.textContent = `Error loading courses: ${err.message}`;
    }
  });

  // 3. Enable button when LP, a user, and a course are selected,
//    and show all three IDs plus startedAt whenever any of them changes
[lpSelect, userSelect, courseSelect].forEach(el =>
  el.addEventListener('change', () => {
    const lpId     = lpSelect.value;
    const userId   = userSelect.value;
    const courseId = courseSelect.value;
    const ready    = lpId && userId && courseId;

    // only allow “Mark Complete” when all three are chosen
    markBtn.disabled = !ready;

    // update the info box
    if (ready) {
      const startedAt = new Date(Date.now() - 60 * 1000).toISOString();
      selectedCourseIdDiv.textContent =
        `Learning Path ID: ${lpId}  |  User ID: ${userId}  |  Course ID: ${courseId}  |  Started At: ${startedAt}`;
    } else {
      selectedCourseIdDiv.textContent = '';
    }
  })
);


  // 4. Mark the course complete
  markBtn.addEventListener('click', async () => {
    markBtn.disabled      = true;
    messageEl.textContent = 'Marking…';

    try {
      const res = await fetch('/api/mark-complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:   userSelect.value,
          courseId: courseSelect.value
        })
      });

      const result = await res.json();
      if (res.ok) {
        messageEl.textContent = '✅ Course marked complete!';
      } else {
        let errMsg = result.error
          ? (typeof result.error === 'string'
              ? result.error
              : JSON.stringify(result.error, null, 2))
          : JSON.stringify(result);
        messageEl.textContent = `❌ Error: ${errMsg}`;
      }
    } catch (err) {
      messageEl.textContent = `❌ ${err.message}`;
    } finally {
      markBtn.disabled = false;
    }
  });

  loadLearningPaths();
});
