import { getPool } from '../db/connection';
import { User, UserPublic } from '../types';

export class UserModel {
  static async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findById(id: number): Promise<User | null> {
    const pool = getPool();
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by id:', error);
      throw error;
    }
  }

  static async create(email: string, passwordHash: string, fullName: string): Promise<User> {
    const pool = getPool();
    try {
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *',
        [email, passwordHash, fullName]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static toPublic(user: User): UserPublic {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    };
  }
}
