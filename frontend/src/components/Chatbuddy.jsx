
import React, { useState, useEffect, useRef } from "react";
import "./ChatBuddy.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export default function ChatBuddy({ currentDate, tasks = [], onAddTask, onCompleteTask, onDeleteTask }) {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState(() => localStorage.getItem("chat-language") || "hinglish");
  const [showLanguageSelect, setShowLanguageSelect] = useState(() => !localStorage.getItem("chat-language"));
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(`chat-history-${currentDate}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // ═══════════════════════════════════════════════
  // NEW: Separate reminder system (not tasks!)
  // ═══════════════════════════════════════════════
  const [activeReminders, setActiveReminders] = useState(() => {
    const saved = localStorage.getItem(`reminders-${currentDate}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const messagesEndRef = useRef(null);
  const reminderCheckIntervalRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("chat-language", language);
  }, [language]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat-history-${currentDate}`, JSON.stringify(messages));
    }
  }, [messages, currentDate]);

  useEffect(() => {
    localStorage.setItem(`reminders-${currentDate}`, JSON.stringify(activeReminders));
  }, [activeReminders, currentDate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ──────────────────────────────────────────────
  // SMART REMINDER & TASK CHECK SYSTEM
  // ──────────────────────────────────────────────
  
  const addBuddyMessage = (content) => {
    setMessages(prev => [...prev, {
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
      isAutomatic: true
    }]);
  };

  const checkRemindersAndTasks = () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // ═══ Check standalone reminders (not tasks) ═══
    activeReminders.forEach(reminder => {
      if (reminder.time === currentTime && !reminder.shown) {
        const msgs = {
          hindi: `⏰ Yaad dila raha hoon - ${reminder.message || "Time ho gaya!"}`,
          english: `⏰ Reminder - ${reminder.message || "Time's up!"}`,
          hinglish: `⏰ Yaad dila raha hoon - ${reminder.message || "Time ho gaya!"}`
        };
        addBuddyMessage(msgs[language] || msgs.hinglish);
        
        // Mark as shown
        setActiveReminders(prev => 
          prev.map(r => r.id === reminder.id ? {...r, shown: true} : r)
        );
      }
    });

    // ═══ Check tasks with times ═══
    const pending = tasks.filter(t => !t.completed);

    pending.forEach(task => {
      if (!task.startTime) return;

      const reminderKey = `reminder-sent-${currentDate}-${task.id}`;
      const completionCheckKey = `completion-check-${currentDate}-${task.id}`;
      
      const [taskHour, taskMin] = task.startTime.split(':').map(Number);
      const taskTime = new Date();
      taskTime.setHours(taskHour, taskMin, 0, 0);
      
      // 5 min before
      const reminderTime = new Date(taskTime.getTime() - 5 * 60000);
      const reminderTimeStr = `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;
      
      if (currentTime === reminderTimeStr && !localStorage.getItem(reminderKey)) {
        localStorage.setItem(reminderKey, 'true');
        const msgs = {
          hindi: `⏰ "${task.title}" 5 minute mein shuru hoga! Ready? 💪`,
          english: `⏰ "${task.title}" starts in 5 min! Ready? 💪`,
          hinglish: `⏰ "${task.title}" 5 minute mein start hoga! Ready? 💪`
        };
        addBuddyMessage(msgs[language] || msgs.hinglish);
      }
      
      // After task time - ask if done
      if (task.endTime) {
        const [endHour, endMin] = task.endTime.split(':').map(Number);
        const endTime = new Date();
        endTime.setHours(endHour, endMin, 0, 0);
        
        const checkTime = new Date(endTime.getTime() + 2 * 60000); // 2 min after
        
        if (now >= checkTime && !localStorage.getItem(completionCheckKey)) {
          localStorage.setItem(completionCheckKey, 'true');
          const msgs = {
            hindi: `"${task.title}" ho gaya kya? Ya abhi bhi kar rahe ho? 🤔`,
            english: `Did you finish "${task.title}"? Or still working? 🤔`,
            hinglish: `"${task.title}" ho gaya kya? Ya abhi bhi kar rahe ho? 🤔`
          };
          addBuddyMessage(msgs[language] || msgs.hinglish);
        }
      }
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    checkRemindersAndTasks();
    reminderCheckIntervalRef.current = setInterval(checkRemindersAndTasks, 60000); // every minute
    return () => {
      if (reminderCheckIntervalRef.current) {
        clearInterval(reminderCheckIntervalRef.current);
      }
    };
  }, [isOpen, tasks, activeReminders, currentDate, language]);

  useEffect(() => {
    if (!isOpen || messages.length > 0 || showLanguageSelect) return;
    const greetedKey = `greeted-${currentDate}`;
    if (localStorage.getItem(greetedKey)) return;
    localStorage.setItem(greetedKey, 'true');
    setTimeout(() => sendInitialGreeting(), 500);
  }, [isOpen, messages.length, showLanguageSelect, currentDate]);

  const getTaskContext = () => {
    const completed = tasks.filter(t => t.completed);
    const pending = tasks.filter(t => !t.completed);
    return {
      total: tasks.length,
      completed: completed.length,
      pending: pending.length,
      completedTasks: completed.map(t => ({ title: t.title, timeOfDay: t.timeOfDay })),
      pendingTasks: pending.map(t => ({ title: t.title, timeOfDay: t.timeOfDay, startTime: t.startTime || null }))
    };
  };

  const sendInitialGreeting = async () => {
    const greetingTrigger = { hindi: "नमस्ते", english: "hi", hinglish: "hey" };
    const triggerMsg = greetingTrigger[language] || "hey";
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: triggerMsg }],
          language: language,
          taskContext: getTaskContext()
        })
      });

      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setMessages([{ role: "assistant", content: data.message || "Hey! Kaisa chal raha hai? 😊", timestamp: new Date().toISOString() }]);
    } catch {
      const fallbacks = { hindi: "नमस्ते! Kaise hain?", english: "Hey! How's it going?", hinglish: "Hey! Kaisa chal raha hai?" };
      setMessages([{ role: "assistant", content: fallbacks[language] || fallbacks.hinglish, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const selectLanguage = (lang) => {
    setLanguage(lang);
    setShowLanguageSelect(false);
  };

  // ══════════════════════════════════════════════════════════
  // MAIN SEND MESSAGE - WITH PROPER ACTION DETECTION
  // ══════════════════════════════════════════════════════════
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    
    const userInput = input.trim();
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userInput }],
          language: language,
          taskContext: getTaskContext()
        })
      });

      if (!response.ok) throw new Error("Failed");
      const data = await response.json();

      // ═══════════════════════════════════════════════
      // Handle different response types
      // ═══════════════════════════════════════════════
      if (data.type === "function_call") {
        const { function: funcName, arguments: args } = data;
        let confirmationMsg = "";

        if (funcName === "set_reminder") {
          // JUST A NOTIFICATION - NOT A TASK!
          const newReminder = {
            id: Date.now(),
            time: args.time,
            message: args.message || "Time ho gaya!",
            shown: false
          };
          setActiveReminders(prev => [...prev, newReminder]);
          confirmationMsg = language === "hindi"
            ? `⏰ Reminder set ho gaya - ${args.time} pe yaad dila dunga!`
            : language === "hinglish"
            ? `⏰ Reminder set ho gaya - ${args.time} pe yaad dila dunga!`
            : `⏰ Reminder set for ${args.time}!`;
        }
        else if (funcName === "add_task" && onAddTask) {
          onAddTask(args.title, args.timeOfDay, args.startTime || null, args.endTime || null);
          confirmationMsg = language === "hindi"
            ? `✅ "${args.title}" task add ho gaya${args.startTime ? ` (${args.startTime} pe)` : ""}`
            : language === "hinglish"
            ? `✅ "${args.title}" task add ho gaya${args.startTime ? ` (${args.startTime} pe)` : ""}`
            : `✅ Added task "${args.title}"${args.startTime ? ` at ${args.startTime}` : ""}`;
        }
        else if (funcName === "complete_task" && onCompleteTask) {
          const task = tasks.find(t => t.title.toLowerCase().includes(args.taskTitle.toLowerCase()));
          if (task) {
            onCompleteTask(task.id);
            confirmationMsg = language === "hinglish" ? `✅ "${task.title}" done! 🎉` : `✅ Completed "${task.title}"! 🎉`;
          }
        }
        else if (funcName === "delete_task" && onDeleteTask) {
          const task = tasks.find(t => t.title.toLowerCase().includes(args.taskTitle.toLowerCase())) || tasks[tasks.length - 1];
          if (task) {
            onDeleteTask(task.id);
            confirmationMsg = language === "hinglish" ? `🗑️ "${task.title}" delete ho gaya` : `🗑️ Deleted "${task.title}"`;
          }
        }

        setMessages(prev => [...prev, { role: "assistant", content: confirmationMsg || data.message || "Done!", timestamp: new Date().toISOString() }]);
      } 
      else {
        // Normal text response
        setMessages(prev => [...prev, { role: "assistant", content: data.message || "Hmm...", timestamp: new Date().toISOString() }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsgs = { hindi: "कुछ issue है, phir se try karo!", hinglish: "Kuch issue hai, try again!", english: "Something went wrong, try again!" };
      setMessages(prev => [...prev, { role: "assistant", content: errorMsgs[language] || errorMsgs.hinglish, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (confirm("Clear chat history?")) {
      setMessages([]);
      localStorage.removeItem(`chat-history-${currentDate}`);
      setTimeout(() => sendInitialGreeting(), 100);
    }
  };

  const changeLanguage = () => {
    setShowLanguageSelect(true);
    setMessages([]);
    localStorage.removeItem(`chat-history-${currentDate}`);
  };

  return (
    <>
      <button className="chat-buddy-toggle" onClick={() => setIsOpen(!isOpen)} title="Chat with your buddy">
        {isOpen ? "✕" : "💬"}
      </button>

      {isOpen && (
        <div className="chat-buddy-window">
          {showLanguageSelect ? (
            <div className="language-select">
              <h3>Choose your language</h3>
              <p>भाषा चुनें / Select language</p>
              <div className="language-options">
                <button className="language-option" onClick={() => selectLanguage("hindi")}>
                  <span className="lang-emoji">🇮🇳</span>
                  <span className="lang-name">हिंदी</span>
                </button>
                <button className="language-option" onClick={() => selectLanguage("english")}>
                  <span className="lang-emoji">🇬🇧</span>
                  <span className="lang-name">English</span>
                </button>
                <button className="language-option" onClick={() => selectLanguage("hinglish")}>
                  <span className="lang-emoji">🔀</span>
                  <span className="lang-name">Hinglish</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-buddy-header">
                <div className="chat-buddy-title">
                  <span className="chat-buddy-icon">🤝</span>
                  <div>
                    <h4>Your Buddy</h4>
                    <span className="chat-buddy-status">{language === "hindi" ? "हिंदी" : language === "english" ? "English" : "Hinglish"}</span>
                  </div>
                </div>
                <div className="chat-buddy-actions">
                  <button onClick={changeLanguage} title="Change language" className="chat-action-btn">🌐</button>
                  <button onClick={clearChat} title="Clear chat" className="chat-action-btn">🗑️</button>
                </div>
              </div>

              <div className="chat-buddy-messages">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role}`}>
                    <div className="message-content">{msg.content}</div>
                    <div className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="chat-message assistant">
                    <div className="message-content typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-buddy-input">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={language === "hindi" ? "अपना सवाल लिखें..." : language === "english" ? "Type your message..." : "Apna message type karein..."}
                  disabled={loading}
                  rows="2"
                />
                <button onClick={sendMessage} disabled={loading || !input.trim()} className="chat-send-btn">
                  {loading ? "..." : "➤"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}