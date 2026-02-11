
// // import React, { useState, useEffect, useRef } from "react";
// // import "./ChatBuddy.css";

// // const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// // export default function AdvancedBuddy({
// //   currentDate,
// //   tasks,
// //   onAddTask,
// //   onCompleteTask,
// //   onDeleteTask,
// //   onUpdateNotes
// // }) {
// //   const [isOpen, setIsOpen] = useState(false);
// //   const [messages, setMessages] = useState([]);
// //   const [inputText, setInputText] = useState("");
// //   const [inputMode, setInputMode] = useState("text"); // "text" or "voice"
// //   const [voiceMode, setVoiceMode] = useState("chat"); // "chat", "tasks", or "notes"
// //   const [isListening, setIsListening] = useState(false);
// //   const [isProcessing, setIsProcessing] = useState(false);
// //   const [language, setLanguage] = useState(
// //     localStorage.getItem("buddy-language") || "hinglish"
// //   );
// //   const [showProactivePopup, setShowProactivePopup] = useState(false);
// //   const [proactiveMessage, setProactiveMessage] = useState("");
// //   const [proactiveActions, setProactiveActions] = useState([]);
// //   const [taskReminders, setTaskReminders] = useState(new Set());
// //   const [taskCheckIns, setTaskCheckIns] = useState(new Set());
  
// //   const messagesEndRef = useRef(null);
// //   const recognitionRef = useRef(null);
// //   const interimTranscriptRef = useRef("");
// //   const reminderIntervalRef = useRef(null);
// //   const checkInIntervalRef = useRef(null);

// //   // Scroll to bottom when messages change
// //   useEffect(() => {
// //     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
// //   }, [messages]);

// //   // Save language preference
// //   useEffect(() => {
// //     localStorage.setItem("buddy-language", language);
// //   }, [language]);

// //   // Initialize Speech Recognition
// //   useEffect(() => {
// //     if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
// //       console.warn("Speech recognition not supported");
// //       return;
// //     }

// //     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// //     const recognition = new SpeechRecognition();
    
// //     recognition.continuous = true;
// //     recognition.interimResults = true;
// //     recognition.lang = language === "hindi" ? "hi-IN" : "en-IN";

// //     recognition.onstart = () => {
// //       setIsListening(true);
// //       interimTranscriptRef.current = "";
// //     };

// //     recognition.onresult = (event) => {
// //       let interimTranscript = "";
// //       let finalTranscript = "";

// //       for (let i = event.resultIndex; i < event.results.length; i++) {
// //         const transcript = event.results[i][0].transcript;
// //         if (event.results[i].isFinal) {
// //           finalTranscript += transcript;
// //         } else {
// //           interimTranscript += transcript;
// //         }
// //       }

// //       if (interimTranscript) {
// //         interimTranscriptRef.current = interimTranscript;
// //         // Show interim result
// //         setMessages(prev => {
// //           const filtered = prev.filter(m => !m.interim);
// //           return [...filtered, {
// //             role: "user",
// //             content: interimTranscript,
// //             interim: true,
// //             timestamp: new Date()
// //           }];
// //         });
// //       }

// //       if (finalTranscript) {
// //         // Remove interim message and add final
// //         setMessages(prev => prev.filter(m => !m.interim));
// //         handleSendMessage(finalTranscript);
// //         interimTranscriptRef.current = "";
// //       }
// //     };

// //     recognition.onerror = (event) => {
// //       console.error("Speech recognition error:", event.error);
// //       setIsListening(false);
// //     };

// //     recognition.onend = () => {
// //       setIsListening(false);
// //       // Remove any interim messages
// //       setMessages(prev => prev.filter(m => !m.interim));
// //     };

// //     recognitionRef.current = recognition;

// //     return () => {
// //       if (recognitionRef.current) {
// //         recognitionRef.current.stop();
// //       }
// //     };
// //   }, [language]);

// //   // Proactive check-ins
// //   useEffect(() => {
// //     if (!isOpen) {
// //       checkProactivePopup();
// //     }
// //   }, [tasks, currentDate]);

// //   // ═══════════════════════════════════════════════════════════
// //   // TASK MONITORING SYSTEM
// //   // Sends reminders before task start and check-ins after time
// //   // ═══════════════════════════════════════════════════════════
// //   useEffect(() => {
// //     // Clear existing intervals
// //     if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
// //     if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);

// //     // Check every minute for task reminders and check-ins
// //     reminderIntervalRef.current = setInterval(() => {
// //       checkTaskReminders();
// //     }, 60000); // Every 1 minute

// //     checkInIntervalRef.current = setInterval(() => {
// //       checkTaskCompletions();
// //     }, 60000); // Every 1 minute

// //     // Initial check
// //     checkTaskReminders();
// //     checkTaskCompletions();

// //     return () => {
// //       if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
// //       if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
// //     };
// //   }, [tasks, currentDate, language]);

// //   const checkTaskReminders = async () => {
// //     const now = new Date();
// //     const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

// //     for (const task of tasks) {
// //       if (!task.startTime || task.completed) continue;

// //       const [hours, minutes] = task.startTime.split(':').map(Number);
// //       const taskStartTime = hours * 60 + minutes; // Task start time in minutes
// //       const timeDiff = taskStartTime - currentTime; // Difference in minutes

// //       // Remind 10 minutes before task starts
// //       const reminderKey = `reminder-${task.id}-${currentDate}`;
// //       if (timeDiff === 10 && !taskReminders.has(reminderKey)) {
// //         setTaskReminders(prev => new Set(prev).add(reminderKey));
// //         await sendTaskReminder(task);
// //       }
// //     }
// //   };

// //   const checkTaskCompletions = async () => {
// //     const now = new Date();
// //     const currentTime = now.getHours() * 60 + now.getMinutes();

// //     for (const task of tasks) {
// //       if (!task.startTime || task.completed) continue;

// //       const [hours, minutes] = task.startTime.split(':').map(Number);
// //       const taskStartTime = hours * 60 + minutes;
// //       const timePassed = currentTime - taskStartTime;

// //       // Check 30 minutes after task start time if not completed
// //       const checkInKey = `checkin-${task.id}-${currentDate}`;
// //       if (timePassed === 30 && !task.completed && !taskCheckIns.has(checkInKey)) {
// //         setTaskCheckIns(prev => new Set(prev).add(checkInKey));
// //         await sendTaskCheckIn(task);
// //       }
// //     }
// //   };

// //   const sendTaskReminder = async (task) => {
// //     try {
// //       const response = await fetch(`${API_URL}/api/task-reminder`, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ task, language, currentDate })
// //       });

// //       const data = await response.json();
      
// //       // Show popup notification with motivating actions
// //       const motivationalMessages = {
// //         hindi: `⏰ "${task.title}" 10 मिनट में शुरू होने वाला है। तैयार हो जाओ!`,
// //         english: `⏰ "${task.title}" starts in 10 minutes. Get ready!`,
// //         hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai. Ready ho jao!`
// //       };

// //       setProactiveMessage(motivationalMessages[language] || motivationalMessages.hinglish);
// //       setProactiveActions([
// //         {
// //           label: language === "hindi" ? "शुरू करता हूं 💪" : language === "english" ? "Let's Do It 💪" : "Chalo Shuru Karte Hain 💪",
// //           type: "primary",
// //           action: () => {
// //             setShowProactivePopup(false);
// //             setIsOpen(true);
// //             // Add motivational message to chat
// //             setMessages(prev => [...prev, {
// //               role: "assistant",
// //               content: language === "hindi" 
// //                 ? `बहुत बढ़िया! "${task.title}" के लिए तैयार हो? कोई मदद चाहिए?`
// //                 : language === "english"
// //                 ? `Great! Ready for "${task.title}"? Need any help?`
// //                 : `Badhiya! "${task.title}" ke liye ready ho? Koi help chahiye?`,
// //               timestamp: new Date()
// //             }]);
// //           }
// //         },
// //         {
// //           label: language === "hindi" ? "बाद में" : language === "english" ? "Remind Later" : "Baad Mein",
// //           type: "secondary",
// //           action: () => setShowProactivePopup(false)
// //         }
// //       ]);
// //       setShowProactivePopup(true);

// //       // Also add to chat if open
// //       if (isOpen) {
// //         setMessages(prev => [...prev, {
// //           role: "assistant",
// //           content: `⏰ ${motivationalMessages[language] || motivationalMessages.hinglish}`,
// //           timestamp: new Date(),
// //           isReminder: true
// //         }]);
// //       }
// //     } catch (error) {
// //       console.error("Task reminder error:", error);
// //     }
// //   };

// //   const sendTaskCheckIn = async (task) => {
// //     try {
// //       const response = await fetch(`${API_URL}/api/task-checkin`, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ task, language, currentDate })
// //       });

// //       const data = await response.json();
      
