// API endpoint to set up ALL required CMS database tables
// Vercel serverless function

import { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - pg types not available in Vercel environment
import { Client } from 'pg';

// Aurora Serverless v2 configuration
const dbConfig = {
  host: process.env.AWS_AURORA_HOST || process.env.AWS_RDS_HOST || 'mindmeasure-aurora.cluster-cz8c8wq4k3ak.eu-west-2.rds.amazonaws.com',
  port: parseInt(process.env.AWS_AURORA_PORT || process.env.AWS_RDS_PORT || '5432'),
  database: process.env.AWS_AURORA_DATABASE || process.env.AWS_RDS_DATABASE || 'mindmeasure',
  user: process.env.AWS_AURORA_USERNAME || process.env.AWS_RDS_USERNAME || 'mindmeasure_admin',
  password: process.env.AWS_AURORA_PASSWORD || process.env.AWS_RDS_PASSWORD || 'MindMeasure2024!',
  ssl: { rejectUnauthorized: false }
};

const createAllTablesSQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Content categories table
CREATE TABLE IF NOT EXISTS content_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#0BA66D',
  icon VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Content articles table
CREATE TABLE IF NOT EXISTS content_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id VARCHAR(50),
  category_id UUID REFERENCES content_categories(id),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  is_featured BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),
  university_id VARCHAR(50),
  streak_count INTEGER DEFAULT 0,
  baseline_established BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment sessions table
CREATE TABLE IF NOT EXISTS assessment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  session_data JSONB,
  score INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  conversation_summary TEXT,
  assessment_type VARCHAR(50),
  baseline_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Memberships table (user roles)
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  role VARCHAR(50) DEFAULT 'user',
  university_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Faculties table
CREATE TABLE IF NOT EXISTS faculties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  dean_name VARCHAR(200),
  dean_email VARCHAR(255),
  dean_phone VARCHAR(50),
  description TEXT,
  website VARCHAR(255),
  building_location VARCHAR(255),
  student_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id VARCHAR(50),
  faculty_id UUID REFERENCES faculties(id),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  head_of_school_name VARCHAR(200),
  head_of_school_email VARCHAR(255),
  head_of_school_phone VARCHAR(50),
  description TEXT,
  website VARCHAR(255),
  building_location VARCHAR(255),
  student_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  university_id VARCHAR(50),
  school_id UUID REFERENCES schools(id),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  head_of_department_name VARCHAR(200),
  head_of_department_email VARCHAR(255),
  head_of_department_phone VARCHAR(50),
  description TEXT,
  website VARCHAR(255),
  building_location VARCHAR(255),
  student_count INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost tracking table
CREATE TABLE IF NOT EXISTS cost_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type VARCHAR(100),
  cost_amount DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'GBP',
  university_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost budgets table
CREATE TABLE IF NOT EXISTS cost_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type VARCHAR(100),
  budget_amount DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'GBP',
  university_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost alerts table
CREATE TABLE IF NOT EXISTS cost_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(100),
  message TEXT,
  acknowledged BOOLEAN DEFAULT false,
  university_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Processing logs table
CREATE TABLE IF NOT EXISTS processing_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID,
  step VARCHAR(100),
  status VARCHAR(50),
  message TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample content categories
INSERT INTO content_categories (name, description, color, icon) VALUES
  ('Mental Health', 'Mental health resources and support', '#10B981', 'heart'),
  ('Academic Support', 'Study skills and academic resources', '#3B82F6', 'book'),
  ('Campus Life', 'Campus facilities and activities', '#8B5CF6', 'home'),
  ('Emergency', 'Emergency contacts and crisis support', '#EF4444', 'phone')
ON CONFLICT (id) DO NOTHING;

-- Insert sample admin user
INSERT INTO memberships (user_id, role, university_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'worcester'),
  ('00000000-0000-0000-0000-000000000001', 'superadmin', 'lse')
ON CONFLICT (id) DO NOTHING;
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client(dbConfig);

  try {
    await client.connect();
    
    // Execute the comprehensive table creation
    await client.query(createAllTablesSQL);

    await client.end();

    return res.status(200).json({ 
      success: true, 
      message: 'All CMS database tables created successfully',
      tables: [
        'universities', 'content_categories', 'content_articles', 'profiles', 
        'assessment_sessions', 'memberships', 'faculties', 'schools', 
        'departments', 'cost_tracking', 'cost_budgets', 'cost_alerts', 
        'processing_logs'
      ]
    });

  } catch (error: any) {
    console.error('Database CMS setup error:', error);
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error 
    });
  }
}
