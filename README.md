This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Start the app locally:

```bash
pnpm start
```

This builds the production app, then starts it on `127.0.0.1:3000`. No separate build command is needed. Stop it with `Ctrl+C`.

For development with automatic reload, use `pnpm dev`.

On Linux, both launchers automatically monitor their original terminal/launcher
ancestry. Closing it, Ctrl+C, or a launcher crash stops the server and its owned
RIFE/FFmpeg workers. Each worker has a separate supervisor, so server crashes also
trigger cleanup. Shutdown sends SIGTERM and escalates to SIGKILL after 20 seconds
if owned processes remain. Keep the terminal open while generating; closing a
browser tab does not stop generation. External apps and GPU processes are not
targeted, and files/models are not deleted by the supervisor. Automatic cleanup
requires the supervisor and OS to remain healthy; uninterruptible kernel work can
still require operator recovery. Other platforms retain ordinary signal handling.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. With `pnpm dev`, the page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
