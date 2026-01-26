// const express = require('express');
// const webpush = require('web-push');
// const cors = require('cors');
// const cron = require('node-cron');
// const { createClient } = require('@supabase/supabase-js');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 3001;

// // Supabase client
// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_KEY
// );

// app.use(cors());
// app.use(express.json());

// // Configure VAPID
// webpush.setVapidDetails(
//   'mailto:your-email@example.com',
//   process.env.VAPID_PUBLIC_KEY,
//   process.env.VAPID_PRIVATE_KEY
// );

// // Subscribe endpoint
// app.post('/api/subscribe', async (req, res) => {
//   try {
//     const { subscription, userId } = req.body;
    
//     // Store in Supabase
//     const { data, error } = await supabase
//       .from('push_subscriptions')
//       .upsert({
//         user_id: userId,
//         subscription: subscription,
//         updated_at: new Date().toISOString()
//       }, {
//         onConflict: 'user_id'
//       });

//     if (error) throw error;

//     console.log(`✅ New subscription from ${userId}`);
    
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Subscribe error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Unsubscribe endpoint
// app.post('/api/unsubscribe', async (req, res) => {
//   try {
//     const { userId } = req.body;
    
//     const { error } = await supabase
//       .from('push_subscriptions')
//       .delete()
//       .eq('user_id', userId);

//     if (error) throw error;

//     console.log(`🗑️ Unsubscribed ${userId}`);
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Unsubscribe error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Send test notification
// app.post('/api/send-test', async (req, res) => {
//   try {
//     const { userId } = req.body;
    
//     const payload = JSON.stringify({
//       title: '🧪 Test Notification',
//       body: 'Your notifications are working perfectly!',
//       tag: 'test',
//       url: '/'
//     });

//     // Get subscription from Supabase
//     const { data: subs, error } = await supabase
//       .from('push_subscriptions')
//       .select('subscription')
//       .eq('user_id', userId);

//     if (error) throw error;

//     if (!subs || subs.length === 0) {
//       return res.status(404).json({ error: 'No subscription found' });
//     }

//     await webpush.sendNotification(subs[0].subscription, payload);
//     console.log('✅ Test notification sent');
    
//     res.json({ success: true });
//   } catch (error) {
//     console.error('Send test error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

// // Send notification to all users
// async function sendToAllUsers(notification) {
//   try {
//     const { data: subs, error } = await supabase
//       .from('push_subscriptions')
//       .select('*');

//     if (error) throw error;

//     const payload = JSON.stringify(notification);
    
//     console.log(`📢 Sending ${notification.tag} to ${subs.length} users...`);
    
//     for (let sub of subs) {
//       try {
//         await webpush.sendNotification(sub.subscription, payload);
//         console.log(`✅ Sent to ${sub.user_id}`);
//       } catch (error) {
//         console.error(`❌ Failed for ${sub.user_id}:`, error.message);
        
//         // Remove invalid subscriptions
//         if (error.statusCode === 410 || error.statusCode === 404) {
//           await supabase
//             .from('push_subscriptions')
//             .delete()
//             .eq('user_id', sub.user_id);
//           console.log(`🗑️ Removed invalid subscription: ${sub.user_id}`);
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Send to all error:', error);
//   }
// }

// // Morning notification - 8:00 AM
// cron.schedule('0 8 * * *', () => {
//   sendToAllUsers({
//     title: '☀️ Good Morning!',
//     body: 'Ready to plan your day? Check your tasks.',
//     tag: 'morning',
//     url: '/'
//   });
// });

// // Evening notification - 9:30 PM
// cron.schedule('30 21 * * *', () => {
//   sendToAllUsers({
//     title: '🌙 Evening Check-in',
//     body: 'How did your day go? Review and reflect.',
//     tag: 'evening',
//     url: '/'
//   });
// });

