const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Uploads an image from a local URI to Cloudinary via an unsigned upload preset.
 * `path` is a logical path, e.g. `reports/abc.jpg`; it becomes the Cloudinary
 * public_id (the file extension is dropped — Cloudinary tracks format itself).
 * Returns the public HTTPS URL of the uploaded image.
 */
export const uploadImage = async (localUri: string, path: string): Promise<string> => {
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

  return data.secure_url as string;
};
