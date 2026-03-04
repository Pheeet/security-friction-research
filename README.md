# Adaptive Security Authentication Research

This project is a Full-Stack application designed to research and evaluate user behavior and satisfaction regarding different authentication security models: **Static Security** vs **Adaptive Security**.

The system dynamically adjusts friction (e.g., CAPTCHA, 2FA) based on user behavior and context.

## Tech Stack

* **Frontend:** Next.js (React), Tailwind CSS, TypeScript
* **Backend:** Go (Gin Framework, GORM)
* **Database:** PostgreSQL (Optimized for Neon DB)
* **Authentication:** JWT (Secure HTTPOnly Cookies), Google OAuth 2.0
* **Bot Protection:** Cloudflare Turnstile

## Key Features

* **A/B Testing Flow:** Seamless transition between Static and Adaptive security flows.
* **Behavioral Analysis:** Simulates adaptive friction based on login patterns.
* **Production-Ready Security:**
  * Strict CORS policies & Rate Limiting (Anti-Spam).
  * `HttpOnly` & `SameSite=Lax` secure cookies for CSRF/XSS protection.
  * Graceful error handling (No sensitive DB logs leaked).
* **Resource Optimized:** DB Connection pooling (Max 10 open / 5 idle) and Go GC tuning for low-RAM environments.

---

## Environment Variables Setup

The application is designed to be "zero-config" for local development (falling back to `localhost`), but requires specific API keys to function fully. 

### 1. Backend (`backend/.env`)

You need to create a `.env` file in the `backend/` directory. Here is where to get each required key:

| Variable | Description | Where to get it |
| :--- | :--- | :--- |
| `GOOGLE_CLIENT_ID` | For Google SSO Login | [Google Cloud Console](https://console.cloud.google.com/) > APIs & Services > Credentials |
| `GOOGLE_CLIENT_SECRET` | For Google SSO Login | Same as above |
| `TURNSTILE_SECRET_KEY` | CAPTCHA verification | [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) |
| `SMTP_HOST` | Email server (e.g., `smtp.gmail.com`) | Your email provider |
| `SMTP_PORT` | Email port (e.g., `587`) | Your email provider |
| `SMTP_USER` | Email address for sending OTP | Your Google Account |
| `SMTP_PASSWORD` | App Password for Email | Google Account > Security > [App Passwords](https://myaccount.google.com/apppasswords) |
| `GOOGLE_SCRIPT_URL` | Webhook for Google Sheets | Google Apps Script > Deploy > Web App URL |
| `JWT_SECRET` | Secret key for signing tokens | Generate a random strong string yourself |
| `DATABASE_URL` | *(Optional for local)* DB connection | Local Docker or [Neon DB](https://neon.tech/) for production |

### 2. Frontend (`frontend/.env.local`)

Create a `.env.local` file in the `frontend/` directory.

| Variable | Description | Where to get it |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | CAPTCHA site key | [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/?to=/:account/turnstile) |

*(Note: `NEXT_PUBLIC_API_URL` is not required for local dev as it defaults to `http://localhost:8080/api`)*

---

## Local Development

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop)
* [Go 1.21+](https://go.dev/)
* [Node.js 18+](https://nodejs.org/)

### How to Run (Local Development)

The project is equipped with a helper script to get you up and running in seconds.

### 1. Setup & Start All Services
This single command will start the PostgreSQL database, backend (Go), and frontend (Next.js) in development mode:
```bash
chmod +x run_docker-compose.sh  # Grant permission (first time only)
./run_docker-compose.sh
```

### 2. Access the Application
Once the script finishes, you can access the services at:
* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:8080/api](http://localhost:8080/api)

---

## Production Deployment Guide

When deploying to production, you must configure the environment variables directly in the hosting platforms' dashboards. **Do not commit production secrets to Git.**

1. **Database (Neon DB):** * Create a PostgreSQL project on [Neon.tech](https://neon.tech/).
   * Copy the Pooled `DATABASE_URL`.
2. **Backend (Render):** * Create a new Web Service using standard Go compilation.
   * Add all backend environment variables via the Render Dashboard.
   * **Crucial:** Add `ENV=production`, `FRONTEND_URL`, `BACKEND_URL`, and `COOKIE_DOMAIN`.
3. **Frontend (Vercel):** * Deploy the Next.js app.
   * Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_API_URL` (pointing to your Render backend) in the Vercel Settings.
4. **Google Cloud Console:** * Add your Vercel and Render production URLs to the **Authorized JavaScript origins** and **Authorized redirect URIs**.
