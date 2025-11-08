-- Create jobs table for tracking asynchronous geoprocessing tasks
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,  -- 'buffer', 'clip', 'intersect', 'union'
  status VARCHAR(50) NOT NULL DEFAULT 'queued',  -- 'queued', 'running', 'completed', 'failed', 'cancelled'
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_data JSONB,  -- Store analysis parameters
  result_layer_id INTEGER REFERENCES layers(id) ON DELETE SET NULL,
  error_message TEXT,
  progress INTEGER DEFAULT 0,  -- 0-100 percentage
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_cleanup ON jobs(status, completed_at)
  WHERE status IN ('completed', 'failed', 'cancelled');

-- Create a function to cleanup old completed jobs (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM jobs
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
