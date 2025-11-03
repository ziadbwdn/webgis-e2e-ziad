import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://webgisuser:webgispassword@localhost:5432/webgisdb',
  max: 20, // Max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  expiresIn: '7d',
};

export const serverConfig = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};
