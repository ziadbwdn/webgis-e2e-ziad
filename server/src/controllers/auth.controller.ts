import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UserModel } from '../models/user.model';
import { generateToken } from '../utils/jwt.util';
import { AppError } from '../middleware/error.middleware';
import { AuthResponse, UserPublic } from '../types';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const { email, password, full_name } = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await UserModel.create(email, passwordHash, full_name);
    const userPublic = UserModel.toPublic(user);

    res.status(201).json({
      user: userPublic,
    });
  }

  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Find user
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Generate token
    const token = generateToken(user.id, user.email);
    const userPublic = UserModel.toPublic(user);

    const response: AuthResponse = {
      token,
      user: userPublic,
    };

    res.status(200).json(response);
  }
}
