<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Dev Server

Always use the HTTPS dev server — plain HTTP breaks the Geolocation API (`window.isSecureContext`):

```bash
npm run dev:network:https   # https://192.168.5.18:3000
```

Certificates live in `certificates/` (gitignored). If missing, regenerate with mkcert targeting `192.168.5.18`.
