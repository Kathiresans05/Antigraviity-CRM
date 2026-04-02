# 🚀 Render Deployment Guide (Full-Stack Next.js)

Your project is a **Full-Stack Next.js Monolith**. This means your website (Frontend) and your API (Backend) are in the same folder and can be deployed together to a single **Render Web Service**.

## 1. Create a New Web Service on Render
1. Log in to [Render](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub/GitLab repository.

## 2. Configure Build & Start Settings
Render will ask for these settings. Enter them exactly as follows:

| Setting | Value |
| :--- | :--- |
| **Runtime** | `Node` |
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |

## 3. Set Environment Variables
Go to the **Environment** tab in Render and add all the variables from your `.env.local` file:
- `MONGODB_URI`: Your MongoDB connection string.
- `NEXTAUTH_SECRET`: A random long string (for security).
- `NEXTAUTH_URL`: Your Render app URL (e.g., `https://your-app-name.onrender.com`).

## 4. Why is there no "backend" folder?
In Next.js, the backend is located in **`src/app/api`**. 
When you run `npm run build`, Next.js compiles both the pages (Frontend) and the API routes (Backend). When the server starts, it handles both!

> [!TIP]
> **Database Access**: Ensure your MongoDB cluster allows connections from all IP addresses (`0.0.0.0/0`) in its Network Access settings, as Render IPs are dynamic.
