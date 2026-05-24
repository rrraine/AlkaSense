import { createUserWithEmailAndPassword } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../core/firebase";
import { registerUser } from "../core/api/auth";
import { insertUser } from "../db/repositories/UserRepository";
import { getUserById } from "../db/repositories/UserRepository";

// SIGN UP
export async function signUpUser(payload: {
  fullName: string;
  email: string;
  role: string;
  institution: string;
  password: string;
}) {
  // 1. Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    payload.email.trim(),
    payload.password
  );

  const firebaseUser = userCredential.user;
  const idToken = await firebaseUser.getIdToken();

  // 2. Save to SQLite
  await insertUser({
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email ?? payload.email.trim(),
    full_name: payload.fullName,
    role: payload.role,
    institution: payload.institution,
  });

  // 3. Send to backend
  const backendUser = await registerUser(idToken, {
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email,
    full_name: payload.fullName,
    role: payload.role,
    institution: payload.institution,
  });

  console.log("BACKEND RESPONSE:", backendUser);
}

// SIGN IN
export async function signInUser(payload: {
  email: string;
  password: string;
}) {
  // 1. Firebase Auth
  const userCredential = await signInWithEmailAndPassword(
    auth,
    payload.email.trim(),
    payload.password
  );

  const firebaseUser = userCredential.user;
  const idToken = await firebaseUser.getIdToken();

  // 2. Load from SQLite
  const localUser = await getUserById(firebaseUser.uid);
  console.log("LOCAL USER:", localUser);

  return { firebaseUser, idToken, localUser };
}