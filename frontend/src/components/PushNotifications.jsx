import { useState, useEffect } from 'react';
import './PushNotifications.css';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotifications() {
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [userId] = useState(() => {
    let id = localStorage.getItem('user-id');
    if (!id) {
      id = 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('user-id', id);
    }
    return id;
  });

  useEffect(() => {
    // Check if we should show banner
    const alreadyAsked = localStorage.getItem('notification-asked');
    const permission = Notification.permission;
    
    // Show banner after 5 seconds if:
    // 1. Browser supports notifications
    // 2. Haven't asked before
    // 3. Permission not granted/denied yet
    if ('Notification' in window && !alreadyAsked && permission === 'default') {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 5000); // Show after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, []);

  const enableNotifications = async () => {
    setLoading(true);
    localStorage.setItem('notification-asked', 'true');

    try {
      // Request permission
      const result = await Notification.requestPermission();

      if (result !== 'granted') {
        setShowBanner(false);
        setLoading(false);
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Send to backend
      await fetch(`${BACKEND_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: userId
        })
      });

      // Show success notification
      new Notification('🎉 Notifications Enabled!', {
        body: 'You\'ll now receive reminders at 8 AM, 9:30 PM, and 11:30 PM',
        icon: '/icon-192x192.png'
      });

      setShowBanner(false);
    } catch (error) {
      console.error('Enable notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
    localStorage.setItem('notification-asked', 'true');
  };

  if (!showBanner) return null;

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <span style={styles.icon}>🔔</span>
        <div style={styles.text}>
          <strong style={styles.title}>Stay on track</strong>
          <p style={styles.subtitle}>Get daily reminders for your tasks</p>
        </div>
        <div style={styles.actions}>
          <button 
            onClick={enableNotifications} 
            disabled={loading}
            style={styles.allowBtn}
          >
            {loading ? '...' : 'Allow'}
          </button>
          <button 
            onClick={dismiss}
            style={styles.dismissBtn}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '16px 20px',
    zIndex: 9999,
    maxWidth: '400px',
    animation: 'slideIn 0.3s ease-out'
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  icon: {
    fontSize: '24px'
  },
  text: {
    flex: 1
  },
  title: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
    display: 'block',
    marginBottom: '2px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0
  },
  actions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  allowBtn: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  dismissBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px 8px'
  }
};