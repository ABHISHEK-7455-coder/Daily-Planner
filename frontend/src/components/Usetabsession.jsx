// // ─────────────────────────────────────────────────────────────
// // useTabSession.js — STRICT SINGLE-SESSION-PER-TAB isolation
// //
// // WHAT THIS SOLVES:
// // ─────────────────
// // Problem: Multiple tabs all share the same localStorage, causing:
// //   • Buddy messages from Tab A leaking into Tab B's chat history
// //   • Alarms/reminders triggering in EVERY tab simultaneously
// //   • Task mutations from Tab B overwriting Tab A's in-flight changes
// //   • Flow state (activeFlow, flowStep) getting corrupted across tabs
// //
// // HOW IT WORKS:
// // ─────────────
// // 1. On mount, each tab generates a unique `tabId` stored in
// //    sessionStorage (survives page refresh in the SAME tab only,
// //    dies when the tab closes — perfect isolation primitive).
// //
// // 2. BroadcastChannel is used ONLY for read-only coordination:
// //    • Tabs announce themselves on mount ("I own date X")
// //    • When a tab writes shared data (tasks, alarms) it broadcasts
// //      an invalidation event so other tabs can re-read.
// //    • No tab ever WRITES to another tab's session data.
// //
// // 3. Reminder/alarm deduplication:
// //    • The tab that scheduled a reminder "owns" it via tabId prefix
// //      in localStorage key.
// //    • checkPendingReminders() only processes reminders owned by
// //      the current tabId, preventing duplicate notifications.
// //
// // 4. Flow state is NEVER persisted to localStorage — it lives only
// //    in React state + refs, so it is inherently per-tab.
// //
// // USAGE (in ChatBuddy.jsx):
// // ──────────────────────────
// //   import { useTabSession, TabSyncProvider } from './useTabSession';
// //
// //   // Wrap your app root:
// //   <TabSyncProvider>
// //     <App />
// //   </TabSyncProvider>
// //
// //   // Inside AdvancedBuddy component:
// //   const { tabId, scheduleReminder, checkPendingReminders, broadcastTaskChange } = useTabSession();
// // ─────────────────────────────────────────────────────────────

// import { useEffect, useRef, useCallback, createContext, useContext, useState } from "react";

// // ── Context ──────────────────────────────────────────────────
// const TabSessionContext = createContext(null);

// // ── Generate or restore a stable tabId for this browser tab ──
// // sessionStorage persists across soft reloads but dies on tab close.
// function getOrCreateTabId() {
//   let id = sessionStorage.getItem("buddy-tab-id");
//   if (!id) {
//     id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//     sessionStorage.setItem("buddy-tab-id", id);
//   }
//   return id;
// }

// // ─────────────────────────────────────────────────────────────
// // TabSyncProvider — wrap your app root with this
// // ─────────────────────────────────────────────────────────────
// export function TabSyncProvider({ children }) {
//   const tabId = useRef(getOrCreateTabId()).current;
//   const channelRef = useRef(null);
//   const [otherTabDates, setOtherTabDates] = useState({}); // { tabId: dateKey }
//   const invalidationCallbacks = useRef(new Set());

//   useEffect(() => {
//     // Create a shared BroadcastChannel (same origin only)
//     const channel = new BroadcastChannel("buddy-tab-sync");
//     channelRef.current = channel;

//     // Announce ourselves
//     channel.postMessage({ type: "TAB_HELLO", tabId, date: sessionStorage.getItem("buddy-current-date") || "" });

//     channel.onmessage = (event) => {
//       const { type, tabId: senderId, date, reminderKey } = event.data;

//       if (senderId === tabId) return; // ignore own messages

//       switch (type) {
//         case "TAB_HELLO":
//         case "TAB_DATE_CHANGE":
//           setOtherTabDates(prev => ({ ...prev, [senderId]: date }));
//           // Reply so the new tab knows about us
//           if (type === "TAB_HELLO") {
//             channel.postMessage({
//               type: "TAB_DATE_CHANGE",
//               tabId,
//               date: sessionStorage.getItem("buddy-current-date") || ""
//             });
//           }
//           break;

