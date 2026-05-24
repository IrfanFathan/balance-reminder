# PayLater

PayLater is a mobile-first customer credit balance management and WhatsApp payment reminder system designed for local shop owners in Kerala, India. Shop owners can track pending balances, manage customers, and send payment reminders via WhatsApp directly from their mobile browser. The system runs entirely on Supabase with no backend server required.

## Prerequisites

- Node.js 18 or later
- A Supabase account (free tier)
- A Vercel account for hosting (optional)

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).

2. Go to the SQL Editor and run:

```sql
create table customers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  purchase_details text,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  remaining_balance numeric generated always as (total_amount - paid_amount) stored,
  last_purchase_date date,
  language_preference text default 'english',
  notes text,
  created_at timestamp with time zone default now()
);
```

3. Enable Row Level Security on the `customers` table.

4. Run this policy:

```sql
create policy "Authenticated access only"
on customers
for all
using (auth.role() = 'authenticated');
```

5. Create the shop owner account in Authentication > Users > Add User (email + password).

6. Copy your Project URL and anon key from Settings > API.

## Local Development

```bash
git clone <your-repo-url>
cd paylater
npm install
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Start the dev server:

```bash
npm run dev
```

## Vercel Deployment

1. Push the code to GitHub.
2. Import the repo in Vercel.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings.
4. Deploy.

Build command: `vite build`
Output directory: `dist`

## How to Add the Shop Owner Account

1. Go to your Supabase project dashboard.
2. Navigate to Authentication > Users.
3. Click "Add User" and enter the shop owner's email and password.
4. The owner can now sign in on the PayLater app.

## How WhatsApp Reminders Work

When a shop owner taps "Remind" on a customer with a pending balance, the app generates a pre-formatted message (in English or Malayalam based on the customer's language preference) and opens WhatsApp using the `wa.me` URL scheme. The message includes the customer's name and remaining balance amount. The owner reviews and sends the message from WhatsApp directly.

## Future Upgrade Ideas

- Multi-shop support for managing multiple stores
- Automatic reminder scheduling with cron jobs
- PDF invoice generation for customers
- Payment history timeline per customer
- Analytics dashboard with charts and trends
- Dark mode theme
- Export ledger data to Excel/CSV
- QR code payment integration
- SMS reminder fallback
