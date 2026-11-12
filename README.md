# TAMIL VIP — Independent Digital Store

This is a fresh implementation for the TAMIL VIP brand. The supplied scan ZIPs were used only as public reference for the visible login/authentication flow and general visual direction. They did not contain FIXA's private backend, database, admin credentials, payment credentials, or a complete source project.

## Included
- Premium dark, responsive storefront
- Product catalogue with Android / PC / iOS filters
- Email/password registration and login (bcrypt password hashing)
- User order creation and order history
- Admin-only dashboard and protected admin APIs
- Admin can add products and update order status
- MongoDB support for persistent production data
- JSON-file storage fallback for local testing
- Render deployment blueprint

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Change `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to unique values.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Production setup (Render + MongoDB Atlas)
1. Push this project to your own GitHub repository.
2. Create a MongoDB Atlas database and database user.
3. In Render, create a **Web Service** connected to that repository.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables in Render:
   - `SESSION_SECRET`: long random secret
   - `ADMIN_EMAIL`: your own admin email
   - `ADMIN_PASSWORD`: a strong unique password
   - `MONGODB_URI`: your MongoDB Atlas connection string
7. Deploy, then sign in using the admin email/password you configured.

MongoDB is strongly recommended for Render production. The JSON fallback is intended for local testing and may be lost on hosts with ephemeral filesystems. Never commit `.env` or publish database credentials.

## Payment gateway
Payment is deliberately **not activated** in this starter. The scan files did not reveal any usable payment gateway integration or merchant credentials. To accept real payments, create your own Razorpay/Cashfree merchant account, obtain your own API keys, and add server-side payment-order creation plus signature/webhook verification. Never trust a payment-success message sent only by the browser. Do not ask customers for card PINs, UPI PINs, OTPs, or account passwords.

## Google sign-in
The app currently includes email/password authentication. Google sign-in can be added using a Firebase project owned by you, with server-side Firebase ID-token verification. Do not reuse another site's Firebase project or credentials.

## Before launch
- Change all default secrets and admin credentials.
- Configure MongoDB Atlas network access securely.
- Add your real support email, terms, privacy and refund policy.
- Only list products/services you own or are authorized to sell.
- Test registration, login, admin access, order status changes, and backups.
