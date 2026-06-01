-- ═══════════════════════════════════════
-- NOVELLE — Database Schema
-- ═══════════════════════════════════════
-- Target: Supabase (PostgreSQL)

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    firebase_uid VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stories
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    author VARCHAR(100) NOT NULL,
    user_id VARCHAR(128),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    cover_image TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    rating DECIMAL(2,1) DEFAULT 0,
    readers INTEGER DEFAULT 0,
    reading_time VARCHAR(20),
    tags TEXT[],
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Characters
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    role VARCHAR(20) CHECK (role IN ('protagonist', 'antagonist', 'secondary', 'narrator')),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenes
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    scene_order INTEGER DEFAULT 0,
    is_decision_point BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Endings
CREATE TABLE endings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    ending_type VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    text VARCHAR(300) NOT NULL,
    leads_to_scene UUID REFERENCES scenes(id) ON DELETE SET NULL,
    leads_to_ending UUID REFERENCES endings(id) ON DELETE SET NULL,
    hint VARCHAR(200),
    consequence TEXT,
    decision_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Progress
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    current_scene UUID REFERENCES scenes(id),
    decisions_path JSONB DEFAULT '[]',
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

-- User History
CREATE TABLE user_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    action VARCHAR(20) DEFAULT 'read',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_avatar TEXT,
    content VARCHAR(500) NOT NULL CHECK (char_length(trim(content)) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Generation Logs
CREATE TABLE ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(20) NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
    approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ────────────────────────
CREATE INDEX idx_stories_category ON stories(category_id);
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_featured ON stories(featured);
CREATE INDEX idx_scenes_story ON scenes(story_id, scene_order);
CREATE INDEX idx_decisions_scene ON decisions(scene_id);
CREATE INDEX idx_progress_user ON user_progress(user_id);
CREATE INDEX idx_history_user ON user_history(user_id, created_at DESC);
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_story_created ON comments(story_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
