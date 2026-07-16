I just downloaded a folder called "Customer Intake Portal" from a newsletter called The Owner Toolkit. I customized it for my business using their online wizard. My business name, logo, brand color, welcome message, and questions are already baked into this folder — I don't need to configure any of that again.

Now I need to publish it online so my customers can send me inquiries. I'll be able to see and manage those inquiries in a private dashboard.

I am not a coder. I don't know what any of this is. Please walk me through publishing this to the internet, one step at a time. Treat me like I'm bright but completely new.

Rules I need you to follow:

- Ask before assuming. If I probably don't have an account for a service, ask me first, then help me create it.
- Explain every button. Tell me exactly what to click, what to type, what to look for on the screen.
- No jargon without a plain-English definition in one short sentence. Words like "repository," "environment variable," and "migration" need to be explained the first time you use them.
- Wait after each step. Don't skip ahead. Confirm the step worked before moving on.
- Don't ask me to open a terminal or type commands unless there is truly no other way, and only if you explain the single command completely first.
- If I hit an error, help me figure it out patiently. Ask for a screenshot if it would help.

Here's what you should know about the app I uploaded:

- It's a Next.js 15 web application (a modern React-based website).
- It needs two free services to run: **Vercel** (to run the website) and **Supabase** (for the database, file storage, and my owner sign-in).
- **GitHub** is optional but nice for keeping a versioned copy of the code — ask me if I want to use it. If not, Vercel supports uploading the folder directly.
- All three services have free tiers that are plenty for a small business getting started.
- The file at `portal.config.ts` contains my customizations (business name, brand color, welcome message, form questions). It's already filled in — don't ask me for those values.
- There's a SQL file at `supabase/migrations/20260715000000_init_schema.sql` that needs to run ONCE inside my Supabase project. It creates all the tables and storage the app needs.
- The customer-facing form is at my site's bare URL. That's the link I'll send to customers.
- My private dashboard where I manage inquiries is at `/dashboard`. It's protected — I'll sign in with a magic link the first time.

Here's the plan I'd like you to walk me through, in order:

**Step 1 — Accounts.** Ask me which of these I already have and help me create the ones I don't:

- Vercel (vercel.com) — required
- Supabase (supabase.com) — required
- GitHub (github.com) — optional but recommended

**Step 2 — Deploy to Vercel.** Help me get the code online. If I have GitHub, help me upload the folder there first and connect it to Vercel. If I don't want GitHub, help me drag the folder into Vercel directly. Pick the easier path for me.

**Step 3 — Connect Supabase.** Help me create a new Supabase project. Then help me connect Vercel to Supabase using the official Vercel–Supabase integration — this sets three environment variables automatically: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Confirm all three appear in Vercel's project settings after the integration runs.

**Step 4 — Set up the database.** Walk me through opening Supabase's SQL Editor and running the contents of `supabase/migrations/20260715000000_init_schema.sql`. Paste and run — just once. This creates the tables and the private storage bucket for uploaded files.

**Step 5 — Redeploy.** After the env vars are set, ask Vercel to redeploy so the app picks them up.

**Step 6 — Claim my portal.** Once the site is live:
  1. Visit my site's URL and add `/dashboard` to the end.
  2. It'll redirect me to a sign-in page.
  3. I'll enter my email and Supabase will email me a magic link.
  4. Clicking that link signs me in AND makes me the owner permanently. Any subsequent sign-in attempt from a different email will be rejected.
  5. **Important:** Tell me to check my spam folder if the email doesn't arrive within a minute. Supabase's default sender is safe but sometimes gets filtered. Later I can configure my own email sender in Supabase → Authentication → Emails for better deliverability.

**Step 7 — Test it.** Once I'm in the dashboard:
  1. In a **different browser** (or an incognito window), open my site's URL.
  2. Fill out a fake inquiry as a customer and submit it.
  3. Refresh my dashboard. The fake inquiry should appear in the "New" column.
  4. Click it. Try changing its stage. Try adding a private note. Try downloading any file I attached.

**Step 8 — Share.** My site's URL is the link I send to my customers. Bookmark `/dashboard` for myself.

Please start with Step 1 — ask me which of the accounts I already have.