//         case "TAB_GONE":
//           setOtherTabDates(prev => {
//             const next = { ...prev };
//             delete next[senderId];
//             return next;
//           });
//           break;

//         case "SHARED_DATA_CHANGED":
//           // Another tab mutated days-data — fire our invalidation callbacks
//           invalidationCallbacks.current.forEach(cb => cb(event.data));
//           break;

//         case "REMINDER_CLAIMED":
//           // Another tab is handling this reminder — skip it in our tab
//           // (handled inside scheduleReminder / checkPendingReminders)
//           break;

//         default:
//           break;
//       }
//     };

//     // Announce departure
//     const handleUnload = () => {
//       channel.postMessage({ type: "TAB_GONE", tabId });
//     };
//     window.addEventListener("beforeunload", handleUnload);

//     return () => {
//       handleUnload();
//       channel.close();
//       window.removeEventListener("beforeunload", handleUnload);
//     };
//   }, [tabId]);

//   // Broadcast that this tab changed date (so others know who "owns" what)
//   const broadcastDateChange = useCallback((date) => {
//     sessionStorage.setItem("buddy-current-date", date);
//     channelRef.current?.postMessage({ type: "TAB_DATE_CHANGE", tabId, date });
//   }, [tabId]);

//   // Broadcast that shared task/alarm data changed (other tabs should re-read localStorage)
//   const broadcastTaskChange = useCallback((changeType, payload = {}) => {
//     channelRef.current?.postMessage({ type: "SHARED_DATA_CHANGED", tabId, changeType, payload });
//   }, [tabId]);

//   // Register a callback to fire when another tab mutates shared data
//   const onSharedDataChanged = useCallback((cb) => {
//     invalidationCallbacks.current.add(cb);
//     return () => invalidationCallbacks.current.delete(cb);
//   }, []);

//   // ── Reminder scheduling — tab-scoped ─────────────────────
//   //
//   // Key insight: prefix every reminder with tabId so only the
//   // owning tab fires the notification. BroadcastChannel lets
//   // other tabs know to ignore a claimed reminder.
//   const scheduleReminder = useCallback(async (time, message, date) => {
//     const today = new Date().toISOString().slice(0, 10);
//     const resolvedDate = date || today;

//     const [hours, minutes] = (time || "00:00").split(":").map(Number);
//     const fireAt = new Date(
//       `${resolvedDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
//     );
//     const now = new Date();

//     // If already past, push forward
//     if (fireAt <= now) fireAt.setDate(fireAt.getDate() + 1);

//     const delay = fireAt.getTime() - now.getTime();
//     const reminderMsg = message || `Reminder at ${time}`;

//     if ("Notification" in window && Notification.permission === "default") {
//       await Notification.requestPermission();
//     }

//     // ── Tab-scoped storage key ───────────────────────────────
//     const storageKey = `pending-reminders-${tabId}`;
//     const reminders = JSON.parse(localStorage.getItem(storageKey) || "[]");
//     const reminder = {
//       id: `${tabId}-${Date.now()}`,
//       tabId,           // ownership marker
//       time,
//       date: resolvedDate,
//       message: reminderMsg,
//       scheduledFor: fireAt.toISOString(),
//     };
//     reminders.push(reminder);
//     localStorage.setItem(storageKey, JSON.stringify(reminders));

//     // Announce to other tabs that this reminder is claimed
//     channelRef.current?.postMessage({
//       type: "REMINDER_CLAIMED",
//       tabId,
//       reminderId: reminder.id,
//       scheduledFor: reminder.scheduledFor,
//     });

//     console.log(`[${tabId}] 🔔 Reminder scheduled: "${reminderMsg}" at ${fireAt.toISOString()} (in ${Math.round(delay / 60000)} min)`);

//     const timerId = setTimeout(async () => {
//       await fireNotification(reminderMsg, reminder.id, storageKey);
//     }, delay);

//     // Store timerId so we can cancel on unmount (edge case: user closes reminder)
//     sessionStorage.setItem(`reminder-timer-${reminder.id}`, String(timerId));
//   }, [tabId]);

//   // ── Re-hydrate on refresh: only process THIS tab's reminders ─
//   const checkPendingReminders = useCallback(() => {
//     const storageKey = `pending-reminders-${tabId}`;
//     const now = new Date();
//     const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
//     const stillPending = [];

