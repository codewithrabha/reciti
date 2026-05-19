const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export interface UploadResult {
  /** Public HTTPS URL of the uploaded image. */
  url: string;
  /** Cloudinary delete token — lets the client delete the asset without the
   *  API secret. Valid for ~10 minutes after upload. `null` if the account
   *  has not enabled delete tokens. */
  deleteToken: string | null;
}

/**
 * Uploads an image from a local URI to Cloudinary via an unsigned upload preset.
 * `path` is a logical path, e.g. `reports/abc.jpg`; it becomes the Cloudinary
 * public_id (the file extension is dropped — Cloudinary tracks format itself).
 */
export const uploadImage = async (localUri: string, path: string): Promise<UploadResult> => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and ' +
        'EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env, then restart the dev server.',
    );
  }

  const publicId = path.replace(/\.[^/.]+$/, '');

  const formData = new FormData();
  // React Native FormData accepts a { uri, type, name } object for file uploads.
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: `${publicId.split('/').pop()}.jpg`,
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('public_id', publicId);
  // Ask Cloudinary for a short-lived token so we can delete this asset later
  // (e.g. when an unverified report is auto-removed) without the API secret.
  formData.append('return_delete_token', 'true');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  const data = await response.json();

  if (!response.ok || !data.secure_url) {
    console.error('[uploadImage] Cloudinary upload failed:', {
      status: response.status,
      response: data,
    });
    throw new Error(data?.error?.message ?? 'Image upload failed.');
  }

  return { url: data.secure_url as string, deleteToken: data.delete_token ?? null };
};

/**
 * Deletes a Cloudinary asset using a delete token returned at upload time.
 * Tokens expire ~10 minutes after upload; an expired token throws.
 */
export const deleteImageByToken = async (token: string): Promise<void> => {
  if (!CLOUD_NAME) return;

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/delete_by_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? `Cloudinary delete failed (status ${response.status}).`,
    );
  }
};
