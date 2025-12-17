import { createClient } from '@supabase/supabase-js';

const OLD_URL = "https://vuiqxootdmaknpfhlqsg.supabase.co";
const OLD_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aXF4b290ZG1ha25wZmhscXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2OTk2MjcsImV4cCI6MjA4MDI3NTYyN30.YUpga4gCMh3xKoKCADqJ3dfI-uy49xq1cnODThx2H0g";

const oldClient = createClient(OLD_URL, OLD_KEY);

async function checkData() {
  const { data: students, error } = await oldClient.from('students').select('count');
  if (error) {
    console.error("Error reading old DB:", error.message);
  } else {
    console.log("Found students in old DB:", students.length);
  }
}

checkData();
