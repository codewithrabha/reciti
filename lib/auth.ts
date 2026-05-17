import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  linkWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from './firebase';
import { createOrUpdateUserDoc } from './db';

// Configure Google Sign In once
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

/** Sign up a new user with email & password */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
) => {
  const currentUser = auth.currentUser;
  
  if (currentUser?.isAnonymous) {
    // Upgrade anonymous account → real email account
    const credential = EmailAuthProvider.credential(email, password);
    const linked = await linkWithCredential(currentUser, credential);
    await updateProfile(linked.user, { displayName });
    await createOrUpdateUserDoc(linked.user.uid, { displayName, email });
    return linked.user;
  }

  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await createOrUpdateUserDoc(user.uid, { displayName, email });
  return user;
};

/** Sign in with email & password */
export const signInWithEmail = async (email: string, password: string) => {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
};

/** Sign in with Google */
export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  
  // Get the ID token
  const idToken = signInResult.data?.idToken;
  if (!idToken) throw new Error('No ID token returned from Google Sign In');

  const googleCredential = GoogleAuthProvider.credential(idToken);

  const currentUser = auth.currentUser;
  if (currentUser?.isAnonymous) {
    try {
      // Try to upgrade anonymous account → Google account
      const linked = await linkWithCredential(currentUser, googleCredential);
      await createOrUpdateUserDoc(linked.user.uid, {
        displayName: linked.user.displayName,
        email: linked.user.email,
        photoURL: linked.user.photoURL,
      });
      return linked.user;
    } catch (err: any) {
      // The Google account already has its own Firebase user — the anonymous
      // account can't be upgraded into it, so sign into the existing one.
      // (The anonymous user is abandoned; it will be auto-cleaned by Firebase.)
      if (err?.code !== 'auth/credential-already-in-use') throw err;
    }
  }

  const { user } = await signInWithCredential(auth, googleCredential);
  await createOrUpdateUserDoc(user.uid, {
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  });
  return user;
};

/** Sign out */
export const signOut = async () => {
  // Sign out of Google too if signed in
  const isGoogleSignedIn = await GoogleSignin.getCurrentUser();
  if (isGoogleSignedIn) {
    await GoogleSignin.signOut();
  }
  await firebaseSignOut(auth);
};
