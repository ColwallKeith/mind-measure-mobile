# Moving Amazon SES Out of Sandbox

Buddy invite and nudge emails are sent via **Amazon SES**. In sandbox, you can only send **to** verified addresses. The error `Email address is not verified. The following identities failed the check in region EU-WEST-2: <email>` means the **recipient** is not verified. To send to any buddy email (e.g. `keith@theproduction.company`), move SES out of sandbox.

## Sandbox limits (current)

- Send **only to** verified email addresses or domains
- Max 200 messages per 24 hours
- Max 1 message per second

## How to request production access

### 1. Verify your sending identity

In **AWS SES** → **Verified identities** (use region **eu-west-2** if that’s where you send):

- Verify the **domain** or **email** you use as **From** (e.g. `noreply@mindmeasure.co.uk`).
- Verifying a **domain** before requesting production access often speeds up approval.

### 2. Open the request form

1. Go to [Amazon SES Console](https://console.aws.amazon.com/ses/).
2. Choose **Account dashboard** in the left nav.
3. In the “Your Amazon SES account is in the sandbox” banner, click **View Get set up page** → **Request production access**.

### 3. Fill out the form

- **Mail type**: Choose **Transactional** (invite/nudge emails are one-to-one, user-triggered).
- **Website URL**: Your app URL (e.g. `https://mobile.mindmeasure.app`).
- **Additional contacts**: Up to 4 email addresses for AWS communications about your account.
- **Acknowledgement**: Confirm you only send to people who’ve requested it and that you handle bounces and complaints.

Submit the form. AWS usually responds within **24 hours**. They may ask for more details.

### 4. After approval

- You can send to **any** recipient; no need to verify buddy addresses.
- You must still verify all **From** / **Source** / **Sender** identities (e.g. `noreply@mindmeasure.co.uk`).
- You can request higher sending quotas via the same process or through AWS Support if needed.

## AWS CLI (optional)

If you use the CLI:

```bash
aws sesv2 put-account-details \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --website-url https://mobile.mindmeasure.app \
  --additional-contact-email-addresses "you@example.com" \
  --contact-language EN
```

Replace the URL and contact email as appropriate.

## Troubleshooting: “Everything should be working but it doesn’t”

When DKIM is verified and DNS is set, use this checklist (region **eu-west-2**):

1. **Sandbox vs production**
   - In SES → **Account dashboard**, check whether the “Your account is in the sandbox” banner is still there.
   - If it is, you can only send **to** verified addresses. Either verify the buddy’s email in SES or wait for production access.

2. **Verified identity (From address)**
   - SES → **Verified identities** → ensure **mindmeasure.co.uk** (or **noreply@mindmeasure.co.uk**) is listed and status is **Verified**.
   - DKIM “complete” is for signing; the identity must still be **Verified** for sending.

3. **Exact error from the app**
   - Send an invite (or use “Resend invite”), then check the **exact** message in the alert or in the browser **Network** tab (invite request → Response).
   - The API returns `error` and `message`; `message` is the SES/detail text. Use that to see if it’s “Email address is not verified”, “Account is in sandbox”, “MessageRejected”, etc.

4. **Vercel / env**
   - Confirm the deployed app (e.g. Vercel) has **AWS_REGION** (e.g. `eu-west-2`), **AWS_ACCESS_KEY_ID**, and **AWS_SECRET_ACCESS_KEY** set and that the IAM user has `ses:SendEmail` for that region.

5. **Recipient**
   - In sandbox, the **recipient** (the buddy’s email) must be verified in SES. In production, it does not.

## Reference

- [Request production access (SES Developer Guide)](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
