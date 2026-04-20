// ═══════════════════════════════════
// ⚙️ SUPABASE CONFIGURATION
// ═══════════════════════════════════

console.log('🔌 Loading Supabase configuration...');

// Check if Supabase library is loaded
if (typeof supabase === 'undefined') {
  console.error('❌ Supabase library not loaded');
  console.error('Add this to index.html: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
} else {
  try {
    const { createClient } = supabase;

    // Create Supabase client
    const _supabase = createClient(
      'https://vagnzratboqdnstaaaav.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZ256cmF0Ym9xZG5zdGFhYWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NDQxMjAsImV4cCI6MjA5MjEyMDEyMH0.1OkkYQzsXFHqF3TC2nAtfI8GUXO3kVUc0sXbD4CgRMk',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    // Expose to window as 'sb' (not 'supabase')
    window.sb = _supabase;
    console.log('✅ Supabase client initialized successfully');

    // Verify connection
    (async () => {
      try {
        const { data, error } = await window.sb.auth.getSession();
        if (!error) {
          console.log('✅ Supabase connection verified');
        }
      } catch (e) {
        console.log('⚠️ Connection test skipped (expected on first load)');
      }
    })();

  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error);
  }
}