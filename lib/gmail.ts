/**
 * lib/gmail.ts — Client Gmail API (OAuth2)
 * Utilisé pour l'envoi des séquences depuis contact@lihtea.com
 */

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.GMAIL_REDIRECT_URI!;

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// ─── URL d'autorisation ───────────────────────────────────────────

export function getGmailAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: "code",
    scope:         SCOPES,
    access_type:   "offline",
    prompt:        "consent", // force refresh_token à chaque fois
    ...(state ? { state } : {}),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ─── Échange code → tokens ────────────────────────────────────────

export type GmailTokens = {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    Date;
  email:        string;
};

export async function exchangeCodeForTokens(code: string): Promise<GmailTokens> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
      grant_type:    "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail token exchange failed: ${err}`);
  }

  const data = await res.json();

  // Récupère l'email associé au token
  const emailRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const { email } = await emailRes.json();

  return {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    new Date(Date.now() + data.expires_in * 1000),
    email,
  };
}

// ─── Rafraîchissement de l'access token ──────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt:   Date;
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail token refresh failed: ${err}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt:   new Date(Date.now() + data.expires_in * 1000),
  };
}

// ─── Obtenir un access token valide (auto-refresh) ───────────────

export async function getValidAccessToken(account: {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    Date;
}): Promise<string> {
  // Si le token expire dans moins de 5 minutes, on rafraîchit
  if (new Date(account.expiresAt).getTime() - Date.now() < 5 * 60 * 1000) {
    const { accessToken } = await refreshAccessToken(account.refreshToken);
    return accessToken;
  }
  return account.accessToken;
}

// ─── Envoi d'un email via Gmail API ──────────────────────────────

export type SendEmailOptions = {
  accessToken: string;
  from:        string; // ex : "Lihtea <contact@lihtea.com>"
  to:          string;
  subject:     string;
  html:        string;
  threadId?:   string; // pour répondre dans un thread existant
};

export type SendEmailResult = {
  messageId: string;
  threadId:  string;
};

export async function sendGmailEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  // Construit le message RFC 2822 encodé en base64url
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
  ].join("\r\n");

  const raw = `${headers}\r\n\r\n${opts.html}`;
  const encoded = Buffer.from(raw).toString("base64url");

  const body: Record<string, string> = { raw: encoded };
  if (opts.threadId) body.threadId = opts.threadId;

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed: ${err}`);
  }

  const data = await res.json();
  return { messageId: data.id, threadId: data.threadId };
}

// ─── Vérification des réponses dans un thread ─────────────────────

export type GmailReply = {
  messageId: string;
  threadId:  string;
  from:      string;
  date:      Date;
  snippet:   string;
};

export async function checkThreadForReplies(
  accessToken: string,
  threadId:    string,
  ourEmail:    string
): Promise<GmailReply[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) return [];

  const thread = await res.json();
  const messages = thread.messages ?? [];

  // On garde uniquement les messages qui ne viennent pas de nous
  return messages
    .filter((m: any) => {
      const from = m.payload?.headers?.find((h: any) => h.name === "From")?.value ?? "";
      return !from.includes(ourEmail);
    })
    .map((m: any) => {
      const from = m.payload?.headers?.find((h: any) => h.name === "From")?.value ?? "";
      const date = m.payload?.headers?.find((h: any) => h.name === "Date")?.value;
      return {
        messageId: m.id,
        threadId:  thread.id,
        from,
        date:      date ? new Date(date) : new Date(),
        snippet:   m.snippet ?? "",
      };
    });
}

// ─── Conversion markdown → contenu HTML ──────────────────────────

function parseMarkdownBody(md: string): string {
  return md
    .split("\n\n")
    .map((para) => {
      para = para.trim();
      if (!para) return "";

      if (para.startsWith("# "))  return `<h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a;">${para.slice(2).trim()}</h2>`;
      if (para.startsWith("## ")) return `<h3 style="margin:0 0 6px;font-size:16px;font-weight:600;color:#0f172a;">${para.slice(3).trim()}</h3>`;

      const lines = para
        .split("\n")
        .map((l) =>
          l
            .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#0f172a;">$1</strong>')
            .replace(/\*(.+?)\*/g,     '<em>$1</em>')
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#0d9488;text-decoration:none;font-weight:500;">$1</a>')
        )
        .join("<br>");

      return `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.7;">${lines}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

// ─── Template email fintech premium ──────────────────────────────

export function markdownToHtml(
  md: string,
  vars: Record<string, string> = {},
  opts: { senderName?: string; senderTitle?: string; senderEmail?: string } = {}
): string {
  // 1. Remplace les variables {{key}}
  const text = md.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);

  // 2. Convertit le markdown en HTML
  const body = parseMarkdownBody(text);

  // 3. Infos expéditeur
  const senderName  = opts.senderName  ?? vars["senderName"]  ?? "L'équipe Lihtea";
  const senderTitle = opts.senderTitle ?? vars["senderTitle"] ?? "";
  const senderEmail = opts.senderEmail ?? vars["senderEmail"] ?? "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header logo -->
          <tr>
            <td style="padding:0 0 8px 0;" align="left">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0d9488;border-radius:8px;padding:6px 14px;">
                    <span style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.5px;">LIHTEA</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card principale -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04);overflow:hidden;">

              <!-- Barre accent top -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,#0d9488 0%,#14b8a6 60%,#5eead4 100%);"></td>
                </tr>
              </table>

              <!-- Contenu -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 48px 32px;">
                    ${body}
                  </td>
                </tr>
              </table>

              <!-- Séparateur -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 48px;">
                    <div style="height:1px;background:#e2e8f0;"></div>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 48px 32px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Avatar initiale -->
                        <td style="vertical-align:top;padding-right:14px;">
                          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0d9488,#0f766e);display:flex;align-items:center;justify-content:center;">
                            <span style="color:#ffffff;font-size:16px;font-weight:700;line-height:40px;display:block;text-align:center;">${senderName.charAt(0).toUpperCase()}</span>
                          </div>
                        </td>
                        <td style="vertical-align:top;">
                          <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${senderName}</p>
                          ${senderTitle ? `<p style="margin:2px 0 0;font-size:12px;color:#64748b;">${senderTitle}</p>` : ""}
                          ${senderEmail ? `<p style="margin:4px 0 0;font-size:12px;color:#0d9488;">${senderEmail}</p>` : ""}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 0 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                Vous recevez cet email car vous êtes en contact avec l'équipe Lihtea.<br>
                <a href="mailto:${senderEmail || 'contact@lihtea.com'}" style="color:#0d9488;text-decoration:none;">Se désinscrire</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
