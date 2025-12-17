import { createClient } from '@supabase/supabase-js';

// Configuration
const OLD_URL = "https://vuiqxootdmaknpfhlqsg.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXF4b290ZG1ha25wZmhscXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTk2MjcsImV4cCI6MjA4MDI3NTYyN30.YUpga4gCMh3xKoKCADqJ3dfI-uy49xq1cnODThx2H0g";

const NEW_URL = "https://mnocufllibzokzfjnejs.supabase.co";
const NEW_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ub2N1ZmxsaWJ6b2t6ZmpuZWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4MzYzNzgsImV4cCI6MjA4MDQxMjM3OH0.DSUpoFuGKpQp37XGjo_bw5GC8ex7Ocx8e-7AdS5_Nf0";

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

async function migrateTable(tableName) {
  console.log(`\n--- Migrating ${tableName} ---`);
  
  // 1. Fetch from Old DB
  const { data: rows, error: readError } = await oldClient
    .from(tableName)
    .select('*');

  if (readError) {
    console.error(`Error reading from old ${tableName}:`, readError.message);
    return;
  }

  if (!rows || rows.length === 0) {
    console.log(`No data found in old ${tableName}.`);
    return;
  }

  console.log(`Found ${rows.length} rows in old ${tableName}.`);

  // 2. Insert into New DB
  // We use upsert to handle potential conflicts, though mostly these are new inserts
  const { error: writeError } = await newClient
    .from(tableName)
    .upsert(rows);

  if (writeError) {
    console.error(`Error writing to new ${tableName}:`, writeError.message);
  } else {
    console.log(`Successfully migrated ${rows.length} rows to ${tableName}.`);
  }
}

async function migrateSingleton(tableName, updateFields) {
  console.log(`\n--- Migrating Singleton ${tableName} ---`);
  
  // 1. Fetch from Old DB (limit 1)
  const { data: oldRows, error: readError } = await oldClient
    .from(tableName)
    .select('*')
    .limit(1);

  if (readError || !oldRows || oldRows.length === 0) {
    console.log(`No data in old ${tableName} or error:`, readError?.message);
    return;
  }
  const oldData = oldRows[0];

  // 2. Fetch existing row from New DB
  const { data: newRows, error: newReadError } = await newClient
    .from(tableName)
    .select('*')
    .limit(1);

  if (newReadError || !newRows || newRows.length === 0) {
    console.log(`No existing row in new ${tableName}, inserting old row...`);
    await newClient.from(tableName).insert(oldData);
    return;
  }

  const targetId = newRows[0].id;
  console.log(`Updating existing row ${targetId} in ${tableName}...`);

  // 3. Prepare update object
  const updates = {};
  updateFields.forEach(field => {
    if (oldData[field] !== undefined) {
      updates[field] = oldData[field];
    }
  });

  // 4. Update
  const { error: updateError } = await newClient
    .from(tableName)
    .update(updates)
    .eq('id', targetId);

  if (updateError) {
    console.error(`Error updating ${tableName}:`, updateError.message);
  } else {
    console.log(`Successfully updated ${tableName}.`);
  }
}

async function run() {
  try {
    // 1. Students (Parent table) - Already done
    // await migrateTable('students');

    // 2. Teachers - Already done
    // await migrateTable('teachers');

    // 3. News - Already done
    // await migrateTable('news');

    // 4. Grades (Child of students) - Retrying
    await migrateTable('grades');

    // 5. Comments (Child of students) - Already done
    // await migrateTable('comments');

    // 6. School Settings (Singleton) - Already done
    // await migrateSingleton('school_settings', [
    //   'school_phone', 
    //   'school_admin_text', 
    //   'photo_url', 
    //   'show_grade_letters', 
    //   'show_admin_avg_grades'
    // ]);

    // 7. Admin Password (Singleton) - Already done
    // await migrateSingleton('admin_password', ['password']);

    console.log('\nMigration completed!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
