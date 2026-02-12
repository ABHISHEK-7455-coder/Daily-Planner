import { useEffect, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════
// DISTRACTION MONITOR HOOK
// Tracks user behavior and detects distraction patterns
// ═══════════════════════════════════════════════════════════════

export function useDistractionMonitor({ 
  onDistractionDetected, 
  isDeepWorkMode = false,
  language = "hinglish" 
}) {
  const [stats, setStats] = useState({
    tabSwitches: 0,
    scrollEvents: 0,
    lastActivity: Date.now(),
    distractionLevel: 0 // 0-100
  });

  const behaviorsRef = useRef({
    tabSwitchTimes: [],
    scrollTimes: [],
    focusLossTimes: [],
    lastWarning: 0
  });

  const scrollVelocityRef = useRef([]);
  const visibilityCheckRef = useRef(null);

  // ═══════════════════════════════════════════════════════════
  // TAB SWITCH DETECTION
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // User switched away from tab
        behaviorsRef.current.tabSwitchTimes.push(now);
        behaviorsRef.current.focusLossTimes.push(now);
        
        // Keep only last 10 minutes of data
        const tenMinutesAgo = now - 10 * 60 * 1000;
        behaviorsRef.current.tabSwitchTimes = behaviorsRef.current.tabSwitchTimes
          .filter(t => t > tenMinutesAgo);
        
        setStats(prev => ({
          ...prev,
          tabSwitches: prev.tabSwitches + 1,
          lastActivity: now
        }));

        // Check for excessive switching
        checkTabSwitchPattern(now);
      } else {
        // User returned to tab
        console.log("👀 User returned to tab");
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // SCROLL BEHAVIOR DETECTION
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastScrollTime = Date.now();
    let scrollCount = 0;

    const handleScroll = () => {
      const now = Date.now();
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);
      const timeDelta = now - lastScrollTime;

      if (timeDelta > 0) {
        const velocity = scrollDelta / timeDelta;
        scrollVelocityRef.current.push({ velocity, time: now });

        // Keep only last 30 seconds
        const thirtySecondsAgo = now - 30 * 1000;
        scrollVelocityRef.current = scrollVelocityRef.current
          .filter(s => s.time > thirtySecondsAgo);

        // Detect rapid scrolling (distraction pattern)
        if (velocity > 2) { // Fast scrolling
          scrollCount++;
          behaviorsRef.current.scrollTimes.push(now);
          
          setStats(prev => ({
            ...prev,
            scrollEvents: prev.scrollEvents + 1,
            lastActivity: now
          }));
        }

        // Check for mindless scrolling
        if (scrollCount > 20) { // 20+ rapid scrolls
          checkScrollPattern(now);
          scrollCount = 0; // Reset
        }
      }

      lastScrollY = currentScrollY;
      lastScrollTime = now;
    };

    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScroll);
    
    return () => window.removeEventListener('scroll', throttledScroll);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // PATTERN ANALYSIS
  // ═══════════════════════════════════════════════════════════
  const checkTabSwitchPattern = (now) => {
    const tenMinutesAgo = now - 10 * 60 * 1000;
    const recentSwitches = behaviorsRef.current.tabSwitchTimes
      .filter(t => t > tenMinutesAgo);

    // Trigger if 6+ switches in 10 minutes
    if (recentSwitches.length >= 6) {
      const timeSinceLastWarning = now - behaviorsRef.current.lastWarning;
      
      // Don't spam warnings (wait 5 minutes between warnings)
      if (timeSinceLastWarning > 5 * 60 * 1000) {
        behaviorsRef.current.lastWarning = now;
        
        const messages = {
          hindi: `आपने 10 मिनट में ${recentSwitches.length} बार tab switch किया। Focus करें? 🎯`,
          english: `You've switched tabs ${recentSwitches.length} times in 10 minutes. Time to refocus? 🎯`,
          hinglish: `Aapne 10 min mein ${recentSwitches.length} baar tab switch kiya. Focus karein? 🎯`
        };

        onDistractionDetected({
          type: 'tab_switching',
          severity: recentSwitches.length > 10 ? 'high' : 'medium',
          count: recentSwitches.length,
          message: messages[language] || messages.hinglish,
          suggestion: getSuggestion('tab_switching', language)
        });

        // Update distraction level
        setStats(prev => ({
          ...prev,
          distractionLevel: Math.min(100, prev.distractionLevel + 20)
        }));
      }
    }
  };

  const checkScrollPattern = (now) => {
    const thirtySecondsAgo = now - 30 * 1000;
    const recentScrolls = behaviorsRef.current.scrollTimes
      .filter(t => t > thirtySecondsAgo);

    if (recentScrolls.length > 15) { // Lots of scrolling in 30 seconds
      const timeSinceLastWarning = now - behaviorsRef.current.lastWarning;
      
      if (timeSinceLastWarning > 5 * 60 * 1000) {
        behaviorsRef.current.lastWarning = now;
        
        const messages = {
          hindi: "लगता है आप बहुत scroll कर रहे हैं। क्या आप distracted हैं? 📱",
          english: "Looks like you're scrolling a lot. Getting distracted? 📱",
          hinglish: "Lagta hai aap bahut scroll kar rahe hain. Kya aap distracted hain? 📱"
        };

        onDistractionDetected({
          type: 'mindless_scrolling',
          severity: 'medium',
          count: recentScrolls.length,
          message: messages[language] || messages.hinglish,
          suggestion: getSuggestion('scrolling', language)
        });

        setStats(prev => ({
          ...prev,
          distractionLevel: Math.min(100, prev.distractionLevel + 15)
        }));
      }
    }
  };

  // ═══════════════════════════════════════════════════════════
  // DEEP WORK MODE - Auto-block distractions
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isDeepWorkMode) return;

    const handleBeforeUnload = (e) => {
      // Warn before leaving during deep work
      const messages = {
        hindi: "आप deep work mode में हैं। क्या आप sure हैं?",
        english: "You're in deep work mode. Are you sure?",
        hinglish: "Aap deep work mode mein hain. Kya aap sure hain?"
      };
      
      e.preventDefault();
      e.returnValue = messages[language] || messages.hinglish;
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDeepWorkMode, language]);

  // ═══════════════════════════════════════════════════════════
  // IDLE DETECTION
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const checkIdle = setInterval(() => {
      const now = Date.now();
      const idleTime = now - stats.lastActivity;
      const fiveMinutes = 5 * 60 * 1000;

      // If idle for 5+ minutes, reduce distraction level
      if (idleTime > fiveMinutes) {
        setStats(prev => ({
          ...prev,
          distractionLevel: Math.max(0, prev.distractionLevel - 10)
        }));
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkIdle);
  }, [stats.lastActivity]);

  return stats;
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function getSuggestion(type, language) {
  const suggestions = {
    tab_switching: {
      hindi: "5 मिनट के लिए एक task पर focus करें। सभी extra tabs बंद करें।",
      english: "Focus on one task for 5 minutes. Close all extra tabs.",
      hinglish: "5 min ke liye ek task par focus karo. Sab extra tabs band karo."
    },
    scrolling: {
      hindi: "Screen से break लें। 2 मिनट walk करें या पानी पीएं।",
      english: "Take a break from the screen. Walk for 2 minutes or drink water.",
      hinglish: "Screen se break lo. 2 min walk karo ya pani piyo."
    }
  };

  return suggestions[type]?.[language] || suggestions[type]?.hinglish || "";
}

