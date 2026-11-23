// Serverless API route for project inquiries (Vercel / Netlify / Cloud Functions)
// Never exposes RESEND_API_KEY to client-side code

declare const process: any;

export interface InquiryPayload {
  name: string;
  email: string;
  phone: string;
  projectType: string;
  message: string;
}

export async function processInquiry(payload: InquiryPayload): Promise<{
  success: boolean;
  status: number;
  message: string;
  details?: any;
}> {
  const { name, email, phone, projectType, message } = payload;

  if (!name?.trim() || !email?.trim() || !phone?.trim() || !message?.trim()) {
    return {
      success: false,
      status: 400,
      message: "Please fill in all required fields (Name, Email, Phone, and Project Details).",
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const toEmail = process.env.INQUIRY_TO_EMAIL?.trim() || "girasejitendra249@gmail.com";
  const fromEmail = process.env.INQUIRY_FROM_EMAIL?.trim() || "Siddharth Portfolio <onboarding@resend.dev>";

  if (!resendApiKey) {
    return {
      success: false,
      status: 503,
      message:
        "Email delivery is not yet configured (missing RESEND_API_KEY in environment variables). Please use the 'Send via WhatsApp' button to reach Siddharth directly!",
    };
  }

  const emailSubject = `New Project Inquiry — ${name.trim()} (${projectType || "General"})`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0813; color: #ffffff; padding: 20px; }
    .card { background-color: #130f1e; border: 1px solid #7c3aed; border-radius: 12px; padding: 28px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; border-radius: 20px; color: #c084fc; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    h1 { color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }
    .info-row { margin-bottom: 12px; font-size: 15px; }
    .label { color: #a7a0b2; font-weight: 600; width: 140px; display: inline-block; }
    .value { color: #ffffff; }
    .message-box { background: rgba(0,0,0,0.4); border-left: 4px solid #a855f7; padding: 16px; border-radius: 6px; margin-top: 18px; font-size: 15px; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap; }
    .btn-group { margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.1); }
    .btn { display: inline-block; padding: 10px 20px; background: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 12px; font-size: 14px; }
    .footer { font-size: 12px; color: #6b7280; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Siddharth Girase Portfolio Inquiry</span>
    <h1>New Project Inquiry Received</h1>
    
    <div class="info-row">
      <span class="label">Client Name:</span>
      <span class="value"><strong>${name}</strong></span>
    </div>
    <div class="info-row">
      <span class="label">Email Address:</span>
      <span class="value"><a href="mailto:${email}" style="color: #c084fc;">${email}</a></span>
    </div>
    <div class="info-row">
      <span class="label">Phone / WhatsApp:</span>
      <span class="value"><a href="tel:${phone}" style="color: #c084fc;">${phone}</a></span>
    </div>
    <div class="info-row">
      <span class="label">Project Category:</span>
      <span class="value"><strong>${projectType}</strong></span>
    </div>

    <div style="margin-top: 18px; font-weight: 600; color: #c084fc;">Project Details & Scope:</div>
    <div class="message-box">${message}</div>

    <div class="btn-group">
      <a href="mailto:${email}?subject=Re:%20${encodeURIComponent(emailSubject)}" class="btn">Reply via Email</a>
      <a href="https://wa.me/${phone.replace(/[^0-9]/g, "")}" class="btn" style="background: #22c55e;">Message Client on WhatsApp</a>
    </div>

    <div class="footer">
      Delivered securely to ${toEmail} from your portfolio contact form.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
New Project Inquiry Received — Siddharth Girase Portfolio
--------------------------------------------------------
Client Name: ${name}
Email Address: ${email}
Phone / WhatsApp: ${phone}
Project Category: ${projectType}

Project Details:
${message}
--------------------------------------------------------
Reply directly to: ${email}
  `.trim();

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: emailSubject,
        html: htmlContent,
        text: textContent,
      }),
    });

    const resData = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", resData);
      return {
        success: false,
        status: response.status,
        message:
          resData.message ||
          "Resend rejected the request. Please check your API key and verified domain or send via WhatsApp.",
        details: resData,
      };
    }

    return {
      success: true,
      status: 200,
      message: "Inquiry sent successfully to Siddharth Girase!",
      details: resData,
    };
  } catch (error: any) {
    console.error("Network or execution failure during email dispatch:", error);
    return {
      success: false,
      status: 500,
      message: "Network error communicating with the email provider. Please try again or use WhatsApp.",
      details: error.message,
    };
  }
}

// Default export for Vercel Serverless Function (Node.js runtime)
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const result = await processInquiry(payload);
    return res.status(result.status).json(result);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request payload.",
      details: err.message,
    });
  }
}