//     for (const r of stored) {
//       // Safety: skip reminders that don't belong to this tab
//       if (r.tabId && r.tabId !== tabId) continue;

//       const fireAt = new Date(r.scheduledFor);

//       if (fireAt <= now) {
//         // Overdue — fire immediately
//         fireNotification(r.message, r.id, storageKey);
//       } else {
//         const delay = fireAt.getTime() - now.getTime();
//         const timerId = setTimeout(() => {
//           fireNotification(r.message, r.id, storageKey);
//         }, delay);
//         sessionStorage.setItem(`reminder-timer-${r.id}`, String(timerId));
//         stillPending.push(r);
//       }
//     }

//     localStorage.setItem(storageKey, JSON.stringify(stillPending));
//   }, [tabId]);

//   // ── Internal: actually show the notification ──────────────
//   const fireNotification = async (body, reminderId, storageKey) => {
//     if ("serviceWorker" in navigator && Notification.permission === "granted") {
//       try {
//         const reg = await navigator.serviceWorker.ready;
//         await reg.showNotification("AI Buddy Reminder ⏰", {
//           body,
//           icon: "/icon-192x192.png",
//           vibrate: [200, 100, 200],
//           tag: `buddy-reminder-${reminderId}`,
//           requireInteraction: true,
//           actions: [
//             { action: "open", title: "Open App 📱" },
//             { action: "dismiss", title: "Got it ✓" },
//           ],
//         });
//       } catch {
//         if (Notification.permission === "granted") {
//           new Notification("AI Buddy ⏰", { body });
//         }
//       }
//     }
//     // Clean up from localStorage
//     const updated = JSON.parse(localStorage.getItem(storageKey) || "[]");
//     localStorage.setItem(storageKey, JSON.stringify(updated.filter(r => r.id !== reminderId)));
//   };

//   const value = {
//     tabId,
//     otherTabDates,
//     broadcastDateChange,
//     broadcastTaskChange,
//     onSharedDataChanged,
//     scheduleReminder,
//     checkPendingReminders,
//   };

//   return (
//     <TabSessionContext.Provider value={value}>
//       {children}
//     </TabSessionContext.Provider>
//   );
// }

// // ─────────────────────────────────────────────────────────────
// // useTabSession — consume inside any component
// // ─────────────────────────────────────────────────────────────
// export function useTabSession() {
//   const ctx = useContext(TabSessionContext);
//   if (!ctx) throw new Error("useTabSession must be used inside <TabSyncProvider>");
//   return ctx;
// }

// // ─────────────────────────────────────────────────────────────
// // useSessionSafeChat — per-tab chat message store
// //
// // Replaces the plain useState([]) in AdvancedBuddy for messages.
// // Messages are stored in sessionStorage (tab-local), so:
// //   • Tab A's chat history never appears in Tab B
// //   • Refreshing Tab A restores its own history
// //   • Closing Tab A clears its history permanently
// // ─────────────────────────────────────────────────────────────
// export function useSessionSafeChat(tabId) {
//   const storageKey = `chat-messages-${tabId}`;

//   const load = () => {
//     try {
//       return JSON.parse(sessionStorage.getItem(storageKey) || "[]");
//     } catch {
//       return [];
//     }
//   };

//   const [messages, setMessagesState] = useState(load);

//   const setMessages = useCallback((updater) => {
//     setMessagesState(prev => {
//       const next = typeof updater === "function" ? updater(prev) : updater;
//       try {
//         // Only persist non-interim messages to avoid stale voice transcripts
//         const toSave = next.filter(m => !m.interim);
//         sessionStorage.setItem(storageKey, JSON.stringify(toSave.slice(-60))); // cap at 60 msgs
//       } catch {
//         // sessionStorage quota — silently drop oldest
//       }
//       return next;
//     });
//   }, [storageKey]);

//   const clearMessages = useCallback(() => {
//     sessionStorage.removeItem(storageKey);
//     setMessagesState([]);
//   }, [storageKey]);

//   return { messages, setMessages, clearMessages };
// }

