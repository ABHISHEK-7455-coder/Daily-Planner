import { useEffect, useRef } from "react";

export default function GentleNotifications({ tasks }) {
  const morningShownRef = useRef(false);
  const nightShownRef = useRef(false);

  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (Notification.permission !== "granted") return;

    const today = new Date().toDateString();
    const morningKey = `morning-notif-${today}`;
    const nightKey = `night-notif-${today}`;

    // Check if already shown today
    if (localStorage.getItem(morningKey)) {
      morningShownRef.current = true;
    }
    if (localStorage.getItem(nightKey)) {
      nightShownRef.current = true;
    }

    // Get earliest morning task time
    const morningTasks = tasks.filter(t => t.timeOfDay === "morning");
    let morningStart = null;
    
    if (morningTasks.length > 0) {
      // Default morning start: 8:00 AM
      morningStart = new Date();
      morningStart.setHours(8, 0, 0, 0);
    }

    // Get latest evening task time
    const eveningTasks = tasks.filter(t => t.timeOfDay === "evening");
    let eveningEnd = null;
    
    if (eveningTasks.length > 0) {
      // Default evening end: 10:00 PM
      eveningEnd = new Date();
      eveningEnd.setHours(22, 0, 0, 0);
    }

    const now = new Date();
    const timers = [];

    // 🌤️ MORNING NOTIFICATION (10 min before morning starts)
    if (morningStart && !morningShownRef.current) {
      const notifyTime = new Date(morningStart);
      notifyTime.setMinutes(notifyTime.getMinutes() - 10);

      if (now < notifyTime) {
        const delay = notifyTime - now;
        const timer = setTimeout(() => {
          new Notification("A new day is starting 🌤️", {
            body: "You can take a quiet look at what you planned today.",
            silent: true,
            requireInteraction: false
          });
          localStorage.setItem(morningKey, "true");
          morningShownRef.current = true;
        }, delay);
        timers.push(timer);
      }
    }

    // 🌙 NIGHT NOTIFICATION (30 min before evening ends)
    if (eveningEnd && !nightShownRef.current) {
      const notifyTime = new Date(eveningEnd);
      notifyTime.setMinutes(notifyTime.getMinutes() - 30);

      if (now < notifyTime) {
        const delay = notifyTime - now;
        const timer = setTimeout(() => {
          new Notification("The day is settling down 🌙", {
            body: "If you want, you can review today and carry anything forward.",
            silent: true,
            requireInteraction: false
          });
          localStorage.setItem(nightKey, "true");
          nightShownRef.current = true;
        }, delay);
        timers.push(timer);
      }
    }

    // Cleanup
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [tasks]);

  // This component renders nothing
  return null;
}