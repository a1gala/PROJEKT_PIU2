// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and public anon key
const SUPABASE_URL = 'https://qgjrvrjgmewqffywfxhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnanJ2cmpnbWV3cWZmeXdmeGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4MTExMDMsImV4cCI6MjA0NjM4NzEwM30.hrnOev0tRUM9cUNugQu5BARLBrm3VbQS1VsCy4ZkMzM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
