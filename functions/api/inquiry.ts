// Cloudflare Pages Function: /api/inquiry
// Handles client project inquiries and sends email notifications via Resend API

interface InquiryEnv {
  RESEND_API_KEY?: string;
  INQUIRY_TO_EMAIL?: string;
  INQUIRY_FROM_EMAIL?: string;
}

export const onRequestPost = async (context: { env: InquiryEnv; request: Request }) => {
  try {
    const payload = (await context.request.json().catch(() => ({}))) as any;
    const name = (payload.name || "").trim();
    const email = (payload.email || "").trim();
    const phone = (payload.phone || "").trim();
    const projectType = (payload.projectType || "General Project").trim();
    const message = (payload.message || "").trim();

    if (!name || !email || !phone || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Please fill in all required fields (Name, Email, Phone, and Project Details).",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 400,
          message: "Please provide a valid email address.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = context.env.RESEND_API_KEY?.trim();
    const toEmail = context.env.INQUIRY_TO_EMAIL?.trim() || "girasejitendra249@gmail.com";
    const fromEmail = context.env.INQUIRY_FROM_EMAIL?.trim() || "Siddharth Portfolio <onboarding@resend.dev>";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 503,
          message:
            "Email delivery is not yet configured (missing RESEND_API_KEY in environment variables). Please use the 'Send via WhatsApp' button to reach Siddharth directly!",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const emailSubject = `New Project Inquiry — ${name} (${projectType})`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0813; color: #ffffff; padding: 20px; }
    .card { background-color: #130f1e; border: 1px solid #7c3aed; border-radius: 12px; padding: 28px; max-width: 600px; margin: 0 auto; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; border-radius: 20px; color: #c084fc; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; }
    h1 { color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }
    .info-row { margin-bottom: 12px; font-size: 15px; }
    .label { color: #a7a0b2; font-weight: 600; width: 140px; display: inline-block; }
    .value { color: #ffffff; }
    .message-box { background: rgba(0,0,0,0.4); border-left: 4px solid #a855f7; padding: 16px; border-radius: 6px; margin-top: 18px; font-size: 15px; line-height: 1.6; color: #e2e8f0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Siddharth Girase Portfolio Inquiry</span>
    <h1>New Project Inquiry Received</h1>
    <div class="info-row"><span class="label">Client Name:</span><span class="value"><strong>${name}</strong></span></div>
    <div class="info-row"><span class="label">Email Address:</span><span class="value"><a href="mailto:${email}" style="color: #c084fc;">${email}</a></span></div>
    <div class="info-row"><span class="label">Phone / WhatsApp:</span><span class="value"><a href="tel:${phone}" style="color: #c084fc;">${phone}</a></span></div>
    <div class="info-row"><span class="label">Project Type:</span><span class="value"><strong>${projectType}</strong></span></div>
    <div class="message-box">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
  </div>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
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
      }),
    });

    const resendData = (await resendResponse.json().catch(() => ({}))) as any;

    if (resendResponse.ok) {
      return new Response(
        JSON.stringify({
          success: true,
          status: 200,
          message: "Thank you! Your inquiry has been sent to Siddharth.",
          id: resendData.id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          status: 502,
          message: resendData.message || "Failed to deliver email through Resend API.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        status: 500,
        message: err.message || "Internal inquiry handler error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
