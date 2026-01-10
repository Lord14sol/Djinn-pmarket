import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Master, las llaves de Supabase no están configuradas correctamente.");
    if (typeof window !== 'undefined') {
        alert("⚠️ FALTAN LAS CLAVES DE SUPABASE \n\nAsegúrate de tener el archivo .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.\n\nSi ya lo creaste, REINICIA el servidor (Ctrl+C y npm run dev).");
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);