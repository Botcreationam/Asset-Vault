const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "AcadVault <noreply@acadvault.app>";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[Email - no RESEND_API_KEY] To: ${opts.to} | Subject: ${opts.subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[Email] Failed to send email: ${res.status} ${body}`);
  }
}

const baseStyle = `
  font-family: 'Plus Jakarta Sans', Arial, sans-serif;
  max-width: 560px;
  margin: 0 auto;
  background: #0B1120;
  color: #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
`;

const headerStyle = `
  background: #142042;
  padding: 32px 40px 24px;
  text-align: center;
`;

const bodyStyle = `
  padding: 32px 40px;
`;

const footerStyle = `
  background: #0d1a35;
  padding: 16px 40px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
`;

const btnApproved = `
  display: inline-block;
  background: #D9A014;
  color: #0B1120;
  font-weight: 700;
  padding: 12px 28px;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 20px;
`;

const btnRejected = `
  display: inline-block;
  background: #ef4444;
  color: #fff;
  font-weight: 700;
  padding: 12px 28px;
  border-radius: 8px;
  text-decoration: none;
  margin-top: 20px;
`;

export async function sendApprovalEmail(opts: {
  to: string;
  name: string;
  school: string;
  loginUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: "🎉 Your AcadVault account has been approved!",
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="margin:0;color:#D9A014;font-size:28px;font-weight:800;">AcadVault</h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Academic Resource Platform</p>
        </div>
        <div style="${bodyStyle}">
          <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;">Welcome, ${opts.name}! 🎓</h2>
          <p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6;">
            Great news — your AcadVault account for <strong style="color:#D9A014;">${opts.school}</strong> has been 
            reviewed and approved by our admin team.
          </p>
          <p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6;">
            You now have full access to the platform, including:
          </p>
          <ul style="margin:0 0 20px;padding-left:20px;color:#94a3b8;line-height:2;">
            <li>Browse and download academic resources</li>
            <li>Earn and spend units on premium content</li>
            <li>Join the community newsfeed</li>
            <li>Request materials from your institution</li>
          </ul>
          <div style="text-align:center;">
            <a href="${opts.loginUrl}" style="${btnApproved}">Access AcadVault →</a>
          </div>
        </div>
        <div style="${footerStyle}">
          <p style="margin:0;">© ${new Date().getFullYear()} AcadVault. All rights reserved.</p>
          <p style="margin:4px 0 0;">Questions? Chat with us via WhatsApp: +260978277538</p>
        </div>
      </div>
    `,
  });
}

export async function sendRejectionEmail(opts: {
  to: string;
  name: string;
  school: string;
  reason: string;
  contactUrl: string;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: "AcadVault — Registration Update",
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <h1 style="margin:0;color:#D9A014;font-size:28px;font-weight:800;">AcadVault</h1>
          <p style="margin:8px 0 0;color:#94a3b8;font-size:14px;">Academic Resource Platform</p>
        </div>
        <div style="${bodyStyle}">
          <h2 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;">Hi ${opts.name},</h2>
          <p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6;">
            Thank you for registering with AcadVault for <strong style="color:#D9A014;">${opts.school}</strong>.
            After reviewing your submission, our team was unable to approve your registration at this time.
          </p>
          ${opts.reason ? `
          <div style="background:#1e1b2e;border-left:4px solid #ef4444;padding:16px 20px;border-radius:4px;margin:20px 0;">
            <p style="margin:0;color:#fca5a5;font-size:14px;font-weight:600;">Reason:</p>
            <p style="margin:8px 0 0;color:#e2e8f0;">${opts.reason}</p>
          </div>
          ` : ""}
          <p style="margin:0 0 12px;color:#cbd5e1;line-height:1.6;">
            If you believe this is an error or would like to provide additional verification, 
            please reach out to our support team.
          </p>
          <div style="text-align:center;">
            <a href="${opts.contactUrl}" style="${btnRejected}">Contact Support</a>
          </div>
        </div>
        <div style="${footerStyle}">
          <p style="margin:0;">© ${new Date().getFullYear()} AcadVault. All rights reserved.</p>
          <p style="margin:4px 0 0;">WhatsApp: +260978277538</p>
        </div>
      </div>
    `,
  });
}