// // Pending task reminder - 11:30 PM
// cron.schedule('30 23 * * *', () => {
//   sendToAllUsers({
//     title: '⏰ Day Ending Soon',
//     body: 'Don\'t forget to complete your pending tasks!',
//     tag: 'reminder',
//     url: '/'
//   });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
const express = require('express');
const webpush = require('web-push');
const cors = require('cors');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(cors());
app.use(express.json());

// Configure VAPID
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;

    console.log(`✅ New subscription from ${userId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe endpoint
app.post('/api/unsubscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`🗑️ Unsubscribed ${userId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send test notification
app.post('/api/send-test', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const payload = JSON.stringify({
      title: '🧪 Test Notification',
      body: 'Your notifications are working perfectly!',
      tag: 'test',
      url: '/'
    });

    // Get subscription from Supabase
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    await webpush.sendNotification(subs[0].subscription, payload);
    console.log('✅ Test notification sent');
    
    res.json({ success: true });
  } catch (error) {
    console.error('Send test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send notification to all users
async function sendToAllUsers(notification) {
  try {
    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) throw error;

    const payload = JSON.stringify(notification);
    
    console.log(`📢 Sending ${notification.tag} to ${subs.length} users...`);
    
    for (let sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        console.log(`✅ Sent to ${sub.user_id}`);
      } catch (error) {
        console.error(`❌ Failed for ${sub.user_id}:`, error.message);
        
        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', sub.user_id);
          console.log(`🗑️ Removed invalid subscription: ${sub.user_id}`);
        }
      }
    }
  } catch (error) {
    console.error('Send to all error:', error);
  }
}

// ⏰ TESTING SCHEDULE - EVERY MINUTE (for quick testing)
// This will send a notification every minute so you can test immediately
// cron.schedule('* * * * *', () => {
//   const now = new Date();
//   console.log(`⏰ Test notification at ${now.toLocaleTimeString()}`);
  
//   sendToAllUsers({
//     title: '⏰ Test Reminder',
//     body: `Notification triggered at ${now.toLocaleTimeString()}`,
//     tag: 'test-scheduled',
//     url: '/'
//   });
// });

// 🔥 OR TEST AT SPECIFIC TIME - 12:00 PM
// Uncomment this if you want to test at exactly 12 PM
/*
cron.schedule('0 12 * * *', () => {
  sendToAllUsers({
    title: '🕛 12 PM Test',
    body: 'Testing notification at 12:00 PM!',
    tag: 'noon-test',
    url: '/'
  });
});
*/

// 🔥 OR TEST IN NEXT 2 MINUTES - runs at specific minute
// For example: if current time is 12:34, this runs at 12:36

// const testMinute = (new Date().getMinutes() + 2) % 60;
// cron.schedule(`${testMinute} * * * *`, () => {
//   sendToAllUsers({
//     title: '⏰ 2-Minute Test',
//     body: 'This notification was scheduled 2 minutes ago!',
//     tag: '2min-test',
//     url: '/'
//   });
// });


// ⬇️ ORIGINAL PRODUCTION SCHEDULE (commented out for testing)

// Morning notification - 8:00 AM
cron.schedule('0 8 * * *', () => {
  sendToAllUsers({
    title: '☀️ Good Morning!',
    body: 'Ready to plan your day? Check your tasks.',
    tag: 'morning',
    url: '/'
  });
});

// Evening notification - 9:30 PM
cron.schedule('30 21 * * *', () => {
  sendToAllUsers({
    title: '🌙 Evening Check-in',
    body: 'How did your day go? Review and reflect.',
    tag: 'evening',
    url: '/'
  });
});

// Pending task reminder - 11:30 PM
cron.schedule('30 23 * * *', () => {
  sendToAllUsers({
    title: '⏰ Day Ending Soon',
    body: 'Don\'t forget to complete your pending tasks!',
    tag: 'reminder',
    url: '/'
  });
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Test notifications will run EVERY MINUTE`);
  console.log(`📋 Current time: ${new Date().toLocaleTimeString()}`);
});