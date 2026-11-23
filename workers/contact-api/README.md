# Contact API Cloudflare Worker (`/api/contact`)

Serverless same-origin endpoint (`https://home-management.dev/api/contact`) that delivers inquiries from `<app-contact-modal>` **natively through Cloudflare Email Routing (`SEND_EMAIL` binding)**—100% free, zero third-party email service, and **zero API keys required**.

## Production Setup (\$0 / month, Zero API Keys)

1. **Cloudflare Email Routing** _(already done if `homemngdev@gmail.com` is verified!)_:
   - In **Cloudflare Dashboard → `home-management.dev` → Email → Email Routing**, ensure `homemngdev@gmail.com` is verified as a destination address.
2. **Deploy the Worker** (from the repository root):
   ```powershell
   npx wrangler login
   npm run deploy:contact-api
   ```

_(Optional)_ For local testing on `http://localhost:4200`, run `npm run start:contact-api` (which runs `wrangler dev` on port `8787` connected to Cloudflare's live `SEND_EMAIL` remote binding with zero API keys).
