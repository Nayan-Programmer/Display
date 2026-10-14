# Deploying the Gurukul notice board on Vercel

## 1. Database (once)
In the Supabase SQL editor run, in this order, everything in `supabase/migrations/`:
1. `20261013120000_display_admin.sql`   (replace `ADMIN_EMAIL_HERE` with the administrator email)
2. `20261013140000_text_notices_special_timetable.sql`
3. `20261014100000_hostel_announcements.sql`

## 2. Put the code on GitHub
Create a new GitHub repository and upload this folder (the `.env` file is ignored on purpose, so keys are never uploaded).

## 3. Import into Vercel
Vercel > Add New > Project > pick the repository > leave the defaults (the build is detected automatically) > before pressing Deploy, open **Environment Variables** and add these six, for Production, Preview and Development:

| Name | Value (Supabase > Project Settings > API) |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon / publishable key |
| `SUPABASE_URL` | same Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | same anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (SECRET: never share or commit it) |
| `ADMIN_SIGNUP_CODE` | a private code of your own (replaces the default one) |

The two `VITE_` values are baked in while building, so if you change them later you must **Redeploy**.

## 4. Supabase address settings
Supabase > Authentication > URL Configuration: set **Site URL** to your Vercel address (e.g. `https://your-site.vercel.app`) and add it to **Redirect URLs**.

## 5. Use it
- Display screen: `https://your-site.vercel.app/display` (or the desktop Display app)
- Administrator: `https://your-site.vercel.app/admin` (or the desktop Admin app)
- First time: on `/admin` choose "First time? Create the administrator account" with the email you put in `admin_emails` and your `ADMIN_SIGNUP_CODE`.

## Deploying from your computer instead (optional)
```
npm install
npx vercel          # first time: log in and answer the questions
npx vercel --prod
```
