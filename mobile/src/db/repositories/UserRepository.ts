import db from "../database";

interface UserPayload {
  firebase_uid: string;
  email: string;
  full_name: string;
  role: string;
  institution: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  institution: string;
  created_at: string;
}

export async function insertUser(payload: UserPayload): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO users (id, name, email, role, institution)
     VALUES (?, ?, ?, ?, ?)`,
    [
      payload.firebase_uid,
      payload.full_name,
      payload.email,
      payload.role,
      payload.institution,
    ]
  );

  // DEBUG LOG | DELETE AFTERWARDS ---------------------------------
  const inserted = await db.getFirstAsync(
    `SELECT * FROM users WHERE id = ?`,
    [payload.firebase_uid]
  );
  console.log("✅ USER ENTITY SAVED TO SQLITE:", JSON.stringify(inserted, null, 2));
}

export async function getUserById(firebase_uid: string): Promise<User | null> {
  const user = await db.getFirstAsync<User>(
    `SELECT * FROM users WHERE id = ? AND is_deleted = 0`,
    [firebase_uid]
  );
  return user ?? null;
}