// //       // Motivating check-in messages
// //       const checkInMessages = {
// //         hindi: `🤔 "${task.title}" हो गया क्या? अगर नहीं हुआ तो कोई बात नहीं - मैं मदद कर सकता हूं!`,
// //         english: `🤔 Did you finish "${task.title}"? If not, no worries - I can help!`,
// //         hinglish: `🤔 "${task.title}" ho gaya kya? Agar nahi hua to koi baat nahi - main help kar sakta hoon!`
// //       };

// //       setProactiveMessage(checkInMessages[language] || checkInMessages.hinglish);
// //       setProactiveActions([
// //         {
// //           label: language === "hindi" ? "हो गया! ✅" : language === "english" ? "Done! ✅" : "Ho Gaya! ✅",
// //           type: "primary",
// //           action: () => {
// //             onCompleteTask(task.id);
// //             setShowProactivePopup(false);
            
// //             // Celebrate in chat
// //             const celebrationMsg = {
// //               hindi: `🎉 शाबाश! "${task.title}" पूरा हो गया! अगला क्या है?`,
// //               english: `🎉 Awesome! "${task.title}" completed! What's next?`,
// //               hinglish: `🎉 Shabaash! "${task.title}" complete ho gaya! Agla kya hai?`
// //             };
            
// //             setIsOpen(true);
// //             setMessages(prev => [...prev, {
// //               role: "assistant",
// //               content: celebrationMsg[language] || celebrationMsg.hinglish,
// //               timestamp: new Date()
// //             }]);
// //           }
// //         },
// //         {
// //           label: language === "hindi" ? "अभी नहीं - मदद चाहिए" : language === "english" ? "Not Yet - Need Help" : "Abhi Nahi - Help Chahiye",
// //           type: "secondary",
// //           action: () => {
// //             setShowProactivePopup(false);
// //             setIsOpen(true);
            
// //             // Offer help in chat
// //             const helpMsg = {
// //               hindi: `कोई बात नहीं! "${task.title}" में क्या problem आ रही है? मैं इसे छोटे steps में तोड़ सकता हूं या tips दे सकता हूं!`,
// //               english: `No problem! What's challenging about "${task.title}"? I can break it into smaller steps or give you tips!`,
// //               hinglish: `Koi baat nahi! "${task.title}" mein kya problem aa rahi hai? Main isko chhote steps mein tod sakta hoon ya tips de sakta hoon!`
// //             };
            
// //             setMessages(prev => [...prev, {
// //               role: "assistant",
// //               content: helpMsg[language] || helpMsg.hinglish,
// //               timestamp: new Date(),
// //               isCheckIn: true
// //             }]);
// //           }
// //         }
// //       ]);
// //       setShowProactivePopup(true);

// //       // Also add to chat if open
// //       if (isOpen) {
// //         setMessages(prev => [...prev, {
// //           role: "assistant",
// //           content: `🤔 ${checkInMessages[language] || checkInMessages.hinglish}`,
// //           timestamp: new Date(),
// //           isCheckIn: true
// //         }]);
// //       }
// //     } catch (error) {
// //       console.error("Task check-in error:", error);
// //     }
// //   };

// //   const checkProactivePopup = async () => {
// //     const now = new Date();
// //     const hour = now.getHours();
// //     const lastPopupKey = `last-proactive-popup-${currentDate}`;
// //     const lastPopup = localStorage.getItem(lastPopupKey);

// //     // Show popup once per day at specific times
// //     if (lastPopup) return;

// //     let type = null;
// //     if (hour === 8) type = "morning";
// //     else if (hour === 12) type = "midday";
// //     else if (hour === 18) type = "evening";
// //     else if (hour === 22) type = "night";

// //     if (!type) return;

// //     try {
// //       const taskContext = getTaskContext();
// //       const response = await fetch(`${API_URL}/api/proactive-checkin`, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ type, language, taskContext, currentDate })
// //       });

// //       const data = await response.json();
// //       setProactiveMessage(data.message);
// //       setShowProactivePopup(true);
// //       localStorage.setItem(lastPopupKey, Date.now().toString());
// //     } catch (error) {
// //       console.error("Proactive popup error:", error);
// //     }
// //   };

// //   const getTaskContext = () => {
// //     const total = tasks.length;
// //     const completed = tasks.filter(t => t.completed).length;
// //     const pending = total - completed;
// //     const pendingTasks = tasks.filter(t => !t.completed);
// //     const completedTasks = tasks.filter(t => t.completed);

// //     return { total, completed, pending, pendingTasks, completedTasks };
// //   };

// //   const handleSendMessage = async (text) => {
// //     if (!text.trim()) return;

// //     // Add user message
// //     const userMessage = {
// //       role: "user",
// //       content: text,
// //       timestamp: new Date()
// //     };

// //     setMessages(prev => [...prev, userMessage]);
// //     setInputText("");
// //     setIsProcessing(true);

// //     try {
// //       const taskContext = getTaskContext();
// //       const response = await fetch(`${API_URL}/api/advanced-chat`, {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({
// //           messages: [...messages, userMessage],
// //           language,
// //           taskContext,
// //           isVoice: inputMode === "voice",
// //           currentDate,
// //           voiceMode: voiceMode
// //         })
// //       });

// //       const data = await response.json();

// //       // Handle actions
// //       if (data.actions && data.actions.length > 0) {
// //         for (const action of data.actions) {
// //           handleAction(action);
// //         }
// //       }

// //       // Add assistant response
// //       setMessages(prev => [...prev, {
// //         role: "assistant",
// //         content: data.message,
// //         timestamp: new Date()
// //       }]);

// //     } catch (error) {
// //       console.error("Chat error:", error);
// //       setMessages(prev => [...prev, {
// //         role: "assistant",
// //         content: "Sorry, something went wrong. Please try again.",
// //         timestamp: new Date()
// //       }]);
// //     } finally {
// //       setIsProcessing(false);
// //     }
// //   };

// //   const handleAction = (action) => {
// //     console.log("Handling action:", action); // Debug log
    
// //     switch (action.type) {
// //       case "add_task":
// //         console.log("Adding task:", action.params); // Debug log
// //         onAddTask(
// //           action.params.title,
// //           action.params.timeOfDay,
// //           action.params.startTime || null,
// //           action.params.endTime || null
// //         );
        
// //         // Confirm to user
// //         const confirmMsg = {
// //           hindi: `✅ "${action.params.title}" task add ho gaya${action.params.startTime ? ` (${action.params.startTime} pe)` : ''}!`,
// //           english: `✅ Added "${action.params.title}"${action.params.startTime ? ` at ${action.params.startTime}` : ''}!`,
// //           hinglish: `✅ "${action.params.title}" task add ho gaya${action.params.startTime ? ` (${action.params.startTime} pe)` : ''}!`
// //         };
        
// //         setMessages(prev => [...prev, {
// //           role: "assistant",
// //           content: confirmMsg[language] || confirmMsg.hinglish,
// //           timestamp: new Date()
// //         }]);
// //         break;
      
// //       case "complete_task":
// //         const taskToComplete = tasks.find(t => 
// //           t.title.toLowerCase().includes(action.params.taskTitle.toLowerCase())
// //         );
        
// //         if (taskToComplete) {
// //           console.log("Completing task:", taskToComplete); // Debug log
// //           onCompleteTask(taskToComplete.id);
          
// //           const completeMsg = {
// //             hindi: `🎉 बढ़िया! "${taskToComplete.title}" complete हो गया!`,
// //             english: `🎉 Great! "${taskToComplete.title}" is done!`,
// //             hinglish: `🎉 Badhiya! "${taskToComplete.title}" complete ho gaya!`
// //           };
          
// //           setMessages(prev => [...prev, {
// //             role: "assistant",
// //             content: completeMsg[language] || completeMsg.hinglish,
// //             timestamp: new Date()
// //           }]);
// //         } else {
// //           const notFoundMsg = {
// //             hindi: `मुझे "${action.params.taskTitle}" task नहीं मिला। कौन सा task complete करना है?`,
// //             english: `I couldn't find "${action.params.taskTitle}". Which task do you want to complete?`,
// //             hinglish: `Mujhe "${action.params.taskTitle}" task nahi mila. Kaun sa task complete karna hai?`
// //           };
          
// //           setMessages(prev => [...prev, {
// //             role: "assistant",
// //             content: notFoundMsg[language] || notFoundMsg.hinglish,
// //             timestamp: new Date()
// //           }]);
// //         }
// //         break;
      
// //       case "delete_task":
// //         const taskToDelete = tasks.find(t => 
// //           t.title.toLowerCase().includes(action.params.taskTitle.toLowerCase())
// //         );
        
// //         if (taskToDelete) {
// //           console.log("Deleting task:", taskToDelete); // Debug log
// //           onDeleteTask(taskToDelete.id);
          
// //           const deleteMsg = {
// //             hindi: `🗑️ "${taskToDelete.title}" delete ho gaya!`,
// //             english: `🗑️ Deleted "${taskToDelete.title}"!`,
// //             hinglish: `🗑️ "${taskToDelete.title}" delete ho gaya!`
// //           };
          
