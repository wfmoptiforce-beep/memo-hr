const { createClient } = supabase;

const _supabase = createClient(
  'https://vagnzratboqdnstaaaav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZ256cmF0Ym9xZG5zdGFhYWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDQxMjAsImV4cCI6MjA5MjEyMDEyMH0.1OkkYQzsXFHqF3TC2nAtfI8GUXO3kVUc0sXbD4CgRMk'
);

window.supabase = _supabase;
