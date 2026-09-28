import { env, isProviderConfigured } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Development provider: logs to the server console. Never sends anything
 * externally — safe default when RESEND_API_KEY is missing.
 */
class MockEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(
      `\n[email:mock] To: ${message.to}\nSubject: ${message.subject}\n${message.text}\n`,
    );
  }
}

class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  async send(message: EmailMessage): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.email.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend API error ${response.status}`);
    }
  }
}

let provider: EmailProvider | null = null;

function getProvider(): EmailProvider {
  if (provider) return provider;
  if (env.email.provider === "resend" && isProviderConfigured("email")) {
    provider = new ResendEmailProvider(env.email.resendApiKey!);
  } else {
    if (env.email.provider === "resend") {
      console.warn("[email] EMAIL_PROVIDER=resend but RESEND_API_KEY missing — falling back to mock");
    }
    provider = new MockEmailProvider();
  }
  return provider;
}

/**
 * Sends a transactional email through the configured provider.
 * Failures are logged, never thrown — email delivery must not break
 * primary user flows (registration, password reset, etc.).
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  try {
    await getProvider().send(message);
  } catch (error) {
    console.error("[email] send failed", {
      to: message.to,
      subject: message.subject,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