// // ─────────────────────────────────────────────────────────────
// // useSessionSafeFlow — per-tab flow state (NO cross-tab leakage)
// //
// // Flow state (activeFlow, flowStep, flowData) must NEVER persist
// // to localStorage. This hook provides the same ref+state dual
// // pattern as before but explicitly bound to the current tab only.
// // ─────────────────────────────────────────────────────────────
// export function useSessionSafeFlow() {
//   const [activeFlow, setActiveFlowState] = useState(null);
//   const [flowStep, setFlowStepState] = useState(null);
//   const [flowData, setFlowDataState] = useState({});

//   const activeFlowRef = useRef(null);
//   const flowStepRef = useRef(null);
//   const flowDataRef = useRef({});

//   const setActiveFlow = useCallback((v) => {
//     activeFlowRef.current = v;
//     setActiveFlowState(v);
//   }, []);

//   const setFlowStep = useCallback((v) => {
//     flowStepRef.current = v;
//     setFlowStepState(v);
//   }, []);

//   const setFlowData = useCallback((v) => {
//     flowDataRef.current = v;
//     setFlowDataState(v);
//   }, []);

//   const resetFlow = useCallback(() => {
//     activeFlowRef.current = null;
//     flowStepRef.current = null;
//     flowDataRef.current = {};
//     setActiveFlowState(null);
//     setFlowStepState(null);
//     setFlowDataState({});
//   }, []);

//   return {
//     activeFlow, setActiveFlow, activeFlowRef,
//     flowStep, setFlowStep, flowStepRef,
//     flowData, setFlowData, flowDataRef,
//     resetFlow,
//   };
// }

// // ─────────────────────────────────────────────────────────────
// // useOutOfSyncDetector — implements the strict single-session rule
// //
// // Detects if the conversation appears "out of sync" based on:
// //   1. Message order anomalies (user→user or assistant→assistant runs > 3)
// //   2. Timestamp reversals (newer message appears before older)
// //   3. Flow state mismatch (flowStep set but no activeFlow)
// //
// // Returns: { isOutOfSync, reason, resetSync }
// // ─────────────────────────────────────────────────────────────
// export function useOutOfSyncDetector(messages, activeFlow, flowStep) {
//   const [isOutOfSync, setIsOutOfSync] = useState(false);
//   const [reason, setReason] = useState(null);

//   useEffect(() => {
//     if (messages.length < 2) { setIsOutOfSync(false); return; }

//     // Check for timestamp reversal
//     for (let i = 1; i < messages.length; i++) {
//       const prev = messages[i - 1];
//       const curr = messages[i];
//       if (prev.timestamp && curr.timestamp) {
//         if (new Date(curr.timestamp) < new Date(prev.timestamp)) {
//           setIsOutOfSync(true);
//           setReason("timestamp_reversal");
//           return;
//         }
//       }
//     }

//     // Check for orphaned flow state
//     if (flowStep && !activeFlow) {
//       setIsOutOfSync(true);
//       setReason("orphaned_flow_step");
//       return;
//     }

//     // Check for excessive same-role consecutive messages (> 4 in a row)
//     let streak = 1;
//     for (let i = 1; i < messages.length; i++) {
//       if (messages[i].role === messages[i - 1].role && !messages[i].interim) {
//         streak++;
//         if (streak > 4) {
//           setIsOutOfSync(true);
//           setReason("role_streak");
//           return;
//         }
//       } else {
//         streak = 1;
//       }
//     }

//     setIsOutOfSync(false);
//     setReason(null);
//   }, [messages, activeFlow, flowStep]);

//   const resetSync = useCallback(() => {
//     setIsOutOfSync(false);
//     setReason(null);
//   }, []);

//   return { isOutOfSync, reason, resetSync };
// }
import { useEffect, useRef, useCallback, createContext, useContext, useState } from "react";

const TabSessionContext = createContext(null);

function getOrCreateTabId() {
  let id = sessionStorage.getItem("buddy-tab-id");
  if (!id) {
    id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("buddy-tab-id", id);
  }
  return id;
}

