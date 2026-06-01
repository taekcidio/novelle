ALTER TABLE stories
ADD COLUMN IF NOT EXISTS user_id VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
