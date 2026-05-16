import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads an image from a local URI to Firebase Storage.
 * Returns the public download URL.
 */
export const uploadImage = async (localUri: string, reportId: string): Promise<string> => {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, `reports/${reportId}.jpg`);

  await new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob);
    uploadTask.on('state_changed', null, reject, resolve);
  });

  return await getDownloadURL(storageRef);
};
