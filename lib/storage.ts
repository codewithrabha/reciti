import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads an image from a local URI to a Firebase Storage path.
 * `path` is the full storage path, e.g. `reports/abc.jpg`.
 * Returns the public download URL.
 */
export const uploadImage = async (localUri: string, path: string): Promise<string> => {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const storageRef = ref(storage, path);

  await new Promise<void>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, blob);
    uploadTask.on('state_changed', null, reject, resolve);
  });

  return await getDownloadURL(storageRef);
};
