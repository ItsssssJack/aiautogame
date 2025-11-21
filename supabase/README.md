# Supabase Setup Instructions

## Step 1: Create the Database Tables

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xsivngacfkupbjwtbuvo
2. Click on the **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `schema.sql` into the query editor
5. Click **Run** to execute the SQL

This will create:
- `racing_leaderboard` table for racing game scores
- `elimination_leaderboard` table for elimination game scores
- Indexes for fast sorting by score
- Row Level Security policies to allow public read/write access

## Step 2: Verify Tables Were Created

1. Click on **Table Editor** in the left sidebar
2. You should see two new tables:
   - `racing_leaderboard`
   - `elimination_leaderboard`

## Step 3: Test the Connection

After running the SQL, refresh your game and try submitting a score. The global leaderboard should now load properly!

## Troubleshooting

If the leaderboard still doesn't load:
1. Check the browser console for errors (F12 → Console tab)
2. Verify the Supabase URL and anon key in `lib/supabase.ts` are correct
3. Make sure the RLS policies were created (check in Authentication → Policies)
