document.addEventListener('DOMContentLoaded', function() {
  var emailInput   = document.getElementById('emailInput');
  var loadBtn      = document.getElementById('loadBtn');
  var lpSelect     = document.getElementById('lpSelect');
  var courseSelect = document.getElementById('courseSelect');
  var markBtn      = document.getElementById('markBtn');
  var messageEl    = document.getElementById('message');
  var userId       = null;

  // Step 1: lookup user by email
  loadBtn.addEventListener('click', async function() {
    messageEl.textContent = '';
    userId = null;
    lpSelect.innerHTML     = '<option value="">-- Select a Learning Path --</option>';
    courseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
    lpSelect.disabled      = true;
    courseSelect.disabled  = true;
    markBtn.disabled       = true;

    var email = emailInput.value.trim();
    if (!email) {
      messageEl.textContent = 'Please enter an email.';
      return;
    }

    try {
      var res  = await fetch('/api/users?email=' + encodeURIComponent(email));
      var data = await res.json();
      if (!data.users || data.users.length === 0) {
        messageEl.textContent = 'No user found with that email.';
        return;
      }
      userId = data.users[0].id;
    } catch (err) {
      messageEl.textContent = 'Error fetching user: ' + err.message;
      return;
    }

    // Step 2: load only the LPs that user is enrolled in
    try {
      var res2  = await fetch('/api/learning-paths?userId=' + encodeURIComponent(userId));
      var data2 = await res2.json();
      var lps   = Array.isArray(data2.learningPaths) ? data2.learningPaths : [];

      lps.forEach(function(lp) {
        var o = document.createElement('option');
        o.value       = lp.id;
        o.textContent = lp.title;
        lpSelect.appendChild(o);
      });
      lpSelect.disabled = false;
    } catch (err) {
      messageEl.textContent = 'Error loading learning paths: ' + err.message;
    }
  });

  // Step 3: when LP selected, load its courses
  lpSelect.addEventListener('change', async function() {
    var lpId = lpSelect.value;
    courseSelect.innerHTML = '<option value="">-- Select a Course --</option>';
    courseSelect.disabled  = true;
    markBtn.disabled       = true;
    messageEl.textContent  = '';

    if (!lpId) return;

    try {
      var res  = await fetch('/api/courses?learningPathId=' + encodeURIComponent(lpId));
      var data = await res.json();
      var courses = Array.isArray(data.courses) ? data.courses : [];

      courses.forEach(function(c) {
        var o = document.createElement('option');
        o.value       = c.id;
        o.textContent = c.title;
        courseSelect.appendChild(o);
      });
      courseSelect.disabled = false;
    } catch (err) {
      messageEl.textContent = 'Error loading courses: ' + err.message;
    }
  });

  // Step 4: enable mark button when course chosen
  courseSelect.addEventListener('change', function() {
    markBtn.disabled = !courseSelect.value;
  });

  // Step 5: mark complete
  markBtn.addEventListener('click', async function() {
    markBtn.disabled      = true;
    messageEl.textContent = 'Marking…';

    try {
      var res = await fetch('/api/mark-complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          userId:   userId,
          courseId: courseSelect.value
        })
      });
      var result = await res.json();

      if (res.ok) {
        messageEl.textContent = '✅ Course marked complete!';
      } else {
        var errMsg = result.error && typeof result.error === 'object'
          ? JSON.stringify(result.error, null, 2)
          : result.error || JSON.stringify(result);
        messageEl.textContent = '❌ Error: ' + errMsg;
      }
    } catch (err) {
      messageEl.textContent = '❌ ' + err.message;
    } finally {
      markBtn.disabled = false;
    }
  });
});
