import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../core/firebase";
import { registerUser, fetchMe } from "../core/api/auth";
import { insertUser, getUserById } from "../db/repositories/UserRepository";

// ─────────────────────────────────────────────────────────────
// SIGN UP
// ─────────────────────────────────────────────────────────────

export async function signUpUser(payload: {
  fullName: string;
  email: string;
  role: string;
  institution: string;
  password: string;
}) {
  // 1. Create Firebase Auth account
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    payload.email.trim(),
    payload.password
  );

  const firebaseUser = userCredential.user;
  const idToken = await firebaseUser.getIdToken();

  // 2. Seed SQLite with user profile
  await insertUser({
    firebase_uid: firebaseUser.uid,
    email: firebaseUser.email ?? payload.email.trim(),
    full_name: payload.fullName,
    role: payload.role,
    institution: payload.institution,
  });

  // 3. Send to backend
  // const backendUser = await registerUser(idToken, {
  //   firebase_uid: firebaseUser.uid,
  //   email: firebaseUser.email,
  //   full_name: payload.fullName,
  //   role: payload.role,
  //   institution: payload.institution,
  // });

  // console.log("BACKEND RESPONSE:", backendUser);
}

// ─────────────────────────────────────────────────────────────
// SIGN IN
// ─────────────────────────────────────────────────────────────

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

  // 2. Try loading user from local SQLite
  let localUser = await getUserById(firebaseUser.uid);
  console.log("LOCAL USER (SQLite):", localUser);

  // 3. SQLite cache miss (e.g. DB was reset/wiped after a schema change).
  //    Fetch the profile from the backend and re-seed SQLite so every
  //    FK-dependent table (sessions, audit_log, etc.) can reference the user.
  if (!localUser) {
    console.warn("SQLite miss — fetching user profile from backend...");

    const backendUser = await fetchMe(idToken);

    if (backendUser) {
      await insertUser({
        firebase_uid: backendUser.firebase_uid,
        email: backendUser.email,
        full_name: backendUser.full_name,
        role: backendUser.role,
        institution: backendUser.institution,
      });

      localUser = await getUserById(firebaseUser.uid);
      console.log("LOCAL USER (re-seeded from backend):", localUser);
    } else {
      // Backend doesn't have the user either — account may not be fully
      // registered. Surface a clear error instead of a silent null.
      throw new Error(
        "User profile not found. Please contact your administrator or re-register."
      );
    }
  }

  return { firebaseUser, idToken, localUser };
}