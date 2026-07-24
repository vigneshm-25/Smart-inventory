import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { dbQuery } from '../config/database.js';
import { config } from '../config/env.js';
import { AuthRequest } from '../middleware/auth.js';

// ── Validation Schemas ──────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
  club: z.string().optional(),
}).passthrough();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  selectedRole: z.enum(['admin', 'member']).optional(),
}).passthrough();

// ── Helper ──────────────────────────────────────────────────────────

function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: '7d' as any }
  );
}

// ── Controllers ─────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Register a new member account with detailed logging & validation.
 */
export async function register(req: AuthRequest, res: Response): Promise<void> {
  console.log('📝 Incoming Registration Request:', {
    name: req.body?.name,
    email: req.body?.email,
    club: req.body?.club,
    hasPassword: !!req.body?.password,
  });

  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      const errMsg = validation.error.errors[0].message;
      console.warn('❌ Registration validation failed:', errMsg);
      res.status(400).json({ error: errMsg });
      return;
    }

    const { name, email, password, confirmPassword, club } = validation.data;

    if (confirmPassword && password !== confirmPassword) {
      console.warn('❌ Passwords do not match for registration:', email);
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    // Check if email already exists
    const existing = dbQuery.get('SELECT id FROM users WHERE email = ?', email.toLowerCase().trim());
    if (existing) {
      console.warn('❌ Registration rejected — Email already registered:', email);
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const id = uuidv4();
    console.log('🔒 Hashing password for new user...');
    const passwordHash = await bcrypt.hash(password, 12);

    console.log('🗄️ Executing SQL INSERT into users table...');
    dbQuery.run(
      'INSERT INTO users (id, name, email, password_hash, role, club) VALUES (?, ?, ?, ?, ?, ?)',
      id, name.trim(), email.toLowerCase().trim(), passwordHash, 'member', club?.trim() || null
    );

    console.log('🔑 Generating JWT token for registered user...');
    const token = generateToken({ id, email: email.toLowerCase().trim(), role: 'member' });

    console.log('✅ User registered successfully:', { id, name, email });
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id, name, email: email.toLowerCase().trim(), role: 'member', club: club?.trim() || null },
    });
  } catch (error: any) {
    console.error('❌ CRITICAL Registration Error Traceback:', error);
    res.status(500).json({ error: `Registration failed: ${error?.message || 'Database execution error'}` });
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
export async function login(req: AuthRequest, res: Response): Promise<void> {
  console.log('🔑 Incoming Login Request:', { email: req.body?.email, selectedRole: req.body?.selectedRole });

  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      const errMsg = validation.error.errors[0].message;
      console.warn('❌ Login validation failed:', errMsg);
      res.status(400).json({ error: errMsg });
      return;
    }

    const { email, password, selectedRole } = validation.data;
    const cleanEmail = email.toLowerCase().trim();

    const user = dbQuery.get(
      'SELECT id, name, email, password_hash, role, club, reliability_score, avatar_url FROM users WHERE email = ?',
      cleanEmail
    );

    if (!user) {
      console.warn('❌ Login failed — User not found:', cleanEmail);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.warn('❌ Login failed — Password mismatch for user:', cleanEmail);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Role verification
    if (selectedRole && user.role !== selectedRole) {
      const actualRoleLabel = user.role === 'admin' ? 'Admin' : 'Student/Member';
      console.warn(`❌ Role mismatch: account is ${user.role}, but selected ${selectedRole}`);
      res.status(403).json({
        error: `This account is registered as a ${actualRoleLabel}. Please select "${actualRoleLabel}" to log in.`,
      });
      return;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    console.log('✅ Login successful for:', user.email);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        club: user.club,
        reliabilityScore: user.reliability_score,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed due to server error' });
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user profile.
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = dbQuery.get(
      'SELECT id, name, email, role, club, reliability_score, avatar_url, created_at FROM users WHERE id = ?',
      req.user!.id
    );

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        club: user.club,
        reliabilityScore: user.reliability_score,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh JWT token for authenticated user.
 */
export async function refreshToken(req: AuthRequest, res: Response): Promise<void> {
  try {
    const token = generateToken({
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
    });

    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}
