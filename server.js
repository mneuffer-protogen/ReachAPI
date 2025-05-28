require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY  = process.env.API_KEY;
const BASE_URL = process.env.REACH360_BASE_URL || 'https://api.reach360.com';

// ─── 1. GET /api/learning-paths[?userId] ──────────────────────────────────────
//    If no userId → return all learning paths.
//    If userId    → return only those the user is enrolled in.
app.get('/api/learning-paths', async function(req, res) {
  const userId = req.query.userId;
  try {
    // fetch all learning paths
    const lpResp = await axios.get(BASE_URL + '/learning-paths', {
      headers: { Authorization: 'Bearer ' + API_KEY }
    });
    const allLPs = Array.isArray(lpResp.data.learningPaths)
      ? lpResp.data.learningPaths
      : [];

    if (!userId) {
      return res.json({ learningPaths: allLPs });
    }

    // filter to only those where the user appears in the learners report
    const enrolled = [];
    for (let i = 0; i < allLPs.length; i++) {
      const lp = allLPs[i];
      try {
        const learnersResp = await axios.get(
          BASE_URL + '/reports/learning-paths/' + lp.id + '/learners',
          { headers: { Authorization: 'Bearer ' + API_KEY } }
        );
        const learners = Array.isArray(learnersResp.data.learners)
          ? learnersResp.data.learners
          : [];
        for (let j = 0; j < learners.length; j++) {
          if (learners[j].userId === userId) {
            enrolled.push(lp);
            break;
          }
        }
      } catch (_) {
        // ignore errors for individual LP reports
      }
    }
    return res.json({ learningPaths: enrolled });
  } catch (err) {
    const status = err.response && err.response.status
      ? err.response.status
      : 500;
    const data = err.response && err.response.data
      ? err.response.data
      : err.message;
    return res.status(status).json({ error: data });
  }
});

// ─── 2. GET /api/users?email=… OR ?learningPathId=… ────────────────────────────
//    If email       → search users by email.
//    If learningPathId → list learners in that path.
app.get('/api/users', async function(req, res) {
  const email = req.query.email;
  const lpId  = req.query.learningPathId;

  if (email) {
    // lookup by email
    try {
      const resp = await axios.get(BASE_URL + '/users', {
        headers: { Authorization: 'Bearer ' + API_KEY },
        params: { email: email }
      });
      const users = Array.isArray(resp.data.users) ? resp.data.users : [];
      return res.json({ users: users });
    } catch (err) {
      const status = err.response && err.response.status
        ? err.response.status
        : 500;
      const data = err.response && err.response.data
        ? err.response.data
        : err.message;
      return res.status(status).json({ error: data });
    }
  } else if (lpId) {
    // list learners in LP
    try {
      const resp = await axios.get(
        BASE_URL + '/reports/learning-paths/' + lpId + '/learners',
        { headers: { Authorization: 'Bearer ' + API_KEY } }
      );
      const learners = Array.isArray(resp.data.learners)
        ? resp.data.learners
        : [];
      const users = learners.map(function(l) {
        return { id: l.userId, firstName: l.firstName, lastName: l.lastName };
      });
      return res.json({ users: users });
    } catch (err) {
      const status = err.response && err.response.status
        ? err.response.status
        : 500;
      const data = err.response && err.response.data
        ? err.response.data
        : err.message;
      return res.status(status).json({ error: data });
    }
  } else {
    return res
      .status(400)
      .json({ error: 'Either email or learningPathId is required' });
  }
});

// ─── 3. GET /api/courses?learningPathId=… ─────────────────────────────────────
app.get('/api/courses', async function(req, res) {
  const lpId = req.query.learningPathId;
  if (!lpId) {
    return res.status(400).json({ error: 'learningPathId is required' });
  }
  try {
    const resp = await axios.get(
      BASE_URL + '/learning-paths/' + lpId + '/courses',
      { headers: { Authorization: 'Bearer ' + API_KEY } }
    );
    const courses = Array.isArray(resp.data.courses) ? resp.data.courses : [];
    return res.json({ courses: courses });
  } catch (err) {
    const status = err.response && err.response.status
      ? err.response.status
      : 500;
    const data = err.response && err.response.data
      ? err.response.data
      : err.message;
    return res.status(status).json({ error: data });
  }
});

// ─── 4. POST /api/mark-complete ────────────────────────────────────────────────
//    Import completion (ensuring completedAt > startedAt)
app.post('/api/mark-complete', async function(req, res) {
  const userId   = req.body.userId;
  const courseId = req.body.courseId;
  if (!userId || !courseId) {
    return res
      .status(400)
      .json({ error: 'userId and courseId are required' });
  }
  try {
    const now        = new Date();
    const completedAt = now.toISOString();
    const startedAt   = new Date(now.getTime() - 60 * 1000).toISOString();

    const resp = await axios.post(
      BASE_URL + '/courses/' + courseId + '/users/' + userId + '/completions',
      { startedAt: startedAt, completedAt: completedAt },
      {
        headers: {
          Authorization: 'Bearer ' + API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    return res.status(resp.status).json({ success: true });
  } catch (err) {
    const status = err.response && err.response.status
      ? err.response.status
      : 500;
    const data = err.response && err.response.data
      ? err.response.data
      : err.message;
    return res.status(status).json({ error: data });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
  console.log('Server listening on port ' + PORT);
});
