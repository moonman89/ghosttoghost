export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  const body = `importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js');
firebase.initializeApp(${JSON.stringify(config)});
const messaging = firebase.messaging();
messaging.onBackgroundMessage(function(payload) {
  const title = (payload.notification && payload.notification.title) || 'GhostToGhost';
  const options = {
    body: (payload.notification && payload.notification.body) || 'New message',
    data: payload.data || {},
  };
  return self.registration.showNotification(title, options);
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var chatId = event.notification.data && event.notification.data.chatId;
  var url = chatId ? '/chat?open=' + chatId : '/chat';
  event.waitUntil(clients.openWindow(url));
});
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  });
}
