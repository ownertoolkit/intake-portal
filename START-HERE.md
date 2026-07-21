# Start Here

You just downloaded your **Customer Intake Portal**, customized for your business. Everything you chose in the wizard (business name, brand color, font, background, favicon, and questions) is already baked into this folder.

This is the only file you need to read before starting.

---

## What you'll need

**Two free accounts** (see The Owner Toolkit's foundational post if you haven't created these yet):

- **Vercel** — hosts your portal on the internet
- **Supabase** — stores your customer inquiries and files

**And one AI coding tool** (this is what will guide you through installing your portal — it will do most of the work for you):

- **[Claude Code](https://claude.ai/download)** *(recommended)* — Anthropic's tool. Free to install; you'll need an Anthropic account.
- **[Codex](https://openai.com/codex)** — OpenAI's equivalent. Same idea. Free to install; you'll need an OpenAI account.

Either one works. Pick whichever you already have an account with, or Claude Code if you're starting fresh.

Both tools are much better at guiding you through this install than regular ChatGPT because they can read this folder directly and, with your permission, run commands for you.

---

## How to install your portal

### 1. Unzip this folder

Double-click the ZIP file on your Mac or Windows machine. You should end up with a folder named something like `your-business-portal/`.

### 2. Open Claude Code (or Codex) in this folder

- **Claude Code:** open the app, then either drag this folder onto it, or use "Open folder" from the menu and pick the unzipped folder.
- **Codex:** open the app, sign in, and point it at this folder using its "Open folder" option.

The tool should now see all the files in this folder. If it asks you what to do first, say "I want to install my portal — read START-HERE.md and follow the install prompt at the bottom."

### 3. Paste the install prompt

Scroll down to the **Install Prompt** section below. Copy everything between the two `━━━` lines and paste it into Claude Code (or Codex). Send.

The tool will take it from there and walk you through every step, one at a time. About 15 minutes total.

---

## If you get stuck

Reply to the email that delivered this download. Include:

- What step you were on
- What the tool said last
- What you tried

---

## When you're done

You'll have:

- A live customer intake portal at a URL you can share
- A private dashboard where you see and manage every inquiry that comes in
- Full ownership of everything — the code, the database, the files, the customer information

Nothing goes through The Owner Toolkit's servers. Your customer information is yours.

---

## Install Prompt

Copy everything between the two `━━━` lines below and paste it into Claude Code or Codex.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please act as my installer for this folder. I just downloaded it from a newsletter called The Owner Toolkit. It's a customized Customer Intake Portal for my business — everything I chose in the wizard (business name, colors, fonts, favicon, form questions) is already baked in.

I am not a coder. I want you to walk me through publishing this online, one step at a time. Treat me like I'm bright but completely new.

Rules I need you to follow:

- Ask before assuming. If I probably don't have an account for a service, ask me first, then help me create it.
- Explain every button. Tell me exactly what to click, what to type, what to look for on the screen.
- No jargon without a plain-English definition in one short sentence.
- Wait after each step. Don't skip ahead. Confirm the step worked before moving on.
- Never run a terminal command without showing me what it does first and asking permission.
- If I hit an error, help me figure it out patiently.

Here's what you should know about this folder:

- It's a Next.js 15 web application (a modern React-based website).
- It needs two free services to run: **Vercel** (to host the website) and **Supabase** (for the database, file storage, and my owner sign-in).
- **GitHub** is optional — nice for a versioned backup, but Vercel can deploy the folder directly.
- The file at `portal.config.ts` contains my customizations — it's already filled in, don't ask me for those values.
- Database setup happens automatically. The app runs its own database setup script during the first deploy. I never need to open Supabase's SQL editor.
- The customer-facing form lives at my site's bare URL. That's the link I share with customers.
- My private dashboard is at `/dashboard`. First person to sign in becomes the permanent owner.

Please walk me through these five steps in order, one at a time:

**Step 1 — Deploy the folder to Vercel.**
Help me sign into Vercel (or create a free account). Then help me get this folder online. If I want the versioned backup, help me upload the folder to a new private GitHub repo first and connect it to Vercel. If not, help me use Vercel's direct folder upload. Pick the easier path based on my answers.

**Step 2 — Connect Supabase.**
In my new Vercel project, walk me through the **Storage** tab → **Create Database** → **Supabase**. Help me sign into Supabase (or create a free account). Pick a project name (using my business name is fine) and a strong database password. Vercel automatically sets three environment variables in my project and triggers a redeploy. That redeploy also runs my database setup automatically — I don't need to do anything in Supabase's dashboard.

**Step 3 — Wait for the redeploy to finish.**
Watch the Vercel deployments list for the "Ready" status. When it goes green, my app is live with a working database. Usually about a minute.

**Step 4 — Claim my portal.**
Open my live site's URL and add `/login` to the end. I'll see a "Claim your portal" form asking for an email and password. Enter my email and pick a strong password (at least 10 characters — a password manager is a good idea). Click "Create owner account." I'm now the permanent owner and land in the dashboard. Anyone else who tries to sign up after me gets rejected.

**Step 5 — Test it.**
Open a **different browser** (or an incognito window) and go to my site's bare URL — I'll see the customer-facing form. Fill out a fake inquiry and submit. Go back to my original browser and refresh the dashboard. The fake inquiry should appear in the "New" column. Try dragging it to a different stage. Try adding a private note. Try downloading any file I attached.

That's it — I'm live. My site's URL is what I share with customers. My `/dashboard` URL is bookmarked for me.

Please start with Step 1 — ask me if I already have accounts for Vercel and (optionally) GitHub.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

That's it. Copy the block above, paste it into Claude Code or Codex, and follow along.

Enjoy.
