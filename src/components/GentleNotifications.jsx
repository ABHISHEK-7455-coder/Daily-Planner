// import { useEffect, useRef } from "react";

// export default function GentleNotifications({ tasks }) {
//   const morningShownRef = useRef(false);
//   const nightShownRef = useRef(false);

//   useEffect(() => {
//     // Request notification permission on mount
//     if ("Notification" in window && Notification.permission === "default") {
//       Notification.requestPermission();
//     }
//   }, []);

//   useEffect(() => {
//     if (Notification.permission !== "granted") return;

//     const today = new Date().toDateString();
//     const morningKey = `morning-notif-${today}`;
//     const nightKey = `night-notif-${today}`;

//     // Check if already shown today
//     if (localStorage.getItem(morningKey)) {
//       morningShownRef.current = true;
//     }
//     if (localStorage.getItem(nightKey)) {
//       nightShownRef.current = true;
//     }

//     // Get earliest morning task time
//     const morningTasks = tasks.filter(t => t.timeOfDay === "morning");
//     let morningStart = null;
    
//     if (morningTasks.length > 0) {
//       // Default morning start: 8:00 AM
//       morningStart = new Date();
//       morningStart.setHours(8, 0, 0, 0);
//     }

//     // Get latest evening task time
//     const eveningTasks = tasks.filter(t => t.timeOfDay === "evening");
//     let eveningEnd = null;
    
//     if (eveningTasks.length > 0) {
//       // Default evening end: 10:00 PM
//       eveningEnd = new Date();
//       eveningEnd.setHours(22, 0, 0, 0);
//     }

//     const now = new Date();
//     const timers = [];

//     // 🌤️ MORNING NOTIFICATION (10 min before morning starts)
//     if (morningStart && !morningShownRef.current) {
//       const notifyTime = new Date(morningStart);
//       notifyTime.setMinutes(notifyTime.getMinutes() - 10);

//       if (now < notifyTime) {
//         const delay = notifyTime - now;
//         const timer = setTimeout(() => {
//           new Notification("A new day is starting 🌤️", {
//             body: "You can take a quiet look at what you planned today.",
//             silent: true,
//             requireInteraction: false
//           });
//           localStorage.setItem(morningKey, "true");
//           morningShownRef.current = true;
//         }, delay);
//         timers.push(timer);
//       }
//     }

//     // 🌙 NIGHT NOTIFICATION (30 min before evening ends)
//     if (eveningEnd && !nightShownRef.current) {
//       const notifyTime = new Date(eveningEnd);
//       notifyTime.setMinutes(notifyTime.getMinutes() - 30);

//       if (now < notifyTime) {
//         const delay = notifyTime - now;
//         const timer = setTimeout(() => {
//           new Notification("The day is settling down 🌙", {
//             body: "If you want, you can review today and carry anything forward.",
//             silent: true,
//             requireInteraction: false
//           });
//           localStorage.setItem(nightKey, "true");
//           nightShownRef.current = true;
//         }, delay);
//         timers.push(timer);
//       }
//     }

//     // Cleanup
//     return () => {
//       timers.forEach(timer => clearTimeout(timer));
//     };
//   }, [tasks]);

//   // This component renders nothing
//   return null;
// }
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
    if (Notification.permission !== "granted") {
      console.log("Notification permission not granted");
      return;
    }

    const now = new Date();
    const today = now.toDateString();
    const morningKey = `morning-notif-${today}`;
    const nightKey = `night-notif-${today}`;

    // Check if already shown today
    if (localStorage.getItem(morningKey)) {
      morningShownRef.current = true;
    }
    if (localStorage.getItem(nightKey)) {
      nightShownRef.current = true;
    }

    const timers = [];

    // 🌤️ MORNING NOTIFICATION at 8:00 AM
    if (!morningShownRef.current) {
      const morningTime = new Date();
      morningTime.setHours(8, 0, 0, 0);

      // If it's already past 8 AM today, schedule for tomorrow
      if (now > morningTime) {
        morningTime.setDate(morningTime.getDate() + 1);
      }

      const delay = morningTime - now;
      console.log(`Morning notification scheduled in ${delay / 1000 / 60} minutes`);

      const timer = setTimeout(() => {
        new Notification("A new day is starting 🌤️", {
          body: "You can take a quiet look at what you planned today.",
          silent: false,
          requireInteraction: false,
          icon: "📅"
        });
        localStorage.setItem(morningKey, "true");
        morningShownRef.current = true;
        console.log("Morning notification sent!");
      }, delay);
      
      timers.push(timer);
    }

    // 🌙 NIGHT NOTIFICATION at 9:30 PM (21:30)
    if (!nightShownRef.current) {
      const nightTime = new Date();
      nightTime.setHours(21, 30, 0, 0);

      // If it's already past 9:30 PM today, schedule for tomorrow
      if (now > nightTime) {
        nightTime.setDate(nightTime.getDate() + 1);
      }

      const delay = nightTime - now;
      console.log(`Night notification scheduled in ${delay / 1000 / 60} minutes`);

      const timer = setTimeout(() => {
        new Notification("The day is settling down 🌙", {
          body: "If you want, you can review today and carry anything forward.",
          silent: false,
          requireInteraction: false,
          icon: "📅"
        });
        localStorage.setItem(nightKey, "true");
        nightShownRef.current = true;
        console.log("Night notification sent!");
      }, delay);
      
      timers.push(timer);
    }

    // 🧪 TEST NOTIFICATION (fires in 5 seconds for testing)
    // Uncomment this to test if notifications work at all
    /*
    const testTimer = setTimeout(() => {
      new Notification("Test Notification 🔔", {
        body: "If you see this, notifications are working!",
        silent: false
      });
      console.log("Test notification sent!");
    }, 5000);
    timers.push(testTimer);
    */

    // Cleanup
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [tasks]);

  // This component renders nothing
  return null;
}