# Customer issues and incidents: what to do with what we have today

For whoever handles customer support and keeps the site running. It uses only
tools that exist now. The list of things we do not have yet is at the end, so
nobody assumes a safety net that is not there.

## 1. First five minutes, for any complaint

1. **Get three things from the customer:** the order number (starts with
   `ORD-`), a screenshot of what they saw, and roughly what time it happened.
2. **Find the order.** Open `/admin/orders` and search by order number, name,
   email or delivery details. Read three things on the order: its status, its
   payment status, and the notes.
3. **Check the payment itself** in the Razorpay or Stripe dashboard. The store
   only believes a payment once the gateway has told it so, and the gateway
   dashboard is the source of truth for money.
4. **Reply within the hours promised:** Monday to Saturday, 10 AM to 5 PM,
   within 24 hours. WhatsApp and email are the live channels (see section 6).

## 2. Playbooks

### A. The customer paid, but the order shows unpaid or pending

The most important case. Money has left the customer, so treat it as urgent.

1. In the gateway dashboard, confirm the payment is captured.
2. **Resend the payment event** from the gateway's webhook event log
   (`payment.captured` for Razorpay, `payment_intent.succeeded` for Stripe).
   The store handles repeats safely: it marks the order paid, takes the stock
   off and clears the bought items from the cart exactly once. Wait a minute,
   then refresh the order in the admin.
3. If the gateway offers no resend, set **Payment status to PAID** and
   **Status to CONFIRMED** on the order in the admin. Then, because a manual
   change does **not** reduce stock or clear the cart, lower the product's
   stock yourself under `/admin/products` and add a note on the order saying
   what you did.
4. Tell the customer the order is confirmed.

### B. Money was debited but the payment shows failed

Usually the bank reverses it in 5 to 7 working days. Check the gateway: if the
payment is captured, follow A. If it is failed or authorised only, tell the
customer to wait for the automatic reversal and give them the payment id to
quote to their bank.

### C. Charged twice, or two identical orders

Look at both orders. One paid and one unpaid is normal: the unpaid one is an
abandoned attempt and can be cancelled. Two paid orders need a refund of one
(playbook E) and, if the piece is single, an apology.

### D. Customer wants to cancel

- **Not paid and not dispatched:** the customer can do it themselves from
  their orders page, or you set Status to CANCELLED.
- **Paid:** they cannot cancel it themselves. If it has not shipped, cancel in
  the admin and refund (playbook E). Stock is not put back automatically.
- **Dispatched or delivered:** it becomes a return. Follow the return policy
  and, once the piece is back, refund and raise the stock by hand.

### E. Refund

1. Issue the refund **in the gateway dashboard**. The store does not issue
   refunds itself.
2. The gateway then tells the store. A full refund turns the order to
   REFUNDED. A partial refund keeps the order's status and adds a
   `PARTIAL REFUND` line to its notes.
3. Stock does **not** go back up on its own. If the piece came back and can
   be sold again, raise its stock in `/admin/products`.

### F. An order carries an OVERSOLD note

Two customers paid for the last piece. The stock was set to zero and the order
was flagged. Contact the later customer: offer to wait (these sarees can be
pre-booked, delivery 15 to 20 days) or refund.

### G. Someone cannot sign in

1. Open the Clerk dashboard, find the user by email, and check they exist and
   their email is verified.
2. For Google sign-in, remember it runs through the Google Cloud project
   `saakie-byknk-auth`. If every Google attempt fails, check that the OAuth
   client still exists there and the app is published.
3. If sign-in works but the site shows an error or the wrong access, check the
   person's role in `/admin/users` (a Super Admin only; ADMINs cannot open it). Roles must be exactly USER, ADMIN or
   SUPER_ADMIN.
4. Meanwhile the customer can use email and password or an email code.

### H. The site is down, or broke right after a change

1. Open the Vercel project, then **Deployments**. If the newest deployment is
   failed, or the problem started when it went live, open the **last good
   deployment** and choose **Promote to Production** (Vercel also calls this
   Instant Rollback). Menu wording may change; the idea is to make the
   previous good version live again. It takes seconds and loses no data.
