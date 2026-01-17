-- Enable real-time replication for all tables
-- This allows Supabase to broadcast database changes to connected clients via WebSocket

ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_comments;
