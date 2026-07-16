I just downloaded a folder called "Customer Intake Portal" from a newsletter called The Owner Toolkit. It's a small web app I want to publish online so customers can send me inquiries. I'll manage those inquiries in a private dashboard.

I am not a coder. I don't know what any of this is. Please walk me through publishing this to the internet, one step at a time. Treat me like I'm bright but completely new.

Rules I need you to follow:

- Ask before assuming. If I probably don't have an account for a service, ask me first, then help me create it.
- Explain every button. Tell me exactly what to click, what to type, what to look for on the screen.
- No jargon without a plain-English definition in one short sentence.
- Wait after each step. Don't skip ahead. Confirm the step worked before moving on.
- Don't ask me to open a terminal or type commands.
- If I hit an error, help me figure it out patiently. Ask for a screenshot if it would help.

Here's what you should know about the app I uploaded:

- It's a Next.js 15 web application (a modern React-based website).
- It needs two free services to run: **Vercel** (to host the website) and **Supabase** (for the database, file storage, and my owner sign-in).
- **GitHub** is optional — nice for a versioned backup of the code, but Vercel can deploy the folder directly without it. Ask me if I want to use it.
- All three services have free tiers that are plenty for a small business getting started.
- The file at `portal.config.ts` contains my customizations (business name, brand color, welcome message, form questions). It's already filled in. Don't ask me for those values.
- Database setup happens automatically. The app runs its own database setup script during the first deploy. I never need to open Supabase's SQL editor.
- The customer-facing form lives at my site's bare URL. That's the link I'll share with customers.
- My private dashboard is at `/dashboard`. First person to sign in becomes the permanent owner.

Here's the plan — please walk me through these five steps in order, one at a time:

**Step 1 — Deploy the folder to Vercel.**
Help me sign into Vercel (or create a free account). Then help me get this folder online. If I have GitHub and want the backup, help me upload the folder to a new private repo there first and connect it to Vercel. If not, help me use Vercel's direct folder upload. Pick the easier path based on my answers.

**Step 2 — Connect Supabase.**
In my new Vercel project, walk me through the **Storage** tab → **Create Database** → **Supabase**. Help me sign into Supabase (or create a free account). Pick a project name (using my business name is fine) and a strong database password. Vercel automatically sets three environment variables in my project and triggers a redeploy. That redeploy also runs my database setup automatically — I don't need to do anything in Supabase's dashboard.

**Step 3 — Wait for the redeploy to finish.**
Watch the Vercel deployments list for the "Ready" status. When it goes green, my app is live with a working database. Usually about a minute.

**Step 4 — Claim my portal.**
Open my live site's URL and add `/login` to the end. I'll see a "Claim your portal" form asking for an email and password. Enter my email and pick a strong password (at least 10 characters — a password manager is a good idea). Click "Create owner account." I'm now the permanent owner and land in the dashboard. Anyone else who tries to sign up after me gets rejected.

**Step 5 — Test it.**
Open a **different browser** (or an incognito window) and go to my site's bare URL — I'll see the customer-facing form. Fill out a fake inquiry and submit. Go back to my original browser and refresh the dashboard. The fake inquiry should appear in the "New" column. Try dragging it to a different stage. Try adding a private note. Try downloading any file I attached.

That's it — I'm live. My site's URL is what I'll share with customers. My `/dashboard` URL is bookmarked for me.

Please start with Step 1.