// //           setMessages(prev => [...prev, {
// //             role: "assistant",
// //             content: deleteMsg[language] || deleteMsg.hinglish,
// //             timestamp: new Date()
// //           }]);
// //         } else {
// //           const notFoundMsg = {
// //             hindi: `मुझे "${action.params.taskTitle}" task नहीं मिला। कौन सा task delete करना है?`,
// //             english: `I couldn't find "${action.params.taskTitle}". Which task do you want to delete?`,
// //             hinglish: `Mujhe "${action.params.taskTitle}" task nahi mila. Kaun sa task delete karna hai?`
// //           };
          
// //           setMessages(prev => [...prev, {
// //             role: "assistant",
// //             content: notFoundMsg[language] || notFoundMsg.hinglish,
// //             timestamp: new Date()
// //           }]);
// //         }
// //         break;
      
// //       case "update_notes":
// //         onUpdateNotes(action.params.content, action.params.mode || 'append');
        
// //         const notesMsg = {
// //           hindi: `📝 नोट्स में add हो गया!`,
// //           english: `📝 Added to your notes!`,
// //           hinglish: `📝 Notes mein add ho gaya!`
// //         };
        
// //         setMessages(prev => [...prev, {
// //           role: "assistant",
// //           content: notesMsg[language] || notesMsg.hinglish,
// //           timestamp: new Date()
// //         }]);
// //         break;
        
// //       default:
// //         console.warn("Unknown action type:", action.type);
// //     }
// //   };

// //   const toggleVoiceInput = () => {
// //     if (isListening) {
// //       recognitionRef.current?.stop();
// //     } else {
// //       recognitionRef.current?.start();
// //     }
// //   };

// //   const handleTextSubmit = (e) => {
// //     e.preventDefault();
// //     if (inputText.trim()) {
// //       handleSendMessage(inputText);
// //     }
// //   };

// //   const getGreeting = () => {
// //     if (voiceMode === "notes") {
// //       const greetings = {
// //         hindi: "📝 डेली नोट्स मोड। अपने विचार बोलें या लिखें!",
// //         english: "📝 Daily Notes Mode. Speak or write your thoughts!",
// //         hinglish: "📝 Daily Notes Mode. Apne thoughts bolo ya likho!"
// //       };
// //       return greetings[language] || greetings.hinglish;
// //     } else if (voiceMode === "tasks") {
// //       const greetings = {
// //         hindi: "✅ टास्क मोड। टास्क जोड़ें, पूरा करें, या मैनेज करें!",
// //         english: "✅ Tasks Mode. Add, complete, or manage your tasks!",
// //         hinglish: "✅ Tasks Mode. Add karo, complete karo, ya manage karo!"
// //       };
// //       return greetings[language] || greetings.hinglish;
// //     } else {
// //       const greetings = {
// //         hindi: "नमस्ते! मैं आपका AI साथी हूं। कैसे मदद करूं?",
// //         english: "Hey! I'm your AI buddy. How can I help you today?",
// //         hinglish: "Hey! Main aapka AI buddy hoon. Kaise help karoon?"
// //       };
// //       return greetings[language] || greetings.hinglish;
// //     }
// //   };

// //   const getInputPlaceholder = () => {
// //     if (inputMode === "voice") {
// //       return language === "hindi" 
// //         ? "🎤 बोलें या टाइप करें..." 
// //         : language === "english"
// //         ? "🎤 Speak or type..."
// //         : "🎤 Bolo ya type karo...";
// //     }
// //     return language === "hindi"
// //       ? "यहां टाइप करें..."
// //       : language === "english"
// //       ? "Type here..."
// //       : "Yahan type karo...";
// //   };

// //   return (
// //     <>
// //       {/* Proactive Popup */}
// //       {showProactivePopup && (
// //         <div className="proactive-popup-overlay">
// //           <div className="proactive-popup">
// //             <button 
// //               className="popup-close"
// //               onClick={() => setShowProactivePopup(false)}
// //             >
// //               ×
// //             </button>
            
// //             <div className="popup-icon-container">
// //               <div className="popup-icon">🤖</div>
// //             </div>
            
// //             <p className="popup-message">{proactiveMessage}</p>
            
// //             <div className="popup-actions">
// //               {proactiveActions.length > 0 ? (
// //                 proactiveActions.map((action, idx) => (
// //                   <button
// //                     key={idx}
// //                     className={`popup-action-btn ${action.type}`}
// //                     onClick={action.action}
// //                   >
// //                     {action.label}
// //                   </button>
// //                 ))
// //               ) : (
// //                 <>
// //                   <button 
// //                     className="popup-action-btn primary"
// //                     onClick={() => {
// //                       setShowProactivePopup(false);
// //                       setIsOpen(true);
// //                     }}
// //                   >
// //                     {language === "hindi" ? "चैट खोलें" : language === "english" ? "Open Chat" : "Chat Kholo"}
// //                   </button>
// //                   <button 
// //                     className="popup-action-btn secondary"
// //                     onClick={() => setShowProactivePopup(false)}
// //                   >
// //                     {language === "hindi" ? "बाद में" : language === "english" ? "Later" : "Baad Mein"}
// //                   </button>
// //                 </>
// //               )}
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Floating Buddy Button */}
// //       <button
// //         className={`advanced-buddy-toggle ${isListening ? 'listening' : ''}`}
// //         onClick={() => setIsOpen(!isOpen)}
// //         aria-label="Toggle AI Buddy"
// //       >
// //         <div className="buddy-avatar">
// //           <div className="avatar-ring"></div>
// //           <div className="avatar-face">
// //             {isListening ? (
// //               <div className="sound-waves">
// //                 <span></span>
// //                 <span></span>
// //                 <span></span>
// //               </div>
// //             ) : (
// //               "🤖"
// //             )}
// //           </div>
// //         </div>
// //       </button>

// //       {/* Chat Window */}
// //       {isOpen && (
// //         <div className="advanced-buddy-window">
// //           {/* Header */}
// //           <div className="buddy-header">
// //             <div className="buddy-info">
// //               <div className="buddy-avatar-small">🤖</div>
// //               <div>
// //                 <h4>AI Buddy</h4>
// //                 <p className="buddy-status">
// //                   {language === "hindi" ? "यहाँ मदद के लिए" : language === "english" ? "Here to help" : "Madad ke liye yahan"}
// //                 </p>
// //               </div>
// //             </div>
// //             <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
// //           </div>

// //           {/* Language Selection */}
// //           <div className="voice-mode-tabs">
// //             <button
// //               className={language === "hindi" ? "active" : ""}
// //               onClick={() => setLanguage("hindi")}
// //             >
// //               हिंदी
// //             </button>
// //             <button
// //               className={language === "english" ? "active" : ""}
// //               onClick={() => setLanguage("english")}
// //             >
// //               English
// //             </button>
// //             <button
// //               className={language === "hinglish" ? "active" : ""}
// //               onClick={() => setLanguage("hinglish")}
// //             >
// //               Hinglish
// //             </button>
// //           </div>

// //           {/* Voice Mode Selection */}
// //           <div className="voice-mode-tabs" style={{ borderTop: '1px solid var(--buddy-light)' }}>
// //             <button
// //               className={voiceMode === "chat" ? "active" : ""}
// //               onClick={() => setVoiceMode("chat")}
// //             >
// //               💬 {language === "hindi" ? "चैट" : language === "english" ? "Chat" : "Chat"}
// //             </button>
// //             <button
// //               className={voiceMode === "tasks" ? "active" : ""}
// //               onClick={() => setVoiceMode("tasks")}
// //             >
// //               ✅ {language === "hindi" ? "टास्क" : language === "english" ? "Tasks" : "Tasks"}
// //             </button>
// //             <button
// //               className={voiceMode === "notes" ? "active" : ""}
// //               onClick={() => setVoiceMode("notes")}
// //             >
// //               📝 {language === "hindi" ? "नोट्स" : language === "english" ? "Notes" : "Notes"}
// //             </button>
// //           </div>

// //           {/* Messages */}
// //           <div className="buddy-messages">
// //             {messages.length === 0 && (
// //               <div className="message assistant">
// //                 <div className="message-content">
// //                   {getGreeting()}
// //                 </div>
// //               </div>
// //             )}

// //             {messages.map((msg, idx) => (
// //               <div
// //                 key={idx}
// //                 className={`message ${msg.role} ${msg.interim ? 'interim' : ''} ${msg.isReminder ? 'reminder-message' : ''} ${msg.isCheckIn ? 'checkin-message' : ''}`}
// //               >
// //                 <div className="message-content">
// //                   {msg.interim && <span className="voice-badge">listening...</span>}
// //                   {msg.isReminder && <span className="reminder-badge">⏰ Reminder</span>}
// //                   {msg.isCheckIn && <span className="checkin-badge">🤔 Check-in</span>}
// //                   {msg.content}
// //                 </div>
// //                 <div className="message-time">
// //                   {msg.timestamp?.toLocaleTimeString([], { 
// //                     hour: '2-digit', 
// //                     minute: '2-digit' 
// //                   })}
// //                 </div>
// //               </div>
// //             ))}