function throttle(func, wait) {
  let timeout;
  let lastRan;
  
  return function executedFunction(...args) {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if ((Date.now() - lastRan) >= wait) {
          func(...args);
          lastRan = Date.now();
        }
      }, wait - (Date.now() - lastRan));
    }
  };
}

// ═══════════════════════════════════════════════════════════
// DISTRACTION LEVEL INDICATOR COMPONENT
// ═══════════════════════════════════════════════════════════

export function DistractionIndicator({ level, language = "hinglish" }) {
  const getColor = () => {
    if (level < 30) return '#4CAF50'; // Green
    if (level < 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getLabel = () => {
    const labels = {
      low: {
        hindi: "केंद्रित",
        english: "Focused",
        hinglish: "Focused"
      },
      medium: {
        hindi: "थोड़ा विचलित",
        english: "Slightly Distracted",
        hinglish: "Thoda Distracted"
      },
      high: {
        hindi: "बहुत विचलित",
        english: "Highly Distracted",
        hinglish: "Bahut Distracted"
      }
    };

    const category = level < 30 ? 'low' : level < 60 ? 'medium' : 'high';
    return labels[category][language] || labels[category].hinglish;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.05)',
      borderRadius: '8px',
      fontSize: '12px'
    }}>
      <div style={{
        width: '100px',
        height: '6px',
        background: '#e0e0e0',
        borderRadius: '3px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${level}%`,
          height: '100%',
          background: getColor(),
          transition: 'all 0.3s ease'
        }} />
      </div>
      <span style={{ color: getColor(), fontWeight: 'bold' }}>
        {getLabel()}
      </span>
    </div>
  );
}

export default useDistractionMonitor;