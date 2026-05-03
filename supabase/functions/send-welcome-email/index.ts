// ═══════════════════════════════════════════════════════════
// 📧 SUPABASE EDGE FUNCTION: Send Welcome Email
// ═══════════════════════════════════════════════════════════
// استخدم هذه الدالة لإرسال بريد ترحيب للموظفين الجدد

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, fullName, loginUrl } = await req.json()

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Missing email or password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 📧 خيار 1: استخدام Resend API (مجاني - لازم تسجل على https://resend.com)
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    
    if (resendApiKey) {
      const emailBody = {
        from: "noreply@memo-pro.com", // غيّر هذا لبريدك الفعلي إذا كنت تستخدم Resend
        to: email,
        subject: `🎯 Welcome to Memo Pro - Your Account Details`,
        html: generateWelcomeEmail(fullName, email, password, loginUrl),
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailBody),
      })

      const data = await response.json()
      console.log("Resend response:", data)

      if (!response.ok) {
        throw new Error(data.message || "Failed to send email via Resend")
      }

      return new Response(
        JSON.stringify({ success: true, message: "Email sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // 📧 خيار 2: استخدام Supabase Mail (إذا كانت مفعلة)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (supabaseUrl && supabaseServiceKey) {
      console.log("Using Supabase Mail service...")
      
      // يمكن إضافة logic لإرسال عبر Supabase إذا توفرت
      console.log("Supabase Mail not fully configured in this function")
    }

    return new Response(
      JSON.stringify({ error: "No email service configured. Set RESEND_API_KEY env variable." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

// ═══════════════════════════════════════════════════════════
// 🎨 HTML Template للبريد الترحيبي
// ═══════════════════════════════════════════════════════════
function generateWelcomeEmail(fullName: string, email: string, password: string, loginUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 10px 0 0 0; opacity: 0.9; }
          .content { padding: 30px; }
          .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
          .credentials-box { background: #f8f8f8; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; font-family: 'Courier New', monospace; }
          .credential-item { margin: 10px 0; }
          .credential-label { color: #666; font-size: 12px; font-weight: bold; }
          .credential-value { color: #333; font-size: 14px; word-break: break-all; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; text-align: center; }
          .footer { background: #f8f8f8; padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #ddd; }
          .security-note { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; color: #856404; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
            <h1>Memo Pro</h1>
            <p>WORKFORCE MANAGEMENT SYSTEM</p>
          </div>

          <div class="content">
            <div class="greeting">Hello ${escapeHtml(fullName)},</div>
            
            <p>Welcome to <strong>Memo Pro</strong>! Your account has been successfully created.</p>
            <p>Here are your login credentials:</p>

            <div class="credentials-box">
              <div class="credential-item">
                <div class="credential-label">USERNAME / EMAIL</div>
                <div class="credential-value">${escapeHtml(email)}</div>
              </div>
              <div class="credential-item">
                <div class="credential-label">PASSWORD</div>
                <div class="credential-value">${escapeHtml(password)}</div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${escapeHtml(loginUrl)}" class="cta-button">Sign In Now →</a>
            </div>

            <div class="security-note">
              <strong>🔒 Security Reminder:</strong> Keep your password safe and never share it with anyone. If you didn't create this account, please contact your administrator immediately.
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Click the button above to go to Memo Pro</li>
              <li>Enter your email and password</li>
              <li>Update your profile if needed</li>
              <li>Start tracking your attendance and productivity</li>
            </ul>

            <p>If you have any questions or need assistance, please contact your supervisor or administrator.</p>
          </div>

          <div class="footer">
            <p>&copy; 2026 Memo Pro - Workforce Management System. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

// 🛡️ تجنب XSS attacks
function escapeHtml(text: string): string {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}