// //             {isProcessing && (
// //               <div className="message assistant">
// //                 <div className="message-content">
// //                   <span className="typing-indicator">●●●</span>
// //                 </div>
// //               </div>
// //             )}

// //             <div ref={messagesEndRef} />
// //           </div>

// //           {/* Input Area */}
// //           <div className="buddy-input-area">
// //             {/* Mode Hint */}
// //             {voiceMode !== "chat" && (
// //               <div className="voice-mode-hint">
// //                 <strong>
// //                   {voiceMode === "notes" 
// //                     ? (language === "hindi" ? "📝 डेली नोट्स में लिख रहे हैं" : language === "english" ? "📝 Writing to Daily Notes" : "📝 Daily Notes mein likh rahe hain")
// //                     : (language === "hindi" ? "✅ टास्क मैनेज कर रहे हैं" : language === "english" ? "✅ Managing Tasks" : "✅ Tasks manage kar rahe hain")
// //                   }
// //                 </strong>
// //                 <span>
// //                   {voiceMode === "notes"
// //                     ? (language === "hindi" ? "आपके शब्द सीधे नोट्स में जाएंगे" : language === "english" ? "Your words will go directly to notes" : "Aapke words directly notes mein jayenge")
// //                     : (language === "hindi" ? "टास्क जोड़ें, हटाएं या पूरा करें" : language === "english" ? "Add, delete, or complete tasks" : "Tasks add karo, delete karo ya complete karo")
// //                   }
// //                 </span>
// //               </div>
// //             )}

// //             {/* Input Mode Toggle */}
// //             <div className="input-mode-toggle">
// //               <button
// //                 className={inputMode === "text" ? "active" : ""}
// //                 onClick={() => {
// //                   setInputMode("text");
// //                   if (isListening) recognitionRef.current?.stop();
// //                 }}
// //               >
// //                 ⌨️ {language === "hindi" ? "टाइप" : language === "english" ? "Type" : "Type"}
// //               </button>
// //               <button
// //                 className={inputMode === "voice" ? "active" : ""}
// //                 onClick={() => setInputMode("voice")}
// //               >
// //                 🎤 {language === "hindi" ? "बोलें" : language === "english" ? "Voice" : "Bolo"}
// //               </button>
// //             </div>

// //             {/* Text Input Form */}
// //             {inputMode === "text" && (
// //               <form className="text-input-form" onSubmit={handleTextSubmit}>
// //                 <input
// //                   type="text"
// //                   value={inputText}
// //                   onChange={(e) => setInputText(e.target.value)}
// //                   placeholder={getInputPlaceholder()}
// //                   disabled={isProcessing}
// //                 />
// //                 <button type="submit" disabled={isProcessing || !inputText.trim()}>
// //                   ➤
// //                 </button>
// //               </form>
// //             )}

// //             {/* Voice Input Control */}
// //             {inputMode === "voice" && (
// //               <div className="voice-input-control">
// //                 <button
// //                   className={`voice-btn ${isListening ? 'active' : ''}`}
// //                   onClick={toggleVoiceInput}
// //                   disabled={isProcessing}
// //                 >
// //                   {isListening ? (
// //                     <>
// //                       <div className="pulse-ring"></div>
// //                       🔴 {language === "hindi" ? "बंद करें" : language === "english" ? "Stop" : "Band Karo"}
// //                     </>
// //                   ) : (
// //                     <>
// //                       🎤 {language === "hindi" ? "बोलना शुरू करें" : language === "english" ? "Start Speaking" : "Bolna Shuru Karo"}
// //                     </>
// //                   )}
// //                 </button>
                
// //                 {/* Manual text input while in voice mode */}
// //                 <form className="text-input-form" onSubmit={handleTextSubmit} style={{ marginTop: '12px' }}>
// //                   <input
// //                     type="text"
// //                     value={inputText}
// //                     onChange={(e) => setInputText(e.target.value)}
// //                     placeholder={language === "hindi" ? "या यहां टाइप करें..." : language === "english" ? "Or type here..." : "Ya yahan type karo..."}
// //                     disabled={isProcessing}
// //                   />
// //                   <button type="submit" disabled={isProcessing || !inputText.trim()}>
// //                     ➤
// //                   </button>
// //                 </form>
// //               </div>
// //             )}
// //           </div>
// //         </div>
// //       )}


// //     </>
// //   );
// // }
// import React, { useState, useEffect, useRef } from "react";
// import "./ChatBuddy.css";

// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// export default function AdvancedBuddy({
//   currentDate,
//   tasks,
//   onAddTask,
//   onCompleteTask,
//   onDeleteTask,
//   onUpdateNotes
// }) {
//   const [isOpen, setIsOpen] = useState(false);
//   const [messages, setMessages] = useState([]);
//   const [inputText, setInputText] = useState("");
//   const [inputMode, setInputMode] = useState("text");
//   const [voiceMode, setVoiceMode] = useState("chat");
//   const [isListening, setIsListening] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [language, setLanguage] = useState(
//     localStorage.getItem("buddy-language") || "hinglish"
//   );
//   const [showProactivePopup, setShowProactivePopup] = useState(false);
//   const [proactiveMessage, setProactiveMessage] = useState("");
//   const [proactiveActions, setProactiveActions] = useState([]);
//   const [taskReminders, setTaskReminders] = useState(new Set());
//   const [taskCheckIns, setTaskCheckIns] = useState(new Set());
  
//   const messagesEndRef = useRef(null);
//   const recognitionRef = useRef(null);
//   const interimTranscriptRef = useRef("");
//   const reminderIntervalRef = useRef(null);
//   const checkInIntervalRef = useRef(null);

