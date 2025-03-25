import admin from "firebase-admin";
import config from "../config";

const serviceAccountJson = Buffer.from(config.firebase_service_account_base64!, "base64").toString("utf8");
const serviceAccount = JSON.parse(serviceAccountJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

export const sendPushNotification = async (
  deviceToken: string,
  title: string,
  body: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  icon?: string // Optional: Add an icon parameter
) => {

  const message = {
    token: deviceToken,
    notification: {
      title: title,
      body: body,
      // sound: 'default',
    },
    data: data,
    android: {
      notification: {
        icon: icon || '',
      },
    },
    apns: {
      payload: {
        aps: {
          'mutable-content': 1, // Enable mutable content for iOS (if needed)
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
      console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

