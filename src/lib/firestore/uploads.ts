import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { storage } from "../firebase";

export interface ChatImageUpload {
  url: string;
  path: string;
}

export function uploadChatImage(
  chatId: string,
  userId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ChatImageUpload> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `chatUploads/${chatId}/${userId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);

  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      (error) => reject(error),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path });
      }
    );
  });
}