//   // Scroll to bottom
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   useEffect(() => {
//     localStorage.setItem("buddy-language", language);
//   }, [language]);

//   // Initialize Speech Recognition
//   useEffect(() => {
//     if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
//       console.warn("Speech recognition not supported");
//       return;
//     }

//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     const recognition = new SpeechRecognition();
    
//     recognition.continuous = true;
//     recognition.interimResults = true;
//     recognition.lang = language === "hindi" ? "hi-IN" : "en-IN";

//     recognition.onstart = () => {
//       setIsListening(true);
//       interimTranscriptRef.current = "";
//     };

//     recognition.onresult = (event) => {
//       let interimTranscript = "";
//       let finalTranscript = "";

//       for (let i = event.resultIndex; i < event.results.length; i++) {
//         const transcript = event.results[i][0].transcript;
//         if (event.results[i].isFinal) {
//           finalTranscript += transcript;
//         } else {
//           interimTranscript += transcript;
//         }
//       }

//       if (interimTranscript) {
//         interimTranscriptRef.current = interimTranscript;
//         setMessages(prev => {
//           const filtered = prev.filter(m => !m.interim);
//           return [...filtered, {
//             role: "user",
//             content: interimTranscript,
//             interim: true,
//             timestamp: new Date()
//           }];
//         });
//       }

//       if (finalTranscript) {
//         setMessages(prev => prev.filter(m => !m.interim));
//         handleSendMessage(finalTranscript);
//         interimTranscriptRef.current = "";
//       }
//     };

//     recognition.onerror = (event) => {
//       console.error("Speech recognition error:", event.error);
//       setIsListening(false);
//     };

//     recognition.onend = () => {
//       setIsListening(false);
//       setMessages(prev => prev.filter(m => !m.interim));
//     };

//     recognitionRef.current = recognition;

//     return () => {
//       if (recognitionRef.current) {
//         recognitionRef.current.stop();
//       }
//     };
//   }, [language]);

//   // Proactive check-ins
//   useEffect(() => {
//     if (!isOpen) {
//       checkProactivePopup();
//     }
//   }, [tasks, currentDate]);

//   // Task monitoring
//   useEffect(() => {
//     if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
//     if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);

//     reminderIntervalRef.current = setInterval(() => {
//       checkTaskReminders();
//     }, 60000);

//     checkInIntervalRef.current = setInterval(() => {
//       checkTaskCompletions();
//     }, 60000);

//     checkTaskReminders();
//     checkTaskCompletions();

//     return () => {
//       if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
//       if (checkInIntervalRef.current) clearInterval(checkInIntervalRef.current);
//     };
//   }, [tasks, currentDate, language]);

//   const checkTaskReminders = async () => {
//     const now = new Date();
//     const currentTime = now.getHours() * 60 + now.getMinutes();

//     for (const task of tasks) {
//       if (!task.startTime || task.completed) continue;

//       const [hours, minutes] = task.startTime.split(':').map(Number);
//       const taskStartTime = hours * 60 + minutes;
//       const timeDiff = taskStartTime - currentTime;

//       const reminderKey = `reminder-${task.id}-${currentDate}`;
//       if (timeDiff === 10 && !taskReminders.has(reminderKey)) {
//         setTaskReminders(prev => new Set(prev).add(reminderKey));
//         await sendTaskReminder(task);
//       }
//     }
//   };

//   const checkTaskCompletions = async () => {
//     const now = new Date();
//     const currentTime = now.getHours() * 60 + now.getMinutes();

//     for (const task of tasks) {
//       if (!task.startTime || task.completed) continue;

//       const [hours, minutes] = task.startTime.split(':').map(Number);
//       const taskStartTime = hours * 60 + minutes;
//       const timePassed = currentTime - taskStartTime;

//       const checkInKey = `checkin-${task.id}-${currentDate}`;
//       if (timePassed === 30 && !task.completed && !taskCheckIns.has(checkInKey)) {
//         setTaskCheckIns(prev => new Set(prev).add(checkInKey));
//         await sendTaskCheckIn(task);
//       }
//     }
//   };

//   const sendTaskReminder = async (task) => {
//     try {
//       const response = await fetch(`${API_URL}/api/task-reminder`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ task, language, currentDate })
//       });

//       const data = await response.json();
      
//       const motivationalMessages = {
//         hindi: `⏰ "${task.title}" 10 मिनट में शुरू होने वाला है। तैयार हो जाओ!`,
//         english: `⏰ "${task.title}" starts in 10 minutes. Get ready!`,
//         hinglish: `⏰ "${task.title}" 10 min mein start hone wala hai. Ready ho jao!`
//       };

//       setProactiveMessage(motivationalMessages[language] || motivationalMessages.hinglish);
//       setProactiveActions([
//         {
//           label: language === "hindi" ? "शुरू करता हूं 💪" : language === "english" ? "Let's Do It 💪" : "Chalo Shuru Karte Hain 💪",
//           type: "primary",
//           action: () => {
//             setShowProactivePopup(false);
//             setIsOpen(true);
//             setMessages(prev => [...prev, {
//               role: "assistant",
//               content: language === "hindi" 
//                 ? `बहुत बढ़िया! "${task.title}" के लिए तैयार हो? कोई मदद चाहिए?`
//                 : language === "english"
//                 ? `Great! Ready for "${task.title}"? Need any help?`
//                 : `Badhiya! "${task.title}" ke liye ready ho? Koi help chahiye?`,
//               timestamp: new Date()
//             }]);
//           }
//         },
//         {
//           label: language === "hindi" ? "बाद में" : language === "english" ? "Remind Later" : "Baad Mein",
//           type: "secondary",
//           action: () => setShowProactivePopup(false)
//         }
//       ]);
//       setShowProactivePopup(true);

//       if (isOpen) {
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: `⏰ ${motivationalMessages[language] || motivationalMessages.hinglish}`,
//           timestamp: new Date(),
//           isReminder: true
//         }]);
//       }
//     } catch (error) {
//       console.error("Task reminder error:", error);
//     }
//   };

//   const sendTaskCheckIn = async (task) => {
//     try {
//       const response = await fetch(`${API_URL}/api/task-checkin`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ task, language, currentDate })
//       });

//       const data = await response.json();
      
//       const checkInMessages = {
//         hindi: `🤔 "${task.title}" हो गया क्या? अगर नहीं हुआ तो कोई बात नहीं - मैं मदद कर सकता हूं!`,
//         english: `🤔 Did you finish "${task.title}"? If not, no worries - I can help!`,
//         hinglish: `🤔 "${task.title}" ho gaya kya? Agar nahi hua to koi baat nahi - main help kar sakta hoon!`
//       };

//       setProactiveMessage(checkInMessages[language] || checkInMessages.hinglish);
//       setProactiveActions([
//         {
//           label: language === "hindi" ? "हो गया! ✅" : language === "english" ? "Done! ✅" : "Ho Gaya! ✅",
//           type: "primary",
//           action: () => {
//             onCompleteTask(task.id);
//             setShowProactivePopup(false);
            
//             const celebrationMsg = {
//               hindi: `🎉 शाबाश! "${task.title}" पूरा हो गया! अगला क्या है?`,
//               english: `🎉 Awesome! "${task.title}" completed! What's next?`,
//               hinglish: `🎉 Shabaash! "${task.title}" complete ho gaya! Agla kya hai?`
//             };
            
//             setIsOpen(true);
//             setMessages(prev => [...prev, {
//               role: "assistant",
//               content: celebrationMsg[language] || celebrationMsg.hinglish,
//               timestamp: new Date()
//             }]);
//           }
//         },
//         {
//           label: language === "hindi" ? "अभी नहीं - मदद चाहिए" : language === "english" ? "Not Yet - Need Help" : "Abhi Nahi - Help Chahiye",
//           type: "secondary",
//           action: () => {
//             setShowProactivePopup(false);
//             setIsOpen(true);
            
//             const helpMsg = {
//               hindi: `कोई बात नहीं! "${task.title}" में क्या problem आ रही है? मैं इसे छोटे steps में तोड़ सकता हूं या tips दे सकता हूं!`,
//               english: `No problem! What's challenging about "${task.title}"? I can break it into smaller steps or give you tips!`,
//               hinglish: `Koi baat nahi! "${task.title}" mein kya problem aa rahi hai? Main isko chhote steps mein tod sakta hoon ya tips de sakta hoon!`
//             };
            
//             setMessages(prev => [...prev, {
//               role: "assistant",
//               content: helpMsg[language] || helpMsg.hinglish,
//               timestamp: new Date(),
//               isCheckIn: true
//             }]);
//           }
//         }
//       ]);
//       setShowProactivePopup(true);

//       if (isOpen) {
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: `🤔 ${checkInMessages[language] || checkInMessages.hinglish}`,
//           timestamp: new Date(),
//           isCheckIn: true
//         }]);
//       }
//     } catch (error) {
//       console.error("Task check-in error:", error);
//     }
//   };

//   const checkProactivePopup = async () => {
//     const now = new Date();
//     const hour = now.getHours();
//     const lastPopupKey = `last-proactive-popup-${currentDate}`;
//     const lastPopup = localStorage.getItem(lastPopupKey);

//     if (lastPopup) return;

//     let type = null;
//     if (hour === 8) type = "morning";
//     else if (hour === 12) type = "midday";
//     else if (hour === 18) type = "evening";
//     else if (hour === 22) type = "night";

//     if (!type) return;

//     try {
//       const taskContext = getTaskContext();
//       const response = await fetch(`${API_URL}/api/proactive-checkin`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ type, language, taskContext, currentDate })
//       });

//       const data = await response.json();
//       setProactiveMessage(data.message);
//       setShowProactivePopup(true);
//       localStorage.setItem(lastPopupKey, Date.now().toString());
//     } catch (error) {
//       console.error("Proactive popup error:", error);
//     }
//   };

//   const getTaskContext = () => {
//     const total = tasks.length;
//     const completed = tasks.filter(t => t.completed).length;
//     const pending = total - completed;
//     const pendingTasks = tasks.filter(t => !t.completed);
//     const completedTasks = tasks.filter(t => t.completed);

//     return { total, completed, pending, pendingTasks, completedTasks };
//   };

//   const handleSendMessage = async (text) => {
//     if (!text.trim()) return;

//     const userMessage = {
//       role: "user",
//       content: text,
//       timestamp: new Date()
//     };

//     setMessages(prev => [...prev, userMessage]);
//     setInputText("");
//     setIsProcessing(true);

//     try {
//       const taskContext = getTaskContext();
//       const response = await fetch(`${API_URL}/api/advanced-chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           messages: [...messages, userMessage],
//           language,
//           taskContext,
//           isVoice: inputMode === "voice",
//           currentDate,
//           voiceMode: voiceMode
//         })
//       });

//       const data = await response.json();

//       // Handle actions
//       if (data.actions && data.actions.length > 0) {
//         for (const action of data.actions) {
//           await handleAction(action);
//         }
//       }

//       // Add assistant response
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: data.message,
//         timestamp: new Date()
//       }]);

//     } catch (error) {
//       console.error("Chat error:", error);
//       setMessages(prev => [...prev, {
//         role: "assistant",
//         content: "Sorry, something went wrong. Please try again.",
//         timestamp: new Date()
//       }]);
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   // ═══════════════════════════════════════════════════════════
//   // FIXED ACTION HANDLER - Better matching & service worker reminders
//   // ═══════════════════════════════════════════════════════════
//   const handleAction = async (action) => {
//     console.log("🎯 Handling action:", action);
    
//     switch (action.type) {
//       case "set_reminder":
//         // SERVICE WORKER REMINDER - Not a task!
//         console.log("⏰ Setting reminder:", action.params);
//         await scheduleReminder(action.params.time, action.params.message);
        
//         const reminderMsg = {
//           hindi: `⏰ Reminder set ho gaya - ${action.params.time} pe notification aayega!`,
//           english: `⏰ Reminder set for ${action.params.time} - you'll get a notification!`,
//           hinglish: `⏰ Reminder set ho gaya - ${action.params.time} pe notification aayega!`
//         };
        
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: reminderMsg[language] || reminderMsg.hinglish,
//           timestamp: new Date()
//         }]);
//         break;
        
//       case "add_task":
//         console.log("✅ Adding task:", action.params);
//         onAddTask(
//           action.params.title,
//           action.params.timeOfDay,
//           action.params.startTime || null,
//           action.params.endTime || null
//         );
        
//         // Better time display
//         let timeDisplay = "";
//         if (action.params.startTime && action.params.endTime) {
//           timeDisplay = ` (${action.params.startTime} - ${action.params.endTime})`;
//         } else if (action.params.startTime) {
//           timeDisplay = ` (${action.params.startTime} pe)`;
//         }
        
//         const confirmMsg = {
//           hindi: `✅ "${action.params.title}" task add ho gaya${timeDisplay}!`,
//           english: `✅ Added "${action.params.title}"${timeDisplay}!`,
//           hinglish: `✅ "${action.params.title}" task add ho gaya${timeDisplay}!`
//         };
        
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: confirmMsg[language] || confirmMsg.hinglish,
//           timestamp: new Date()
//         }]);
//         break;
      
//       case "complete_task":
//         // IMPROVED MATCHING
//         let taskToComplete = tasks.find(t => 
//           t.title.toLowerCase() === action.params.taskTitle.toLowerCase()
//         );
        
//         if (!taskToComplete) {
//           taskToComplete = tasks.find(t => 
//             t.title.toLowerCase().includes(action.params.taskTitle.toLowerCase())
//           );
//         }
        
//         if (!taskToComplete) {
//           taskToComplete = tasks.find(t => 
//             action.params.taskTitle.toLowerCase().includes(t.title.toLowerCase())
//           );
//         }
        
//         if (taskToComplete) {
//           console.log("✓ Completing task:", taskToComplete);
//           onCompleteTask(taskToComplete.id);
          
//           const completeMsg = {
//             hindi: `🎉 बढ़िया! "${taskToComplete.title}" complete हो गया!`,
//             english: `🎉 Great! "${taskToComplete.title}" is done!`,
//             hinglish: `🎉 Badhiya! "${taskToComplete.title}" complete ho gaya!`
//           };
          
//           setMessages(prev => [...prev, {
//             role: "assistant",
//             content: completeMsg[language] || completeMsg.hinglish,
//             timestamp: new Date()
//           }]);
//         } else {
//           const pendingTasks = tasks.filter(t => !t.completed);
//           const taskList = pendingTasks.map(t => `"${t.title}"`).join(", ");
          
//           const notFoundMsg = {
//             hindi: `Pending tasks: ${taskList}. Kaun sa complete karna hai?`,
//             english: `Pending tasks: ${taskList}. Which one to complete?`,
//             hinglish: `Pending tasks: ${taskList}. Kaun sa complete karna hai?`
//           };
          
//           setMessages(prev => [...prev, {
//             role: "assistant",
//             content: notFoundMsg[language] || notFoundMsg.hinglish,
//             timestamp: new Date()
//           }]);
//         }
//         break;
      
//       case "delete_task":
//         // SUPER IMPROVED MATCHING
//         console.log("🔍 Searching for task to delete:", action.params.taskTitle);
//         console.log("📋 Available tasks:", tasks.map(t => t.title));
        
//         let taskToDelete = tasks.find(t => 
//           t.title.toLowerCase() === action.params.taskTitle.toLowerCase()
//         );
        
//         if (!taskToDelete) {
//           taskToDelete = tasks.find(t => 
//             t.title.toLowerCase().includes(action.params.taskTitle.toLowerCase())
//           );
//         }
        
//         if (!taskToDelete) {
//           taskToDelete = tasks.find(t => 
//             action.params.taskTitle.toLowerCase().includes(t.title.toLowerCase())
//           );
//         }
        
//         if (!taskToDelete) {
//           // Fuzzy match - check if words overlap
//           const searchWords = action.params.taskTitle.toLowerCase().split(' ');
//           taskToDelete = tasks.find(t => {
//             const taskWords = t.title.toLowerCase().split(' ');
//             return searchWords.some(sw => taskWords.some(tw => tw.includes(sw) || sw.includes(tw)));
//           });
//         }
        
//         if (!taskToDelete && tasks.length > 0) {
//           // Last resort: delete most recent task
//           taskToDelete = tasks[tasks.length - 1];
//           console.log("⚠️ Using last task as fallback:", taskToDelete.title);
//         }
        
//         if (taskToDelete) {
//           console.log("🗑️ Deleting task:", taskToDelete.title);
//           onDeleteTask(taskToDelete.id);
          
//           const deleteMsg = {
//             hindi: `🗑️ "${taskToDelete.title}" delete ho gaya!`,
//             english: `🗑️ Deleted "${taskToDelete.title}"!`,
//             hinglish: `🗑️ "${taskToDelete.title}" delete ho gaya!`
//           };
          
//           setMessages(prev => [...prev, {
//             role: "assistant",
//             content: deleteMsg[language] || deleteMsg.hinglish,
//             timestamp: new Date()
//           }]);
//         } else {
//           const notFoundMsg = {
//             hindi: `Koi task nahi mila delete karne ke liye.`,
//             english: `No task found to delete.`,
//             hinglish: `Koi task nahi mila delete karne ke liye.`
//           };
          
//           setMessages(prev => [...prev, {
//             role: "assistant",
//             content: notFoundMsg[language] || notFoundMsg.hinglish,
//             timestamp: new Date()
//           }]);
//         }
//         break;
      
//       case "update_notes":
//         onUpdateNotes(action.params.content, action.params.mode || 'append');
        
//         const notesMsg = {
//           hindi: `📝 नोट्स में add हो गया!`,
//           english: `📝 Added to your notes!`,
//           hinglish: `📝 Notes mein add ho gaya!`
//         };
        
//         setMessages(prev => [...prev, {
//           role: "assistant",
//           content: notesMsg[language] || notesMsg.hinglish,
//           timestamp: new Date()
//         }]);
//         break;
        
//       default:
//         console.warn("Unknown action type:", action.type);
//     }
//   };
  
//   // ═══════════════════════════════════════════════════════════
//   // SERVICE WORKER REMINDER SYSTEM
//   // ═══════════════════════════════════════════════════════════
//   const scheduleReminder = async (time, message) => {
//     const [hours, minutes] = time.split(':').map(Number);
//     const now = new Date();
//     const reminderTime = new Date();
//     reminderTime.setHours(hours, minutes, 0, 0);
    
//     // If time has passed today, schedule for tomorrow
//     if (reminderTime <= now) {
//       reminderTime.setDate(reminderTime.getDate() + 1);
//     }
    
//     const delay = reminderTime.getTime() - now.getTime();
    
//     console.log(`⏰ Scheduling reminder for ${time}, delay: ${Math.round(delay/1000)}s`);
    
//     // Request notification permission
//     if ('Notification' in window && Notification.permission === 'default') {
//       await Notification.requestPermission();
//     }
    
//     // Store reminder
//     const reminders = JSON.parse(localStorage.getItem('pending-reminders') || '[]');
//     const reminder = {
//       id: Date.now(),
//       time,
//       message: message || `Reminder at ${time}`,
//       scheduledFor: reminderTime.toISOString()
//     };
//     reminders.push(reminder);
//     localStorage.setItem('pending-reminders', JSON.stringify(reminders));
    
//     // Schedule notification
//     setTimeout(async () => {
//       await showServiceWorkerNotification(reminder.message);
      
//       // Remove from pending
//       const updated = JSON.parse(localStorage.getItem('pending-reminders') || '[]');
//       const filtered = updated.filter(r => r.id !== reminder.id);
//       localStorage.setItem('pending-reminders', JSON.stringify(filtered));
//     }, delay);
//   };
  
//   const showServiceWorkerNotification = async (message) => {
//     console.log("🔔 Sending notification:", message);
    
//     if ('serviceWorker' in navigator && 'Notification' in window) {
//       if (Notification.permission === 'default') {
//         await Notification.requestPermission();
//       }
      
//       if (Notification.permission === 'granted') {
//         try {
//           const registration = await navigator.serviceWorker.ready;
          
//           await registration.showNotification('AI Buddy Reminder ⏰', {
//             body: message,
//             icon: '/icon-192x192.png',
//             badge: '/icon-192x192.png',
//             vibrate: [200, 100, 200, 100, 200],
//             tag: 'buddy-reminder-' + Date.now(),
//             requireInteraction: true,
//             actions: [
//               { action: 'open', title: 'Open App 📱' },
//               { action: 'dismiss', title: 'Got it ✓' }
//             ],
//             data: { url: '/' }
//           });
          
//           console.log("✅ Service worker notification sent");
//         } catch (error) {
//           console.error("Service worker notification failed:", error);
//           // Fallback to regular notification
//           new Notification('AI Buddy Reminder ⏰', {
//             body: message,
//             icon: '/icon-192x192.png'
//           });
//         }
//       } else {
//         console.log("Notification permission denied");
//       }
//     }
//   };

//   const toggleVoiceInput = () => {
//     if (isListening) {
//       recognitionRef.current?.stop();
//     } else {
//       recognitionRef.current?.start();
//     }
//   };

//   const handleTextSubmit = (e) => {
//     e.preventDefault();
//     if (inputText.trim()) {
//       handleSendMessage(inputText);
//     }
//   };

//   const getGreeting = () => {
//     if (voiceMode === "notes") {
//       const greetings = {
//         hindi: "📝 डेली नोट्स मोड। अपने विचार बोलें या लिखें!",
//         english: "📝 Daily Notes Mode. Speak or write your thoughts!",
//         hinglish: "📝 Daily Notes Mode. Apne thoughts bolo ya likho!"
//       };
//       return greetings[language] || greetings.hinglish;
//     } else if (voiceMode === "tasks") {
//       const greetings = {
//         hindi: "✅ टास्क मोड। टास्क जोड़ें, पूरा करें, या मैनेज करें!",
//         english: "✅ Tasks Mode. Add, complete, or manage your tasks!",
//         hinglish: "✅ Tasks Mode. Add karo, complete karo, ya manage karo!"
//       };
//       return greetings[language] || greetings.hinglish;
//     } else {
//       const greetings = {
//         hindi: "नमस्ते! मैं आपका AI साथी हूं। कैसे मदद करूं?",
//         english: "Hey! I'm your AI buddy. How can I help you today?",
//         hinglish: "Hey! Main aapka AI buddy hoon. Kaise help karoon?"
//       };
//       return greetings[language] || greetings.hinglish;
//     }
//   };

//   const getInputPlaceholder = () => {
//     if (inputMode === "voice") {
//       return language === "hindi" 
//         ? "🎤 बोलें या टाइप करें..." 
//         : language === "english"
//         ? "🎤 Speak or type..."
//         : "🎤 Bolo ya type karo...";
//     }
//     return language === "hindi"
//       ? "यहां टाइप करें..."
//       : language === "english"
//       ? "Type here..."
//       : "Yahan type karo...";
//   };

//   return (
//     <>
//       {/* Proactive Popup */}
//       {showProactivePopup && (
//         <div className="proactive-popup-overlay">
//           <div className="proactive-popup">
//             <button 
//               className="popup-close"
//               onClick={() => setShowProactivePopup(false)}
//             >
//               ×
//             </button>
            
//             <div className="popup-icon-container">
//               <div className="popup-icon">🤖</div>
//             </div>
            
//             <p className="popup-message">{proactiveMessage}</p>
            
//             <div className="popup-actions">
//               {proactiveActions.length > 0 ? (
//                 proactiveActions.map((action, idx) => (
//                   <button
//                     key={idx}
//                     className={`popup-action-btn ${action.type}`}
//                     onClick={action.action}
//                   >
//                     {action.label}
//                   </button>
//                 ))
//               ) : (
//                 <>
//                   <button 
//                     className="popup-action-btn primary"
//                     onClick={() => {
//                       setShowProactivePopup(false);
//                       setIsOpen(true);
//                     }}
//                   >
//                     {language === "hindi" ? "चैट खोलें" : language === "english" ? "Open Chat" : "Chat Kholo"}
//                   </button>
//                   <button 
//                     className="popup-action-btn secondary"
//                     onClick={() => setShowProactivePopup(false)}
//                   >
//                     {language === "hindi" ? "बाद में" : language === "english" ? "Later" : "Baad Mein"}
//                   </button>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Floating Buddy Button */}
//       <button
//         className={`advanced-buddy-toggle ${isListening ? 'listening' : ''}`}
//         onClick={() => setIsOpen(!isOpen)}
//         aria-label="Toggle AI Buddy"
//       >
//         <div className="buddy-avatar">
//           <div className="avatar-ring"></div>
//           <div className="avatar-face">
//             {isListening ? (
//               <div className="sound-waves">
//                 <span></span>
//                 <span></span>
//                 <span></span>
//               </div>
//             ) : (
//               "🤖"
//             )}
//           </div>
//         </div>
//       </button>

//       {/* Chat Window */}
//       {isOpen && (
//         <div className="advanced-buddy-window">
//           <div className="buddy-header">
//             <div className="buddy-info">
//               <div className="buddy-avatar-small">🤖</div>
//               <div>
//                 <h4>AI Buddy</h4>
//                 <p className="buddy-status">
//                   {language === "hindi" ? "यहाँ मदद के लिए" : language === "english" ? "Here to help" : "Madad ke liye yahan"}
//                 </p>
//               </div>
//             </div>
//             <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
//           </div>

//           {/* Language Selection */}
//           <div className="voice-mode-tabs">
//             <button
//               className={language === "hindi" ? "active" : ""}
//               onClick={() => setLanguage("hindi")}
//             >
//               हिंदी
//             </button>
//             <button
//               className={language === "english" ? "active" : ""}
//               onClick={() => setLanguage("english")}
//             >
//               English
//             </button>
//             <button
//               className={language === "hinglish" ? "active" : ""}
//               onClick={() => setLanguage("hinglish")}
//             >
//               Hinglish
//             </button>
//           </div>

//           {/* Voice Mode Selection */}
//           <div className="voice-mode-tabs" style={{ borderTop: '1px solid var(--buddy-light)' }}>
//             <button
//               className={voiceMode === "chat" ? "active" : ""}
//               onClick={() => setVoiceMode("chat")}
//             >
//               💬 {language === "hindi" ? "चैट" : language === "english" ? "Chat" : "Chat"}
//             </button>
//             <button
//               className={voiceMode === "tasks" ? "active" : ""}
//               onClick={() => setVoiceMode("tasks")}
//             >
//               ✅ {language === "hindi" ? "टास्क" : language === "english" ? "Tasks" : "Tasks"}
//             </button>
//             <button
//               className={voiceMode === "notes" ? "active" : ""}
//               onClick={() => setVoiceMode("notes")}
//             >
//               📝 {language === "hindi" ? "नोट्स" : language === "english" ? "Notes" : "Notes"}
//             </button>
//           </div>

//           {/* Messages */}
//           <div className="buddy-messages">
//             {messages.length === 0 && (
//               <div className="message assistant">
//                 <div className="message-content">
//                   {getGreeting()}
//                 </div>
//               </div>
//             )}

//             {messages.map((msg, idx) => (
//               <div
//                 key={idx}
//                 className={`message ${msg.role} ${msg.interim ? 'interim' : ''} ${msg.isReminder ? 'reminder-message' : ''} ${msg.isCheckIn ? 'checkin-message' : ''}`}
//               >
//                 <div className="message-content">
//                   {msg.interim && <span className="voice-badge">listening...</span>}
//                   {msg.isReminder && <span className="reminder-badge">⏰ Reminder</span>}
//                   {msg.isCheckIn && <span className="checkin-badge">🤔 Check-in</span>}
//                   {msg.content}
//                 </div>
//                 <div className="message-time">
//                   {msg.timestamp?.toLocaleTimeString([], { 
//                     hour: '2-digit', 
//                     minute: '2-digit' 
//                   })}
//                 </div>
//               </div>
//             ))}

//             {isProcessing && (
//               <div className="message assistant">
//                 <div className="message-content">
//                   <span className="typing-indicator">●●●</span>
//                 </div>
//               </div>
//             )}

//             <div ref={messagesEndRef} />
//           </div>

//           {/* Input Area */}
//           <div className="buddy-input-area">
//             {voiceMode !== "chat" && (
//               <div className="voice-mode-hint">
//                 <strong>
//                   {voiceMode === "notes" 
//                     ? (language === "hindi" ? "📝 डेली नोट्स में लिख रहे हैं" : language === "english" ? "📝 Writing to Daily Notes" : "📝 Daily Notes mein likh rahe hain")
//                     : (language === "hindi" ? "✅ टास्क मैनेज कर रहे हैं" : language === "english" ? "✅ Managing Tasks" : "✅ Tasks manage kar rahe hain")
//                   }
//                 </strong>
//                 <span>
//                   {voiceMode === "notes"
//                     ? (language === "hindi" ? "आपके शब्द सीधे नोट्स में जाएंगे" : language === "english" ? "Your words will go directly to notes" : "Aapke words directly notes mein jayenge")
//                     : (language === "hindi" ? "टास्क जोड़ें, हटाएं या पूरा करें" : language === "english" ? "Add, delete, or complete tasks" : "Tasks add karo, delete karo ya complete karo")
//                   }
//                 </span>
//               </div>
//             )}

//             {/* Input Mode Toggle */}
//             <div className="input-mode-toggle">
//               <button
//                 className={inputMode === "text" ? "active" : ""}
//                 onClick={() => {
//                   setInputMode("text");
//                   if (isListening) recognitionRef.current?.stop();
//                 }}
//               >
//                 ⌨️ {language === "hindi" ? "टाइप" : language === "english" ? "Type" : "Type"}
//               </button>
//               <button
//                 className={inputMode === "voice" ? "active" : ""}
//                 onClick={() => setInputMode("voice")}
//               >
//                 🎤 {language === "hindi" ? "बोलें" : language === "english" ? "Voice" : "Bolo"}
//               </button>
//             </div>

//             {/* Text Input Form */}
//             {inputMode === "text" && (
//               <form className="text-input-form" onSubmit={handleTextSubmit}>
//                 <input
//                   type="text"
//                   value={inputText}
//                   onChange={(e) => setInputText(e.target.value)}
//                   placeholder={getInputPlaceholder()}
//                   disabled={isProcessing}
//                 />
//                 <button type="submit" disabled={isProcessing || !inputText.trim()}>
//                   ➤
//                 </button>
//               </form>
//             )}

//             {/* Voice Input Control */}
//             {inputMode === "voice" && (
//               <div className="voice-input-control">
//                 <button
//                   className={`voice-btn ${isListening ? 'active' : ''}`}
//                   onClick={toggleVoiceInput}
//                   disabled={isProcessing}
//                 >
//                   {isListening ? (
//                     <>
//                       <div className="pulse-ring"></div>
//                       🔴 {language === "hindi" ? "बंद करें" : language === "english" ? "Stop" : "Band Karo"}
//                     </>
//                   ) : (
//                     <>
//                       🎤 {language === "hindi" ? "बोलना शुरू करें" : language === "english" ? "Start Speaking" : "Bolna Shuru Karo"}
//                     </>
//                   )}
//                 </button>
                
//                 {/* Manual text input while in voice mode */}
//                 <form className="text-input-form" onSubmit={handleTextSubmit} style={{ marginTop: '12px' }}>
//                   <input
//                     type="text"
//                     value={inputText}
//                     onChange={(e) => setInputText(e.target.value)}
//                     placeholder={language === "hindi" ? "या यहां टाइप करें..." : language === "english" ? "Or type here..." : "Ya yahan type karo..."}
//                     disabled={isProcessing}
//                   />
//                   <button type="submit" disabled={isProcessing || !inputText.trim()}>
//                     ➤
//                   </button>
//                 </form>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
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
  onAddAlarm  // NEW: Callback to add alarm to AlarmPlanner
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

  // ═══════════════════════════════════════════════════════════
  // ENHANCED ACTION HANDLER - WITH ALARM SUPPORT
  // ═══════════════════════════════════════════════════════════
  const handleAction = async (action) => {
    console.log("🎯 Handling action:", action);
    
    switch (action.type) {
      case "set_alarm":
        // NEW: Set alarm through AlarmPlanner
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
        // SERVICE WORKER REMINDER - Not a task!
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
        
        // Better time display
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
        // IMPROVED MATCHING
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
        // SUPER IMPROVED MATCHING
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
          // Fuzzy match - check if words overlap
          const searchWords = action.params.taskTitle.toLowerCase().split(' ');
          taskToDelete = tasks.find(t => {
            const taskWords = t.title.toLowerCase().split(' ');
            return searchWords.some(sw => taskWords.some(tw => tw.includes(sw) || sw.includes(tw)));
          });
        }
        
        if (!taskToDelete && tasks.length > 0) {
          // Last resort: delete most recent task
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
  
  // ═══════════════════════════════════════════════════════════
  // SERVICE WORKER REMINDER SYSTEM
  // ═══════════════════════════════════════════════════════════
  const scheduleReminder = async (time, message) => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    const delay = reminderTime.getTime() - now.getTime();
    
    console.log(`⏰ Scheduling reminder for ${time}, delay: ${Math.round(delay/1000)}s`);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    
    // Store reminder
    const reminders = JSON.parse(localStorage.getItem('pending-reminders') || '[]');
    const reminder = {
      id: Date.now(),
      time,
      message: message || `Reminder at ${time}`,
      scheduledFor: reminderTime.toISOString()
    };
    reminders.push(reminder);
    localStorage.setItem('pending-reminders', JSON.stringify(reminders));
    
    // Schedule notification
    setTimeout(async () => {
      await showServiceWorkerNotification(reminder.message);
      
      // Remove from pending
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
          // Fallback to regular notification
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
        hindi: "📝 डेली नोट्स मोड। अपने विचार बोलें या लिखें!",
        english: "📝 Daily Notes Mode. Speak or write your thoughts!",
        hinglish: "📝 Daily Notes Mode. Apne thoughts bolo ya likho!"
      };
      return greetings[language] || greetings.hinglish;
    } else if (voiceMode === "tasks") {
      const greetings = {
        hindi: "✅ टास्क मोड। टास्क जोड़ें, पूरा करें, या मैनेज करें!",
        english: "✅ Tasks Mode. Add, complete, or manage your tasks!",
        hinglish: "✅ Tasks Mode. Add karo, complete karo, ya manage karo!"
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
        ? "🎤 बोलें या टाइप करें..." 
        : language === "english"
        ? "🎤 Speak or type..."
        : "🎤 Bolo ya type karo...";
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
              <div className="popup-icon">🤖</div>
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
                    {language === "hindi" ? "चैट खोलें" : language === "english" ? "Open Chat" : "Chat Kholo"}
                  </button>
                  <button 
                    className="popup-action-btn secondary"
                    onClick={() => setShowProactivePopup(false)}
                  >
                    {language === "hindi" ? "बाद में" : language === "english" ? "Later" : "Baad Mein"}
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
          <div className="avatar-ring"></div>
          <div className="avatar-face">
            {isListening ? (
              <div className="sound-waves">
                <span></span>
                <span></span>
                <span></span>
              </div>
            ) : (
              "🤖"
            )}
          </div>
        </div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="advanced-buddy-window">
          <div className="buddy-header">
            <div className="buddy-info">
              <div className="buddy-avatar-small">🤖</div>
              <div>
                <h4>AI Buddy</h4>
                <p className="buddy-status">
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
              हिंदी
            </button>
            <button
              className={language === "english" ? "active" : ""}
              onClick={() => setLanguage("english")}
            >
              English
            </button>
            <button
              className={language === "hinglish" ? "active" : ""}
              onClick={() => setLanguage("hinglish")}
            >
              Hinglish
            </button>
          </div>

          {/* Voice Mode Selection */}
          <div className="voice-mode-tabs" style={{ borderTop: '1px solid var(--buddy-light)' }}>
            <button
              className={voiceMode === "chat" ? "active" : ""}
              onClick={() => setVoiceMode("chat")}
            >
              💬 {language === "hindi" ? "चैट" : language === "english" ? "Chat" : "Chat"}
            </button>
            <button
              className={voiceMode === "tasks" ? "active" : ""}
              onClick={() => setVoiceMode("tasks")}
            >
              ✅ {language === "hindi" ? "टास्क" : language === "english" ? "Tasks" : "Tasks"}
            </button>
            <button
              className={voiceMode === "notes" ? "active" : ""}
              onClick={() => setVoiceMode("notes")}
            >
              📝 {language === "hindi" ? "नोट्स" : language === "english" ? "Notes" : "Notes"}
            </button>
          </div>

          {/* Messages */}
          <div className="buddy-messages">
            {messages.length === 0 && (
              <div className="message assistant">
                <div className="message-content">
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
                  {msg.interim && <span className="voice-badge">listening...</span>}
                  {msg.isReminder && <span className="reminder-badge">⏰ Reminder</span>}
                  {msg.isCheckIn && <span className="checkin-badge">🤔 Check-in</span>}
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
                  {voiceMode === "notes" 
                    ? (language === "hindi" ? "📝 डेली नोट्स में लिख रहे हैं" : language === "english" ? "📝 Writing to Daily Notes" : "📝 Daily Notes mein likh rahe hain")
                    : (language === "hindi" ? "✅ टास्क मैनेज कर रहे हैं" : language === "english" ? "✅ Managing Tasks" : "✅ Tasks manage kar rahe hain")
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
                ⌨️ {language === "hindi" ? "टाइप" : language === "english" ? "Type" : "Type"}
              </button>
              <button
                className={inputMode === "voice" ? "active" : ""}
                onClick={() => setInputMode("voice")}
              >
                🎤 {language === "hindi" ? "बोलें" : language === "english" ? "Voice" : "Bolo"}
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
                  ➤
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
                      🔴 {language === "hindi" ? "बंद करें" : language === "english" ? "Stop" : "Band Karo"}
                    </>
                  ) : (
                    <>
                      🎤 {language === "hindi" ? "बोलना शुरू करें" : language === "english" ? "Start Speaking" : "Bolna Shuru Karo"}
                    </>
                  )}
                </button>
                
                {/* Manual text input while in voice mode */}
                <form className="text-input-form" onSubmit={handleTextSubmit} style={{ marginTop: '12px' }}>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={language === "hindi" ? "या यहां टाइप करें..." : language === "english" ? "Or type here..." : "Ya yahan type karo..."}
                    disabled={isProcessing}
                  />
                  <button type="submit" disabled={isProcessing || !inputText.trim()}>
                    ➤
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