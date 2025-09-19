const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gpuvqonjpdjxehihpuke.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwdXZxb25qcGRqeGVoaWhwdWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODI1NzY1OSwiZXhwIjoyMDczODMzNjU5fQ.XLlVm_hemMeqwAXskuvOVQbGeyUOWy2DrVXQGAhTRos';

async function createBuckets() {
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('Creating storage buckets...\n');

  // Create screenshots bucket (public)
  try {
    const { data, error } = await supabase.storage.createBucket('screenshots', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (error && error.message.includes('already exists')) {
      console.log('✅ screenshots bucket already exists');
    } else if (error) {
      console.log('❌ Error creating screenshots bucket:', error.message);
    } else {
      console.log('✅ Created screenshots bucket (public)');
    }
  } catch (e) {
    console.log('❌ Failed to create screenshots bucket:', e.message);
  }

  // Create sessions bucket (private)
  try {
    const { data, error } = await supabase.storage.createBucket('sessions', {
      public: false
    });

    if (error && error.message.includes('already exists')) {
      console.log('✅ sessions bucket already exists');
    } else if (error) {
      console.log('❌ Error creating sessions bucket:', error.message);
    } else {
      console.log('✅ Created sessions bucket (private)');
    }
  } catch (e) {
    console.log('❌ Failed to create sessions bucket:', e.message);
  }

  console.log('\nBucket creation complete!');
}

createBuckets().catch(console.error);