const nodemailer = require("nodemailer");
const webpush = require("web-push");
const User = require("../models/User");

// Setup Web Push
webpush.setVapidDetails(
  `mailto:${process.env.EMAIL_USER}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Setup Nodemailer (Using existing config from server/index.js)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOfflineNotification = async (receiverId, senderName, messageText) => {
  try {
    const receiver = await User.findOne({ userId: receiverId });
    if (!receiver) return;

    const now = new Date();
    // Cooldown: Only send notification if they haven't been notified in the last 15 mins
    if (receiver.lastNotified) {
      const diffMs = now - receiver.lastNotified;
      const diffMins = diffMs / 1000 / 60;
      if (diffMins < 15) {
        console.log(`Skipping offline notification for ${receiverId} (cooldown)`);
        return;
      }
    }

    // Prepare payload
    const payload = JSON.stringify({
      title: `New message from ${senderName}`,
      body: messageText,
      icon: "/icon.png" // Fallback icon path for frontend
    });

    let sentPush = false;
    let sentEmail = false;

    // Send Push Notification
    if (receiver.pushSubscriptions && receiver.pushSubscriptions.length > 0) {
      const validSubs = [];
      for (const sub of receiver.pushSubscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          validSubs.push(sub);
          sentPush = true;
        } catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            console.log("Subscription has expired or is no longer valid: ", error);
          } else {
            console.error("Error sending push notification: ", error);
            validSubs.push(sub); // Keep if error is temporary
          }
        }
      }
      
      // Clean up invalid subscriptions
      if (validSubs.length !== receiver.pushSubscriptions.length) {
        receiver.pushSubscriptions = validSubs;
      }
    }

    // Send Email Notification
    if (receiver.email) {
      try {
        await transporter.sendMail({
          from: `"Random Chat" <${process.env.EMAIL_USER}>`,
          to: receiver.email,
          subject: `You have a new message from ${senderName}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>New Message on Random Chat</h2>
              <p><b>${senderName}</b> sent you a message:</p>
              <blockquote style="background: #f4f4f5; padding: 10px; border-left: 4px solid #3b82f6;">
                ${messageText}
              </blockquote>
              <p>Log in to reply!</p>
            </div>
          `
        });
        sentEmail = true;
      } catch (err) {
        console.error("Failed to send offline email: ", err);
      }
    }

    // Update lastNotified timestamp if at least one was sent
    if (sentPush || sentEmail) {
      receiver.lastNotified = now;
      await receiver.save();
      console.log(`Sent offline notification to ${receiverId} (Push: ${sentPush}, Email: ${sentEmail})`);
    }

  } catch (err) {
    console.error("Error in sendOfflineNotification:", err);
  }
};

module.exports = { sendOfflineNotification };
