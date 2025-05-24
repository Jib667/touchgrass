// Import the Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  deleteUser
} from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
let analytics;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Analytics initialization failed:", error);
}

const auth = getAuth(app);

// Use standard Firestore initialization instead of optimized settings
// This resolves persistence issues that can cause loading problems
const db = getFirestore(app);

// Set persistence to LOCAL for better caching
try {
  setPersistence(auth, browserLocalPersistence)
    .then(() => {
      console.log("Auth persistence set to LOCAL");
    })
    .catch(error => {
      console.error("Error setting auth persistence:", error);
    });
} catch (error) {
  console.warn("Could not set auth persistence:", error);
}

// Configure Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    console.log("Starting Google sign-in process");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google sign-in successful", result.user.uid);
    
    // Only attempt to create user document if sign-in succeeds
    try {
      await createUserDocument(result.user);
    } catch (docError) {
      console.warn("Could not create user document, but auth succeeded:", docError);
    }
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Error signing in with Google", error);
    return { success: false, error };
  }
};

// Sign up with email and password
export const signUpWithEmail = async (email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    try {
      // Create a new user document in Firestore
      await createUserDocument(result.user);
    } catch (docError) {
      console.warn("Could not create user document, but auth succeeded:", docError);
    }
    
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Error signing up with email", error);
    return { success: false, error };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Error signing in with email", error);
    return { success: false, error };
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Error signing out", error);
    return { success: false, error };
  }
};

// Delete user account and all associated data
export const deleteUserAccount = async () => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return { success: false, error: { message: "No user is currently logged in" } };
    }
    
    const userId = currentUser.uid;
    
    // First delete the user's document from Firestore
    try {
      const userDocRef = doc(db, "users", userId);
      await deleteDoc(userDocRef);
      console.log(`User document for ${userId} deleted successfully`);
    } catch (firestoreError) {
      console.error("Error deleting user document:", firestoreError);
      // Continue with account deletion even if document deletion fails
    }
    
    // Then delete the user's authentication account
    await deleteUser(currentUser);
    console.log(`User account ${userId} deleted successfully`);
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting user account:", error);
    
    // Handle common error cases
    if (error.code === 'auth/requires-recent-login') {
      return { 
        success: false, 
        error: { 
          code: 'auth/requires-recent-login',
          message: "For security reasons, please sign in again before deleting your account." 
        } 
      };
    }
    
    return { success: false, error };
  }
};

// Create a new user document in Firestore
export const createUserDocument = async (user) => {
  if (!user) return null;
  
  const userRef = doc(db, "users", user.uid);
  
  try {
    // Check if the document already exists to avoid unnecessary writes
    const docSnap = await getDoc(userRef);
    
    if (!docSnap.exists()) {
      console.log(`Creating new user document for ${user.uid}`);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        hasCompletedOnboarding: false,
        preferences: {}
      });
    } else {
      // Update last login time
      await updateDoc(userRef, {
        lastLogin: serverTimestamp()
      });
    }
    
    return userRef;
  } catch (error) {
    console.error("Error creating/updating user document", error);
    return null;
  }
};

// Save user preferences from onboarding with optimized approach
export const saveUserPreferences = async (userId, preferences) => {
  if (!userId) return { success: false, error: "User ID is required" };
  
  console.log("Saving user preferences:", preferences);
  const userRef = doc(db, "users", userId);
  
  try {
    // Use setDoc with merge option instead of updateDoc
    await setDoc(userRef, {
      hasCompletedOnboarding: true,
      preferences: preferences,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log("Preferences saved successfully");
    return { success: true };
  } catch (error) {
    console.error("Error saving user preferences", error);
    return { success: false, error };
  }
};

// Check if user has completed onboarding - simplified version
export const hasUserCompletedOnboarding = async (userId) => {
  if (!userId) {
    console.error("hasUserCompletedOnboarding called with no userId");
    return false;
  }
  
  try {
    const userDocRef = doc(db, "users", userId);
    const docSnap = await getDoc(userDocRef);
    
    if (!docSnap.exists()) {
      return false; // New user, show onboarding
    }
    
    const userData = docSnap.data();
    return userData?.hasCompletedOnboarding || false;
  } catch (error) {
    console.error("Error checking onboarding status", error);
    // Default to not showing onboarding if there's an error
    // This prevents users from getting stuck in onboarding if Firestore has issues
    return true; 
  }
};

// Export Firebase instances and utility functions
export { auth, db }; 