export function TabSyncProvider({ children }) {
  const tabId = useRef(getOrCreateTabId()).current;
  const channelRef = useRef(null);
  const isClosedRef = useRef(false);
  const [otherTabDates, setOtherTabDates] = useState({});
  const invalidationCallbacks = useRef(new Set());

  useEffect(() => {
    isClosedRef.current = false;

    const channel = new BroadcastChannel("buddy-tab-sync");
    channelRef.current = channel;

    const safePost = (msg) => {
      if (!isClosedRef.current && channel.readyState !== "closed") {
        try { channel.postMessage(msg); } catch (_) {}
      }
    };

    safePost({ type: "TAB_HELLO", tabId, date: sessionStorage.getItem("buddy-current-date") || "" });

    channel.onmessage = (event) => {
      const { type, tabId: senderId, date } = event.data;
      if (senderId === tabId) return;

      switch (type) {
        case "TAB_HELLO":
        case "TAB_DATE_CHANGE":
          setOtherTabDates(prev => ({ ...prev, [senderId]: date }));
          if (type === "TAB_HELLO") {
            safePost({ type: "TAB_DATE_CHANGE", tabId, date: sessionStorage.getItem("buddy-current-date") || "" });
          }
          break;
        case "TAB_GONE":
          setOtherTabDates(prev => { const next = { ...prev }; delete next[senderId]; return next; });
          break;
        case "SHARED_DATA_CHANGED":
          invalidationCallbacks.current.forEach(cb => cb(event.data));
          break;
        default:
          break;
      }
    };

    const handleUnload = () => safePost({ type: "TAB_GONE", tabId });
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      isClosedRef.current = true;
      window.removeEventListener("beforeunload", handleUnload);
      try { channel.postMessage({ type: "TAB_GONE", tabId }); } catch (_) {}
      channel.close();
      channelRef.current = null;
    };
  }, [tabId]);

  const broadcastDateChange = useCallback((date) => {
    sessionStorage.setItem("buddy-current-date", date);
    if (!isClosedRef.current && channelRef.current) {
      try { channelRef.current.postMessage({ type: "TAB_DATE_CHANGE", tabId, date }); } catch (_) {}
    }
  }, [tabId]);

  const broadcastTaskChange = useCallback((changeType, payload = {}) => {
    if (!isClosedRef.current && channelRef.current) {
      try { channelRef.current.postMessage({ type: "SHARED_DATA_CHANGED", tabId, changeType, payload }); } catch (_) {}
    }
  }, [tabId]);

  const onSharedDataChanged = useCallback((cb) => {
    invalidationCallbacks.current.add(cb);
    return () => invalidationCallbacks.current.delete(cb);
  }, []);

  const fireNotification = async (body, reminderId, storageKey) => {
    if ("serviceWorker" in navigator && Notification.permission === "granted") {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification("AI Buddy Reminder ⏰", {
          body, icon: "/icon-192x192.png", vibrate: [200, 100, 200],
          tag: `buddy-reminder-${reminderId}`, requireInteraction: true,
        });
      } catch {
        if (Notification.permission === "granted") new Notification("AI Buddy ⏰", { body });
      }
    }
    const updated = JSON.parse(localStorage.getItem(storageKey) || "[]");
    localStorage.setItem(storageKey, JSON.stringify(updated.filter(r => r.id !== reminderId)));
  };

  const scheduleReminder = useCallback(async (time, message, date) => {
    const today = new Date().toISOString().slice(0, 10);
    const resolvedDate = date || today;
    const [hours, minutes] = (time || "00:00").split(":").map(Number);
    const fireAt = new Date(`${resolvedDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
    const now = new Date();
    if (fireAt <= now) fireAt.setDate(fireAt.getDate() + 1);

    const delay = fireAt.getTime() - now.getTime();
    const reminderMsg = message || `Reminder at ${time}`;

    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    const storageKey = `pending-reminders-${tabId}`;
    const reminders = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const reminder = {
      id: `${tabId}-${Date.now()}`, tabId, time,
      date: resolvedDate, message: reminderMsg,
      scheduledFor: fireAt.toISOString(),
    };
    reminders.push(reminder);
    localStorage.setItem(storageKey, JSON.stringify(reminders));

    if (!isClosedRef.current && channelRef.current) {
      try { channelRef.current.postMessage({ type: "REMINDER_CLAIMED", tabId, reminderId: reminder.id }); } catch (_) {}
    }

    setTimeout(async () => {
      await fireNotification(reminderMsg, reminder.id, storageKey);
    }, delay);
  }, [tabId]);

  const checkPendingReminders = useCallback(() => {
    const storageKey = `pending-reminders-${tabId}`;
    const now = new Date();
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    const stillPending = [];

    for (const r of stored) {
      if (r.tabId && r.tabId !== tabId) continue;
      const fireAt = new Date(r.scheduledFor);
      if (fireAt <= now) {
        fireNotification(r.message, r.id, storageKey);
      } else {
        setTimeout(() => fireNotification(r.message, r.id, storageKey), fireAt.getTime() - now.getTime());
        stillPending.push(r);
      }
    }
    localStorage.setItem(storageKey, JSON.stringify(stillPending));
  }, [tabId]);

  const value = { tabId, otherTabDates, broadcastDateChange, broadcastTaskChange, onSharedDataChanged, scheduleReminder, checkPendingReminders };

  return <TabSessionContext.Provider value={value}>{children}</TabSessionContext.Provider>;
}

export function useTabSession() {
  const ctx = useContext(TabSessionContext);
  if (!ctx) throw new Error("useTabSession must be used inside <TabSyncProvider>");
  return ctx;
}

export function useSessionSafeChat(tabId) {
  const storageKey = `chat-messages-${tabId}`;
  const load = () => { try { return JSON.parse(sessionStorage.getItem(storageKey) || "[]"); } catch { return []; } };
  const [messages, setMessagesState] = useState(load);

  const setMessages = useCallback((updater) => {
    setMessagesState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(next.filter(m => !m.interim).slice(-60)));
      } catch {}
      return next;
    });
  }, [storageKey]);

  const clearMessages = useCallback(() => {
    sessionStorage.removeItem(storageKey);
    setMessagesState([]);
  }, [storageKey]);

  return { messages, setMessages, clearMessages };
}

export function useSessionSafeFlow() {
  const [activeFlow, setActiveFlowState] = useState(null);
  const [flowStep,   setFlowStepState]   = useState(null);
  const [flowData,   setFlowDataState]   = useState({});
  const activeFlowRef = useRef(null);
  const flowStepRef   = useRef(null);
  const flowDataRef   = useRef({});

  const setActiveFlow = useCallback((v) => { activeFlowRef.current = v; setActiveFlowState(v); }, []);
  const setFlowStep   = useCallback((v) => { flowStepRef.current   = v; setFlowStepState(v);   }, []);
  const setFlowData   = useCallback((v) => { flowDataRef.current   = v; setFlowDataState(v);   }, []);
  const resetFlow     = useCallback(() => {
    activeFlowRef.current = null; flowStepRef.current = null; flowDataRef.current = {};
    setActiveFlowState(null); setFlowStepState(null); setFlowDataState({});
  }, []);

  return { activeFlow, setActiveFlow, activeFlowRef, flowStep, setFlowStep, flowStepRef, flowData, setFlowData, flowDataRef, resetFlow };
}

export function useOutOfSyncDetector(messages, activeFlow, flowStep) {
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  const [reason, setReason] = useState(null);

  useEffect(() => {
    if (messages.length < 2) { setIsOutOfSync(false); return; }
    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1], curr = messages[i];
      if (prev.timestamp && curr.timestamp && new Date(curr.timestamp) < new Date(prev.timestamp)) {
        setIsOutOfSync(true); setReason("timestamp_reversal"); return;
      }
    }
    if (flowStep && !activeFlow) { setIsOutOfSync(true); setReason("orphaned_flow_step"); return; }
    let streak = 1;
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === messages[i - 1].role && !messages[i].interim) {
        if (++streak > 4) { setIsOutOfSync(true); setReason("role_streak"); return; }
      } else { streak = 1; }
    }
    setIsOutOfSync(false); setReason(null);
  }, [messages, activeFlow, flowStep]);

  const resetSync = useCallback(() => { setIsOutOfSync(false); setReason(null); }, []);
  return { isOutOfSync, reason, resetSync };
}