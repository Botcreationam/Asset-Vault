import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function ensureBucket(name, isPublic) {
  const { data: existing } = await supabase.storage.getBucket(name);
  if (existing) {
    console.log(`✓ Bucket "${name}" already exists`);
    return;
  }
  const { error } = await supabase.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit: isPublic ? 5 * 1024 * 1024 : 50 * 1024 * 1024,
  });
  if (error) {
    console.error(`✗ Failed to create bucket "${name}":`, error.message);
  } else {
    console.log(`✓ Created bucket "${name}" (public=${isPublic})`);
  }
}

await ensureBucket("resources", false);  // private — accessed via signed URLs
await ensureBucket("avatars", true);     // public — profile pictures
