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
```

### 4. Run the development server
```bash
npm run dev
```

## 4. Custom Fixes & Improvements

This version includes several custom visual and logic improvements:
- **Date Capitalization**: Month names in the PDF are always capitalized (e.g., "Febrero").
- **Enhanced Signature**: The handwritten signature in the PDF is 3x larger for better visibility.
- **Full Localization**: Greetings, closings, and subject lines automatically adapt to the user's selected language.
- **Route Protection**: Implemented via `proxy.ts` (the new Next.js standard for what was formerly `middleware.ts`).

## 🚢 Deployment

For deployment instructions on Vercel, please refer to the [Deployment Guide](https://github.com/your-username/your-repo/blob/main/deploy_guide.md) (or the `deploy_guide.md` in this repository).
