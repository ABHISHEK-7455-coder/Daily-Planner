// services/mongoApi.js
// All data (tasks, notes, alarms) is now stored in MongoDB via your backend API.
// This replaces ALL localStorage reads/writes for task data.
//
// Your backend must expose:  http://localhost:3001/api/...
// Each request sends the Firebase ID token for auth.

import { auth } from "../Firebase";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── Get a fresh Firebase ID token for every request ──────────
async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// TASKS  (replaces days-data-{userId} localStorage)
// ══════════════════════════════════════════════════════════════

/** Load all days data: { "2025-01-01": { tasks: [], reflection: null }, ... } */
export const loadAllDays = async () => {
  try {
    return await apiFetch("/api/days");
  } catch (e) {
    console.error("loadAllDays failed:", e);
    return {};
  }
};

/** Load one day */
export const loadDay = async (dateKey) => {
  try {
    return await apiFetch(`/api/days/${dateKey}`);
  } catch (e) {
    console.error("loadDay failed:", e);
    return { date: dateKey, tasks: [], reflection: null };
  }
};

/** Save tasks for a day */
export const saveDay = async (dateKey, { tasks, reflection }) => {
  try {
    return await apiFetch(`/api/days/${dateKey}`, {
      method: "PUT",
      body: JSON.stringify({ tasks, reflection }),
    });
  } catch (e) {
    console.error("saveDay failed:", e);
  }
};

// ══════════════════════════════════════════════════════════════
// NOTES  (replaces daily-notes-{userId} localStorage)
// ══════════════════════════════════════════════════════════════

export const loadNote = async (dateKey) => {
  try {
    const data = await apiFetch(`/api/notes/${dateKey}`);
    return data.content || "";
  } catch (e) {
    return "";
  }
};

export const saveNote = async (dateKey, content) => {
  try {
    return await apiFetch(`/api/notes/${dateKey}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    console.error("saveNote failed:", e);
  }
};

export const appendNote = async (dateKey, content) => {
  try {
    return await apiFetch(`/api/notes/${dateKey}/append`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    console.error("appendNote failed:", e);
  }
};

// ══════════════════════════════════════════════════════════════
// ALARMS  (replaces alarms-{userId} localStorage)
// ══════════════════════════════════════════════════════════════

export const loadAlarms = async () => {
  try {
    return await apiFetch("/api/alarms");
  } catch (e) {
    return [];
  }
};

export const saveAlarms = async (alarms) => {
  try {
    return await apiFetch("/api/alarms", {
      method: "PUT",
      body: JSON.stringify({ alarms }),
    });
  } catch (e) {
    console.error("saveAlarms failed:", e);
  }
};