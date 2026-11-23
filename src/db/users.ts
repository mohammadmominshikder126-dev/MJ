import { db } from './index.ts';
import { users } from './schema.ts';

export const ADMIN_EMAIL = 'sohelkhan65686@gmail.com';

export async function getOrCreateUser(uid: string, email: string) {
  try {
    const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        role,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to verify user account. Please try again later.', { cause: error });
  }
}
