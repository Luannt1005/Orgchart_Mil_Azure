
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching tables...');
  
  // Fetch tables
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('*')
    .eq('table_schema', 'public');

  if (tablesError) {
      // Direct access to information_schema might be blocked. try rpc or just listing common tables if known.
      // But standard supabase projects usually allow reading this with service role.
      console.error('Error fetching tables:', tablesError);
      return;
  }

  console.log(`Found ${tables.length} tables.`);

  for (const table of tables) {
      console.log(`\nTable: ${table.table_name}`);
      
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', table.table_name)
        .eq('table_schema', 'public')
        .order('ordinal_position');
        
       if (colError) {
           console.error(`Error fetching columns for ${table.table_name}:`, colError);
           continue;
       }
       
       columns.forEach(col => {
           console.log(`  - ${col.column_name} (${col.data_type}) nullable: ${col.is_nullable}`);
       });
       
       // Get row count estimate
       const { count } = await supabase.from(table.table_name).select('*', { count: 'exact', head: true });
       console.log(`  Rows: ${count}`);
  }
}

main();
