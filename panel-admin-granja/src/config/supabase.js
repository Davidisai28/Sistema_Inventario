import { createClient } from '@supabase/supabase-js';

// Importamos las variables de entorno que acabamos de crear
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Exportamos el cliente para usarlo en cualquier parte de la app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);