I just downloaded a folder called "Customer Intake Portal" from a newsletter called The Owner Toolkit. It's a small-business web app I want to publish online so customers can send me inquiries. I'll be able to see and manage those inquiries in a private dashboard.

I am not a coder. I don't know what any of this is. Please walk me through publishing this to the internet, one step at a time. Treat me like I'm bright but completely new.

Rules I need you to follow:

- Ask before assuming. If I probably don't have an account for a service, ask me first, then help me create it.
- Explain every button. Tell me exactly what to click, what to type, what to look for on the screen.
- No jargon without a plain-English definition in one short sentence. Words like "repository," "environment variable," and "migration" need to be explained the first time you use them.
- Wait after each step. Don't skip ahead. Confirm the step worked before moving on.
- Don't ask me to open a terminal or type commands unless it's one specific command you fully explain, and only if there is truly no other way.
- If I hit an error, help me figure it out patiently. Ask for a screenshot if it would help.

Here's what you should know about the app I uploaded:

- It's a Next.js 15 web application (a modern React-based website).
- It needs three free services to run: **GitHub** (to store the code), **Vercel** (to run the website), and **Supabase** (for the database and file storage).
- All three have free tiers that will be plenty for a small business getting started.
- There's a SQL file at `supabase/migrations/20260715000000_init_schema.sql` that needs to run ONCE inside my Supabase project. It creates all the tables the app needs.
- After the site is deployed, I'll go to the `/setup` URL of my new site to customize my portal (business name, logo, brand color, welcome message, and which questions customers see).
- The customer-facing form is at the `/portal` URL. That's the link I send to customers.
- The private dashboard where I manage inquiries is at `/dashboard`.

Here's the plan I'd like you to walk me through, in order:

**Step 1 — Accounts.** Ask me which of these I already have and help me create the ones I don't:

- GitHub (github.com)
- Vercel (vercel.com)
- Supabase (supabase.com)

**Step 2 — Get the code into GitHub.** Help me put this folder into a new GitHub repository. Recommend the easiest method for a non-coder — probably GitHub's web upload or GitHub Desktop.

**Step 3 — Deploy on Vercel.** Help me connect my GitHub repository to Vercel and deploy the site. This should be mostly automatic.

**Step 4 — Add Supabase.** Help me create a new Supabase project. Then help me connect Vercel to Supabase using the official Vercel–Supabase integration, which sets up all the environment variables automatically.

**Step 5 — Set up the database.** Walk me through opening Supabase's SQL Editor and running the contents of the file at `supabase/migrations/20260715000000_init_schema.sql`. Paste and run — just once.

**Step 6 — Customize my portal.** Once Vercel says the deployment is live, open my site's URL and add `/setup` to the end. Guide me through the setup wizard.

**Step 7 — Test it.** Send myself a fake customer inquiry through my `/portal` URL. Confirm I can see it show up in my `/dashboard`.

Please start with Step 1 — ask me which of the three accounts I already have.
