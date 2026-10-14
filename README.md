# Gurukul Digital Notice Board

Digital notice board for Shree Swaminarayan Gurukul International School, Gurugram. The public display
is at `/` (and `/display`); staff manage it at `/admin`.

## Development

Requires Node.js and npm.

```sh
npm i
cp .env.example .env   # then fill in your own Supabase values
npm run dev
```

## Admin page (`/admin`)

Staff sign in at `/admin` to upload **date sheet** and **timetable** images (they appear in the
Examinations and Timetable panels of the display) and to **Start / Stop slideshow**. While the
slideshow is running, the display plays every uploaded image full screen, changing every N seconds.
The display checks for changes every 30 seconds, so a ThinkCentre screen updates by itself.

One-time setup:

1. In your Supabase project, open the SQL editor, paste `supabase/migrations/20261013120000_display_admin.sql`
   (after replacing `ADMIN_EMAIL_HERE` with the administrator's email) and run it.
2. Set `SUPABASE_SERVICE_ROLE_KEY` (and optionally `ADMIN_SIGNUP_CODE`) in the server environment.
3. Open `/admin`, choose **First time? Create the administrator account**, enter the email, a password and
   the registration code, then you are signed in.

Only the emails listed in `admin_emails` can change anything; everyone else can only view the display.
