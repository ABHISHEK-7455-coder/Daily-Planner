import React, { useState, useEffect, useRef } from "react";
import "./ChatBuddy.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdvancedBuddy({
  currentDate,
  tasks,
  onAddTask,
  onCompleteTask,
  onDeleteTask,
  onUpdateNotes,
  onAddAlarm
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [inputMode, setInputMode] = useState("text");
  const [voiceMode, setVoiceMode] = useState("chat");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState(
    localStorage.getItem("buddy-language") || "hinglish"
  );
  const [showProactivePopup, setShowProactivePopup] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState("");
  const [proactiveActions, setProactiveActions] = useState([]);
  const [taskReminders, setTaskReminders] = useState(new Set());
  const [taskCheckIns, setTaskCheckIns] = useState(new Set());
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const interimTranscriptRef = useRef("");
  const reminderIntervalRef = useRef(null);
  const checkInIntervalRef = useRef(null);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("buddy-language", language);
  }, [language]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn("Speech recognition not supported");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language === "hindi" ? "hi-IN" : "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
      interimTranscriptRef.current = "";
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        interimTranscriptRef.current = interimTranscript;
        setMessages(prev => {
          const filtered = prev.filter(m => !m.interim);
          return [...filtered, {
            role: "user",
            content: interimTranscript,
            interim: true,
            timestamp: new Date()
          }];
        });
      }

      if (finalTranscript) {
        setMessages(prev => prev.filter(m => !m.interim));
        handleSendMessage(finalTranscript);
        interimTranscriptRef.current = "";
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setMessages(prev => prev.filter(m => !m.interim));
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  // Proactive check-ins
  useEffect(() => {
    if (!isOpen) {
      checkProactivePopup();
    }
  }, [tasks, currentDate]);

  // Task monitoring
  useEffect(() => {
    if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
    if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);

    reminderIntervalRef.current = setInterval(() => {
      checkTaskReminders();
    }, 60000);

    checkInIntervalRef.current = setInterval(() => {
      checkTaskCompletions();
    }, 60000);

    checkTaskReminders();
    checkTaskCompletions();

    return () => {
      if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
      if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
    };
  }, [tasks, currentDate, language]);

  const checkTaskReminders = async () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const task of tasks) {
      if (!task.startTime || task.completed) continue;

      const [hours, minutes] = task.startTime.split(':').map(Number);
      const taskStartTime = hours * 60 + minutes;
      const timeDiff = taskStartTime - currentTime;

      const reminderKey = `reminder-${task.id}-${currentDate}`;
      if (timeDiff === 10 && !taskReminders.has(reminderKey)) {
        setTaskReminders(prev => new Set(prev).add(reminderKey));
        await sendTaskReminder(task);
      }
    }
  };

  const checkTaskCompletions = async () => {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    for (const task of tasks) {
      if (!task.startTime || task.completed) continue;

      const [hours, minutes] = task.startTime.split(':').map(Number);
      const taskStartTime = hours * 60 + minutes;
      const timePassed = currentTime - taskStartTime;

      const checkInKey = `checkin-${task.id}-${currentDate}`;
      if (timePassed === 30 && !task.completed && !taskCheckIns.has(checkInKey)) {
        setTaskCheckIns(prev => new Set(prev).add(checkInKey));
        await sendTaskCheckIn(task);
      }
    }
  };

  const sendTaskReminder = async (task) => {
    try {
      const response = await fetch(`${API_URL}/api/task-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, language, currentDate })
      });

      const data = await response.json();
      
      const motivationalMessages = {
        hindi: `⏰ "${task.title}" 10 मिनट में शुरू होने वाला है। तैयार हो जाओ!`,
        english: `⏰ "${task.title}" starts in 10 minutes. Get ready!`,
        hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai. Ready ho jao!`
      };

      setProactiveMessage(motivationalMessages[language] || motivationalMessages.hinglish);
      setProactiveActions([
        {
          label: language === "hindi" ? "शुरू करता हूं 💪" : language === "english" ? "Let's Do It 💪" : "Chalo Shuru Karte Hain 💪",
          type: "primary",
          action: () => {
            setShowProactivePopup(false);
            setIsOpen(true);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: language === "hindi" 
                ? `बहुत बढ़िया! "${task.title}" के लिए तैयार हो? कोई मदद चाहिए?`
                : language === "english"
                ? `Great! Ready for "${task.title}"? Need any help?`
                : `Badhiya! "${task.title}" ke liye ready ho? Koi help chahiye?`,
              timestamp: new Date()
            }]);
          }
        },
        {
          label: language === "hindi" ? "बाद में" : language === "english" ? "Remind Later" : "Baad Mein",
          type: "secondary",
          action: () => setShowProactivePopup(false)
        }
      ]);
      setShowProactivePopup(true);

      if (isOpen) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `⏰ ${motivationalMessages[language] || motivationalMessages.hinglish}`,
          timestamp: new Date(),
          isReminder: true
        }]);
      }
    } catch (error) {
      console.error("Task reminder error:", error);
    }
  };

  const sendTaskCheckIn = async (task) => {
    try {
      const response = await fetch(`${API_URL}/api/task-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, language, currentDate })
      });

      const data = await response.json();
      
      const checkInMessages = {
        hindi: `🤔 "${task.title}" हो गया क्या? अगर नहीं हुआ तो कोई बात नहीं - मैं मदद कर सकता हूं!`,
        english: `🤔 Did you finish "${task.title}"? If not, no worries - I can help!`,
        hinglish: `🤔 "${task.title}" ho gaya kya? Agar nahi hua to koi baat nahi - main help kar sakta hoon!`
      };

      setProactiveMessage(checkInMessages[language] || checkInMessages.hinglish);
      setProactiveActions([
        {
          label: language === "hindi" ? "हो गया! ✅" : language === "english" ? "Done! ✅" : "Ho Gaya! ✅",
          type: "primary",
          action: () => {
            onCompleteTask(task.id);
            setShowProactivePopup(false);
            
            const celebrationMsg = {
              hindi: `🎉 शाबाश! "${task.title}" पूरा हो गया! अगला क्या है?`,
              english: `🎉 Awesome! "${task.title}" completed! What's next?`,
              hinglish: `🎉 Shabaash! "${task.title}" complete ho gaya! Agla kya hai?`
            };
            
            setIsOpen(true);
            setMessages(prev => [...prev, {
              role: "assistant",
              content: celebrationMsg[language] || celebrationMsg.hinglish,
              timestamp: new Date()
            }]);
          }
        },
        {
          label: language === "hindi" ? "अभी नहीं - मदद चाहिए" : language === "english" ? "Not Yet - Need Help" : "Abhi Nahi - Help Chahiye",
          type: "secondary",
          action: () => {
            setShowProactivePopup(false);
            setIsOpen(true);
            
            const helpMsg = {
              hindi: `कोई बात नहीं! "${task.title}" में क्या problem आ रही है? मैं इसे छोटे steps में तोड़ सकता हूं या tips दे सकता हूं!`,
              english: `No problem! What's challenging about "${task.title}"? I can break it into smaller steps or give you tips!`,
              hinglish: `Koi baat nahi! "${task.title}" mein kya problem aa rahi hai? Main isko chhote steps mein tod sakta hoon ya tips de sakta hoon!`
            };
            
            setMessages(prev => [...prev, {
              role: "assistant",
              content: helpMsg[language] || helpMsg.hinglish,
              timestamp: new Date(),
              isCheckIn: true
            }]);
          }
        }
      ]);
      setShowProactivePopup(true);

      if (isOpen) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `🤔 ${checkInMessages[language] || checkInMessages.hinglish}`,
          timestamp: new Date(),
          isCheckIn: true
        }]);
      }
    } catch (error) {
      console.error("Task check-in error:", error);
    }
  };

  const checkProactivePopup = async () => {
    const now = new Date();
    const hour = now.getHours();
    const lastPopupKey = `last-proactive-popup-${currentDate}`;
    const lastPopup = localStorage.getItem(lastPopupKey);

    if (lastPopup) return;

    let type = null;
    if (hour === 8) type = "morning";
    else if (hour === 12) type = "midday";
    else if (hour === 18) type = "evening";
    else if (hour === 22) type = "night";

    if (!type) return;

    try {
      const taskContext = getTaskContext();
      const response = await fetch(`${API_URL}/api/proactive-checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, language, taskContext, currentDate })
      });

      const data = await response.json();
      setProactiveMessage(data.message);
      setShowProactivePopup(true);
      localStorage.setItem(lastPopupKey, Date.now().toString());
    } catch (error) {
      console.error("Proactive popup error:", error);
    }
  };

  const getTaskContext = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);

    return { total, completed, pending, pendingTasks, completedTasks };
  };

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      role: "user",
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsProcessing(true);

    try {
      const taskContext = getTaskContext();
      const response = await fetch(`${API_URL}/api/advanced-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          language,
          taskContext,
          isVoice: inputMode === "voice",
          currentDate,
          voiceMode: voiceMode
        })
      });

      const data = await response.json();

      // Handle actions
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          await handleAction(action);
        }
      }

      // Add assistant response
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (action) => {
    console.log("🎯 Handling action:", action);
    
    switch (action.type) {
      case "set_alarm":
        console.log("⏰ Setting alarm:", action.params);
        
        if (onAddAlarm) {
          onAddAlarm(action.params);
          
          const alarmMsg = {
            hindi: `⏰ Alarm set ho gaya - ${action.params.time} pe ${action.params.date ? action.params.date + ' ko' : ''} bajega! "${action.params.label || 'Alarm'}"`,
            english: `⏰ Alarm set for ${action.params.time} ${action.params.date ? 'on ' + action.params.date : ''}! "${action.params.label || 'Alarm'}"`,
            hinglish: `⏰ Alarm set ho gaya - ${action.params.time} pe ${action.params.date ? action.params.date + ' ko' : ''} bajega! "${action.params.label || 'Alarm'}"`
          };
          
          setMessages(prev => [...prev, {
            role: "assistant",
            content: alarmMsg[language] || alarmMsg.hinglish,
            timestamp: new Date()
          }]);
        }
        break;
      
      case "set_reminder":
        console.log("⏰ Setting reminder:", action.params);
        await scheduleReminder(action.params.time, action.params.message);
        
        const reminderMsg = {
          hindi: `⏰ Reminder set ho gaya - ${action.params.time} pe notification aayega!`,
          english: `⏰ Reminder set for ${action.params.time} - you'll get a notification!`,
          hinglish: `⏰ Reminder set ho gaya - ${action.params.time} pe notification aayega!`
        };
        
        setMessages(prev => [...prev, {
          role: "assistant",
          content: reminderMsg[language] || reminderMsg.hinglish,
          timestamp: new Date()
        }]);
        break;
        
      case "add_task":
        console.log("✅ Adding task:", action.params);
        onAddTask(
          action.params.title,
          action.params.timeOfDay,
          action.params.startTime || null,
          action.params.endTime || null
        );
        
        let timeDisplay = "";
        if (action.params.startTime && action.params.endTime) {
          timeDisplay = ` (${action.params.startTime} - ${action.params.endTime})`;
        } else if (action.params.startTime) {
          timeDisplay = ` (${action.params.startTime} pe)`;
        }
        
        const confirmMsg = {
          hindi: `✅ "${action.params.title}" task add ho gaya${timeDisplay}!`,
          english: `✅ Added "${action.params.title}"${timeDisplay}!`,
          hinglish: `✅ "${action.params.title}" task add ho gaya${timeDisplay}!`
        };
        
        setMessages(prev => [...prev, {
          role: "assistant",
          content: confirmMsg[language] || confirmMsg.hinglish,
          timestamp: new Date()
        }]);
        break;
      
      case "complete_task":
        let taskToComplete = tasks.find(t => 
          t.title.toLowerCase() === action.params.taskTitle.toLowerCase()
        );
        
        if (!taskToComplete) {
          taskToComplete = tasks.find(t => 
            t.title.toLowerCase().includes(action.params.taskTitle.toLowerCase())
          );
        }
        
        if (!taskToComplete) {
          taskToComplete = tasks.find(t => 
            action.params.taskTitle.toLowerCase().includes(t.title.toLowerCase())
          );
        }
        
        if (taskToComplete) {
          console.log("✓ Completing task:", taskToComplete);
          onCompleteTask(taskToComplete.id);
          
          const completeMsg = {
            hindi: `🎉 बढ़िया! "${taskToComplete.title}" complete हो गया!`,
            english: `🎉 Great! "${taskToComplete.title}" is done!`,
            hinglish: `🎉 Badhiya! "${taskToComplete.title}" complete ho gaya!`
          };
          
          setMessages(prev => [...prev, {
            role: "assistant",
            content: completeMsg[language] || completeMsg.hinglish,
            timestamp: new Date()
          }]);
        } else {
          const pendingTasks = tasks.filter(t => !t.completed);
          const taskList = pendingTasks.map(t => `"${t.title}"`).join(", ");
          
          const notFoundMsg = {
            hindi: `Pending tasks: ${taskList}. Kaun sa complete karna hai?`,
            english: `Pending tasks: ${taskList}. Which one to complete?`,
            hinglish: `Pending tasks: ${taskList}. Kaun sa complete karna hai?`
          };
          
          setMessages(prev => [...prev, {
            role: "assistant",
            content: notFoundMsg[language] || notFoundMsg.hinglish,
            timestamp: new Date()
          }]);
        }
        break;
      
      case "delete_task":
        console.log("🔍 Searching for task to delete:", action.params.taskTitle);
        console.log("📋 Available tasks:", tasks.map(t => t.title));
        
        let taskToDelete = tasks.find(t => 
          t.title.toLowerCase() === action.params.taskTitle.toLowerCase()
        );
        
        if (!taskToDelete) {
          taskToDelete = tasks.find(t => 
            t.title.toLowerCase().includes(action.params.taskTitle.toLowerCase())
          );
        }
        
        if (!taskToDelete) {
          taskToDelete = tasks.find(t => 
            action.params.taskTitle.toLowerCase().includes(t.title.toLowerCase())
          );
        }
        
        if (!taskToDelete) {
          const searchWords = action.params.taskTitle.toLowerCase().split(' ');
          taskToDelete = tasks.find(t => {
            const taskWords = t.title.toLowerCase().split(' ');
            return searchWords.some(sw => taskWords.some(tw => tw.includes(sw) || sw.includes(tw)));
          });
        }
        
        if (!taskToDelete && tasks.length > 0) {
          taskToDelete = tasks[tasks.length - 1];
          console.log("⚠️ Using last task as fallback:", taskToDelete.title);
        }
        
        if (taskToDelete) {
          console.log("🗑️ Deleting task:", taskToDelete.title);
          onDeleteTask(taskToDelete.id);
          
          const deleteMsg = {
            hindi: `🗑️ "${taskToDelete.title}" delete ho gaya!`,
            english: `🗑️ Deleted "${taskToDelete.title}"!`,
            hinglish: `🗑️ "${taskToDelete.title}" delete ho gaya!`
          };
          
          setMessages(prev => [...prev, {
            role: "assistant",
            content: deleteMsg[language] || deleteMsg.hinglish,
            timestamp: new Date()
          }]);
        } else {
          const notFoundMsg = {
            hindi: `Koi task nahi mila delete karne ke liye.`,
            english: `No task found to delete.`,
            hinglish: `Koi task nahi mila delete karne ke liye.`
          };
          
          setMessages(prev => [...prev, {
            role: "assistant",
            content: notFoundMsg[language] || notFoundMsg.hinglish,
            timestamp: new Date()
          }]);
        }
        break;
      
      case "update_notes":
        onUpdateNotes(action.params.content, action.params.mode || 'append');
        
        const notesMsg = {
          hindi: `📝 नोट्स में add हो गया!`,
          english: `📝 Added to your notes!`,
          hinglish: `📝 Notes mein add ho gaya!`
        };
        
        setMessages(prev => [...prev, {
          role: "assistant",
          content: notesMsg[language] || notesMsg.hinglish,
          timestamp: new Date()
        }]);
        break;
        
      default:
        console.warn("Unknown action type:", action.type);
    }
  };
  
  const scheduleReminder = async (time, message) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    const delay = reminderTime.getTime() - now.getTime();
    
    console.log(`⏰ Scheduling reminder for ${time}, delay: ${Math.round(delay/1000)}s`);
    
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    const reminders = JSON.parse(localStorage.getItem('pending-reminders') || '[]');
    const reminder = {
      id: Date.now(),
      time,
      message: message || `Reminder at ${time}`,
      scheduledFor: reminderTime.toISOString()
    };
    reminders.push(reminder);
    localStorage.setItem('pending-reminders', JSON.stringify(reminders));
    
    setTimeout(async () => {
      await showServiceWorkerNotification(reminder.message);
      
      const updated = JSON.parse(localStorage.getItem('pending-reminders') || '[]');
      const filtered = updated.filter(r => r.id !== reminder.id);
      localStorage.setItem('pending-reminders', JSON.stringify(filtered));
    }, delay);
  };
  
  const showServiceWorkerNotification = async (message) => {
    console.log("🔔 Sending notification:", message);
    
    if ('serviceWorker' in navigator && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      
      if (Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          await registration.showNotification('AI Buddy Reminder ⏰', {
            body: message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            vibrate: [200, 100, 200, 100, 200],
            tag: 'buddy-reminder-' + Date.now(),
            requireInteraction: true,
            actions: [
              { action: 'open', title: 'Open App 📱' },
              { action: 'dismiss', title: 'Got it ✓' }
            ],
            data: { url: '/' }
          });
          
          console.log("✅ Service worker notification sent");
        } catch (error) {
          console.error("Service worker notification failed:", error);
          new Notification('AI Buddy Reminder ⏰', {
            body: message,
            icon: '/icon-192x192.png'
          });
        }
      } else {
        console.log("Notification permission denied");
      }
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleSendMessage(inputText);
    }
  };

  const getGreeting = () => {
    if (voiceMode === "notes") {
      const greetings = {
        hindi: "डेली नोट्स मोड। अपने विचार बोलें या लिखें!",
        english: "Daily Notes Mode. Speak or write your thoughts!",
        hinglish: "Daily Notes Mode. Apne thoughts bolo ya likho!"
      };
      return greetings[language] || greetings.hinglish;
    } else if (voiceMode === "tasks") {
      const greetings = {
        hindi: "टास्क मोड। टास्क जोड़ें, पूरा करें, या मैनेज करें!",
        english: "Tasks Mode. Add, complete, or manage your tasks!",
        hinglish: "Tasks Mode. Add karo, complete karo, ya manage karo!"
      };
      return greetings[language] || greetings.hinglish;
    } else {
      const greetings = {
        hindi: "नमस्ते! मैं आपका AI साथी हूं। कैसे मदद करूं?",
        english: "Hey! I'm your AI buddy. How can I help you today?",
        hinglish: "Hey! Main aapka AI buddy hoon. Kaise help karoon?"
      };
      return greetings[language] || greetings.hinglish;
    }
  };

  const getInputPlaceholder = () => {
    if (inputMode === "voice") {
      return language === "hindi" 
        ? "बोलें या टाइप करें..." 
        : language === "english"
        ? "Speak or type..."
        : "Bolo ya type karo...";
    }
    return language === "hindi"
      ? "यहां टाइप करें..."
      : language === "english"
      ? "Type here..."
      : "Yahan type karo...";
  };

  return (
    <>
      {/* Proactive Popup */}
      {showProactivePopup && (
        <div className="proactive-popup-overlay">
          <div className="proactive-popup">
            <button 
              className="popup-close"
              onClick={() => setShowProactivePopup(false)}
            >
              ×
            </button>
            
            <div className="popup-icon-container">
              <div className="popup-icon">
                <i className="fas fa-heart"></i>
              </div>
            </div>
            
            <p className="popup-message">{proactiveMessage}</p>
            
            <div className="popup-actions">
              {proactiveActions.length > 0 ? (
                proactiveActions.map((action, idx) => (
                  <button
                    key={idx}
                    className={`popup-action-btn ${action.type}`}
                    onClick={action.action}
                  >
                    {action.label}
                  </button>
                ))
              ) : (
                <>
                  <button 
                    className="popup-action-btn primary"
                    onClick={() => {
                      setShowProactivePopup(false);
                      setIsOpen(true);
                    }}
                  >
                    <i className="fas fa-comment-dots"></i> {language === "hindi" ? "चैट खोलें" : language === "english" ? "Open Chat" : "Chat Kholo"}
                  </button>
                  <button 
                    className="popup-action-btn secondary"
                    onClick={() => setShowProactivePopup(false)}
                  >
                    <i className="fas fa-clock"></i> {language === "hindi" ? "बाद में" : language === "english" ? "Later" : "Baad Mein"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Buddy Button */}
      <button
        className={`advanced-buddy-toggle ${isListening ? 'listening' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Buddy"
      >
        <div className="buddy-avatar">
          <div className="avatar-face">
            {isListening ? (
              <div className="sound-waves">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              <i className="fas fa-smile-beam"></i>
            )}
          </div>
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="advanced-buddy-window">
          <div className="buddy-header">
            <div className="buddy-info">
              <div className="buddy-avatar-small">
                <i className="fas fa-smile-beam"></i>
              </div>
              <div>
                <h4>AI Buddy</h4>
                <p className="buddy-status">
                  <i className="fas fa-circle" style={{fontSize: '8px', marginRight: '4px', color: '#55efc4'}}></i>
                  {language === "hindi" ? "यहाँ मदद के लिए" : language === "english" ? "Here to help" : "Madad ke liye yahan"}
                </p>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
          </div>

          {/* Language Selection */}
          <div className="voice-mode-tabs">
            <button
              className={language === "hindi" ? "active" : ""}
              onClick={() => setLanguage("hindi")}
            >
              <i className="fas fa-language"></i> हिंदी
            </button>
            <button
              className={language === "english" ? "active" : ""}
              onClick={() => setLanguage("english")}
            >
              <i className="fas fa-globe"></i> EN
            </button>
            <button
              className={language === "hinglish" ? "active" : ""}
              onClick={() => setLanguage("hinglish")}
            >
              <i className="fas fa-comments"></i> Mix
            </button>
          </div>

          {/* Voice Mode Selection */}
          <div className="voice-mode-tabs" style={{ borderTop: '1px solid var(--buddy-border)' }}>
            <button
              className={voiceMode === "chat" ? "active" : ""}
              onClick={() => setVoiceMode("chat")}
            >
              <i className="fas fa-comment-dots"></i> {language === "hindi" ? "चैट" : "Chat"}
            </button>
            <button
              className={voiceMode === "tasks" ? "active" : ""}
              onClick={() => setVoiceMode("tasks")}
            >
              <i className="fas fa-check-circle"></i> {language === "hindi" ? "टास्क" : "Tasks"}
            </button>
            <button
              className={voiceMode === "notes" ? "active" : ""}
              onClick={() => setVoiceMode("notes")}
            >
              <i className="fas fa-sticky-note"></i> {language === "hindi" ? "नोट्स" : "Notes"}
            </button>
          </div>

          {/* Messages */}
          <div className="buddy-messages">
            {messages.length === 0 && (
              <div className="message assistant">
                <div className="message-content">
                  <i className="fas fa-sparkles" style={{marginRight: '6px', color: '#fdcb6e'}}></i>
                  {getGreeting()}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message ${msg.role} ${msg.interim ? 'interim' : ''} ${msg.isReminder ? 'reminder-message' : ''} ${msg.isCheckIn ? 'checkin-message' : ''}`}
              >
                <div className="message-content">
                  {msg.interim && <span className="voice-badge"><i className="fas fa-microphone"></i> listening...</span>}
                  {msg.isReminder && <span className="reminder-badge"><i className="fas fa-bell"></i> Reminder</span>}
                  {msg.isCheckIn && <span className="checkin-badge"><i className="fas fa-question-circle"></i> Check-in</span>}
                  {msg.content}
                </div>
                <div className="message-time">
                  {msg.timestamp?.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="message assistant">
                <div className="message-content">
                  <span className="typing-indicator">●●●</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="buddy-input-area">
            {voiceMode !== "chat" && (
              <div className="voice-mode-hint">
                <strong>
                  <i className={voiceMode === "notes" ? "fas fa-sticky-note" : "fas fa-tasks"} style={{marginRight: '6px'}}></i>
                  {voiceMode === "notes" 
                    ? (language === "hindi" ? "डेली नोट्स में लिख रहे हैं" : language === "english" ? "Writing to Daily Notes" : "Daily Notes mein likh rahe hain")
                    : (language === "hindi" ? "टास्क मैनेज कर रहे हैं" : language === "english" ? "Managing Tasks" : "Tasks manage kar rahe hain")
                  }
                </strong>
                <span>
                  {voiceMode === "notes"
                    ? (language === "hindi" ? "आपके शब्द सीधे नोट्स में जाएंगे" : language === "english" ? "Your words will go directly to notes" : "Aapke words directly notes mein jayenge")
                    : (language === "hindi" ? "टास्क जोड़ें, हटाएं या पूरा करें" : language === "english" ? "Add, delete, or complete tasks" : "Tasks add karo, delete karo ya complete karo")
                  }
                </span>
              </div>
            )}

            {/* Input Mode Toggle */}
            <div className="input-mode-toggle">
              <button
                className={inputMode === "text" ? "active" : ""}
                onClick={() => {
                  setInputMode("text");
                  if (isListening) recognitionRef.current?.stop();
                }}
              >
                <i className="fas fa-keyboard"></i> {language === "hindi" ? "टाइप" : "Type"}
              </button>
              <button
                className={inputMode === "voice" ? "active" : ""}
                onClick={() => setInputMode("voice")}
              >
                <i className="fas fa-microphone"></i> {language === "hindi" ? "बोलें" : "Voice"}
              </button>
            </div>

            {/* Text Input Form */}
            {inputMode === "text" && (
              <form className="text-input-form" onSubmit={handleTextSubmit}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={getInputPlaceholder()}
                  disabled={isProcessing}
                />
                <button type="submit" disabled={isProcessing || !inputText.trim()}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            )}

            {/* Voice Input Control */}
            {inputMode === "voice" && (
              <div className="voice-input-control">
                <button
                  className={`voice-btn ${isListening ? 'active' : ''}`}
                  onClick={toggleVoiceInput}
                  disabled={isProcessing}
                >
                  {isListening ? (
                    <>
                      <div className="pulse-ring"></div>
                      <i className="fas fa-stop-circle"></i> {language === "hindi" ? "बंद करें" : language === "english" ? "Stop" : "Band Karo"}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-microphone"></i> {language === "hindi" ? "बोलना शुरू करें" : language === "english" ? "Start Speaking" : "Bolna Shuru Karo"}
                    </>
                  )}
                </button>
                
                {/* Manual text input while in voice mode */}
                <form className="text-input-form" onSubmit={handleTextSubmit}>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={language === "hindi" ? "या यहां टाइप करें..." : language === "english" ? "Or type here..." : "Ya yahan type karo..."}
                    disabled={isProcessing}
                  />
                  <button type="submit" disabled={isProcessing || !inputText.trim()}>
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}