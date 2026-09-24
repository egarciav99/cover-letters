# CoverCraft — AI Cover Letter Generator

CoverCraft is a professional AI-powered tool designed to generate personalized cover letters in seconds. By uploading your CV and pasting job requirements, the app uses AI (via n8n) to create a tailored letter, which you can then edit and download as a professional PDF.

## 🚀 Features

- **AI Generation**: Powered by n8n automation for smart, context-aware writing.
- **Multi-CV Management**: Upload and manage different CVs based on language or job type.
- **Dynamic Editor**: Real-time editing of the generated content with rich text support.
- **Professional PDF Export**: High-quality PDF generation with profile photo and handwritten signature support.
- **Multi-language Support**: Interface and generation available in English, Spanish, and French.

## 🛠 Tech Stack

- **Framework**: Next.js (App Router)
- **Database & Auth**: Supabase
- **Internationalization**: next-intl
- **Automation**: n8n (External Webhook)
- **Styling**: Vanilla CSS (Premium & Custom Design)
- **PDF Export**: html2pdf.js

## 📦 Setup & Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd cover-letters
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory and add the following:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role
N8N_WEBHOOK_URL=your_n8n_webhook_url
NEXT_PUBLIC_APP_URL=http://localhost:3000
WEBHOOK_SECRET=shared_secret_with_n8n

# Legal notice (shown only when set)
NEXT_PUBLIC_CONTACT_EMAIL=you@example.com
NEXT_PUBLIC_LEGAL_NAME=Your Name
NEXT_PUBLIC_LEGAL_TAX_ID=
NEXT_PUBLIC_LEGAL_ADDRESS=

# Optional: Google AdSense (free plan only, never in the editor)
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT=1234567890

# Stripe checkout (keep false until billing is ready)
NEXT_PUBLIC_BILLING_ENABLED=false
```

### 4. Run the development server
```bash
npm run dev
```

## Freemium, legal and monetisation

- **Plans** live in `lib/plans.ts`: Free = 3 letters per calendar month (UTC), Pro = €4.99/month with a fair-use cap of 100.
- **Quota is enforced server-side** in `/api/generate` through the `consume_generation` Postgres function (atomic, per-user lock). Failed generations are refunded. Deleting letters does not give quota back.
- **Database:** run `supabase/migrations/002_freemium.sql` once in the Supabase SQL editor. Until it runs, the app keeps working but the quota is not enforced (a warning is logged).
- **Account deletion** (`/api/account/delete`) removes storage files and the auth user; the database cascades the rest.
- **Public pages:** `/pricing`, `/terms`, `/privacy`, `/cookies`, `/legal` (ES/EN; FR and NL show the English text), plus `robots.txt`, `sitemap.xml` and `ads.txt`.
- **Analytics:** Vercel Web Analytics (cookie-free). Enable it in the Vercel project.
- **Ads:** set the two `NEXT_PUBLIC_ADSENSE_*` variables and configure a consent message in AdSense → *Privacy & messaging* (required in the EEA/UK). Ads render on the landing page and on the free-plan dashboard only.

## 4. Custom Fixes & Improvements

This version includes several custom visual and logic improvements:
- **Date Capitalization**: Month names in the PDF are always capitalized (e.g., "Febrero").
- **Enhanced Signature**: The handwritten signature in the PDF is 3x larger for better visibility.
- **Full Localization**: Greetings, closings, and subject lines automatically adapt to the user's selected language.
- **Route Protection**: Implemented via `proxy.ts` (the new Next.js standard for what was formerly `middleware.ts`).

## 🚢 Deployment

For deployment instructions on Vercel, please refer to the [Deployment Guide](https://github.com/your-username/your-repo/blob/main/deploy_guide.md) (or the `deploy_guide.md` in this repository).

Vercel