2. Check **Runtime Logs** in Vercel for the error text.
3. Check the latest GitHub Actions run, since lint, tests and build must pass
   before a change is merged.

### I. Wrong price, stock, photo or category showing

- Changes saved through the **admin pages** appear on the storefront at once.
- Changes made **directly in the database** do not refresh the storefront
  cache. They appear within 5 minutes (store settings within 1 minute). To
  force it, open the item in the admin and save it.
- If a photo is broken or looks wrong, check the image exists in Cloudinary.
  The watermark can be switched off by setting `WATERMARK_ENABLED` to `false`
  in the Vercel environment variables and redeploying.

### J. Checkout will not take payment

1. Check the gateway dashboard and Vercel logs for errors.
2. If the gateway is down, tell customers honestly and ask them to try later,
   or take the order on WhatsApp and collect payment by UPI or a payment link
   made in the gateway dashboard. The admin cannot create an order by hand, so
   keep the order details and payment id in your own record until the site is
   back.

### K. Shipping fee is wrong for everyone

`/admin/settings` has the switch that turns the shipping fee on or off for
every order. It applies on the next cart load, with no deploy.

### L. Data is damaged or lost

1. **Stop making changes.**
2. In `/admin/backup` (SUPER_ADMIN only) check the latest snapshot time. Each
   run also downloads a copy to the admin's computer.
3. Run a restore as a dry run first, read what it says, then apply:

   ```bash
   node scripts/restore-backup.mjs                                    # list snapshots
   node scripts/restore-backup.mjs --snapshot 20260927T101500Z         # dry run
   node scripts/restore-backup.mjs --snapshot 20260927T101500Z --apply # restore
   ```

   A downloaded file works too, with `--file <path>` in place of `--snapshot`.
   A restore replaces every collection present in the backup, so anything
   written since that backup is lost.
4. **Press "Back up now" before any risky change**, so a restore point exists.

## 3. Where to look

| Question | Where |
|---|---|
| What happened to this order? | `/admin/orders`, then the order page |
| Did the money arrive? | Razorpay or Stripe dashboard |
| Did the gateway tell the store? | The gateway's webhook event log. The store listens on `/api/webhooks/razorpay` and `/api/webhooks/stripe` |
| Why is the site erroring? | Vercel, Runtime Logs |
| Which change broke it? | Vercel Deployments, and the GitHub pull request behind it |
| Sign-in problem | Clerk dashboard, then `/admin/users` |
| Photos | Cloudinary |
| Raw data | MongoDB Atlas |

## 4. Do not

- Do not mark an order PAID by hand unless you have also adjusted the stock.
- Do not delete a user who has orders. Their orders and addresses depend on
  them.
- Do not apply a restore without reading the dry run first.
- Do not paste API keys or passwords into chats, tickets or this document.

## 5. Messages to reuse

- **Paid, not confirmed:** "Thank you for your order. We can see your payment
  and are confirming order ORD-xxxx now. You will get the update shortly."
- **Delay on a pre-booked saree:** "Your saree is a pre-booked piece, so it
  is made to order and delivered 15 to 20 days after the order date."
- **Refund issued:** "Your refund has been issued. Banks usually show it in 5
  to 7 working days."
- **Site problem:** "Sorry about the trouble. We are fixing it. You can order
  on WhatsApp at +91 7219160782 in the meantime."

## 6. Contacts

- Customer line and WhatsApp: +91 7219160782
- Email: saakiebyknk@gmail.com
- Hours: Monday to Saturday, 10 AM to 5 PM
- Fill in below who owns each area:

| Area | Name | Phone |
|---|---|---|
| Orders and support | | |
| Website and deploys | | |
| Payments (gateway accounts) | | |

## 7. What we do not have yet

Knowing these keeps expectations honest:

- **The contact form does not send anything.** It shows a thank-you message
  but nothing is emailed or saved. Until this is fixed, tell customers to use
  WhatsApp or email directly.
- **No error alerts.** Errors reach Vercel's logs only; nobody is notified, so
  we learn about a break from a customer.
- **Backups are manual,** taken when someone presses "Back up now".
- **No site-wide notice banner,** and no switch to pause online payments.
- **Refunds and returns stock-keeping are manual,** as described above.
