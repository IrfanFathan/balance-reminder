# PayLater · Balance Reminder & Shop Ledger Ecosystem

A high-fidelity, mobile-first fintech ecosystem tailored for local shop owners in Kerala, India. **PayLater** simplifies outstanding customer credit tracking and accelerates collections via automated, localized WhatsApp payment reminders.

This repository represents a complete design-to-production journey, housing both a strict **high-fidelity interactive prototype** and a **fully functional production-ready React application**.

---

## 📂 Project Architecture

The repository is structured into two main layers:

```
balance-reminder/
├── 📄 brand-spec.md            # The master visual and design tokens spec
├── 🌐 Interactive Prototype    # Vanilla HTML/CSS high-fidelity interactive screens
│   ├── index.html              # Ecosystem Launcher & Overview
│   ├── dashboard.html          # Main shop metrics and recent ledger activity (Screen 1)
│   ├── customers.html          # Directory of all accounts and outstanding balances
│   ├── add-customer.html       # Customer onboarding workflow form
│   ├── add-transaction.html    # Log new credit purchase or payment entry
│   ├── ledger.html             # Detailed customer statement & WhatsApp reminder launcher (Screen 6)
│   ├── analytics.html          # Credit distribution, volumes, and collection analytics (Screen 5)
│   └── settings.html           # Shop metadata, language presets, and sync toggles (Screen 7)
│
└── ⚡ paylater/                 # Fully functional React Web App (Vite + Supabase + Tailwind)
    ├── src/
    │   ├── App.jsx             # App shell and routing setup
    │   ├── pages/              # Full-fledged React page components
    │   ├── components/         # Reusable design system UI components
    │   └── lib/                # Supabase client and utility functions
    ├── package.json            # Dependencies and scripts
    └── tailwind.config.js      # Tailwind customization adapting brand tokens
```

---

## 🎨 Design System (`brand-spec.md`)

Both the interactive prototype and the production React app strictly adhere to a **premium, ultra-minimalist flat architecture** inspired by Swiss design and modern editorial fintech UI:

*   **Harmony Canvas:** A soft off-white canvas backdrop (`#EAEAEA` / `oklch(93.6% 0.002 240)`).
*   **Deep Contrast:** Midnight-black surfaces and active interface components (`#1C1C1E` / `oklch(18.5% 0.01 260)`).
*   **Strategic Accent:** Coral red (`#EF4434` / `oklch(62% 0.22 30)`) used exclusively for negative credit balances, actions, and key notifications.
*   **Typography Hierarchy:**
    *   **Display / Body:** `Inter` (Regular and Medium weights for clean, legible interfaces).
    *   **Numerics & Metadata:** `JetBrains Mono` (for clear transaction entries, balance displays, and structural labels).
*   **Strict Layout Posture:** Flat, flat, flat. Zero rounded corners (`border-radius: 0px`), clean 1px borders, and solid block hover offsets instead of soft drop shadows.

---

## 🚀 Getting Started

### 1. Launching the Interactive Prototype (Vanilla HTML/CSS)
The static prototype provides a stunning, instant representation of the user journey with realistic sample data. 
To launch it:
*   Open `/index.html` directly in any web browser.
*   Alternatively, serve it with any light static server:
    ```bash
    # Using python built-in server
    python -m http.server 8000
    
    # Or using live-server globally
    npx live-server
    ```

### 2. Running the Production Web App (`/paylater`)
The full application runs on React 19, Vite, and Supabase.

#### Prerequisites
*   Node.js v18 or later installed.
*   A free-tier Supabase project.

#### Database Configuration
Run the following DDL in your Supabase SQL Editor to provision the ledger schema:
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

-- Enable Row Level Security (RLS)
alter table customers enable row level security;

-- Setup policy for authenticated shop owner access
Create policy "Authenticated access only."
on customers
for all
using (auth.role() = 'authenticated');
```

#### Local Development
1. Navigate into the React app directory:
   ```bash
   cd paylater
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

## 📱 Key Features & UX Flows

*   **Dynamic Dashboard**: Centralizes shop status, displays total outstanding balance, and shows recent entries at a glance.
*   **WhatsApp Reminders (Malayalam/English)**: Tapping "Remind" dynamically drafts a template tailored to the customer's preferred language, including exact outstanding balance and shop details. It launches WhatsApp with pre-filled content via native URL schemes.
*   **Customer Ledger**: Tracks individual customer histories with clean credit vs. debit timeline visual cues.
*   **Shop Settings**: Customize shop metadata (e.g., *Royal Fancy, London*) and configure cloud-sync parameters.
