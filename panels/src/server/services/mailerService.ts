// Servicio de envío de correos SMTP directo
import nodemailer from 'nodemailer';

const EMAIL_SERVER = process.env.EMAIL_SERVER || 'mail.cesarreyesjaramillo.com';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '465', 10);
const EMAIL_USER = process.env.EMAIL_USER || 'menuobjetivo@cesarreyesjaramillo.com';
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'CN0Cf9Cwhkcs';

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: EMAIL_SERVER,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465, // true para 465 (SSL)
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return _transporter;
}

export async function enviarEmailOTP(emailDestino: string, codigoOTP: string): Promise<void> {
  const transporter = getTransporter();

  const mailOptions = {
    from: `"LibreríaQR Admin" <${EMAIL_USER}>`,
    to: emailDestino,
    subject: `Tu código de acceso es: ${codigoOTP} — LibreríaQR`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #0f111a; color: #ffffff; padding: 40px 20px; border-radius: 12px; max-width: 520px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #22c55e; margin: 0; font-size: 24px;">LibreríaQR</h2>
          <p style="color: #a1a1aa; font-size: 14px; margin-top: 4px;">Acceso de Operador / Superadmin</p>
        </div>
        
        <div style="background-color: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 28px 24px; text-align: center;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #e4e4e7;">Usa el siguiente código de 6 dígitos para ingresar al sistema:</p>
          
          <div style="display: inline-block; background-color: #22c55e; color: #000000; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 12px 28px; border-radius: 10px; margin-bottom: 16px;">
            ${codigoOTP}
          </div>
          
          <p style="margin: 0; font-size: 12px; color: #71717a;">Este código es válido por 10 minutos. No lo compartas con nadie.</p>
        </div>

        <p style="text-align: center; color: #52525b; font-size: 11px; margin-top: 24px;">
          Si no solicitaste este acceso, puedes ignorar este mensaje.
        </p>
      </div>
    `,
    text: `Tu código de acceso a LibreríaQR es: ${codigoOTP}. Válido por 10 minutos.`,
  };

  await transporter.sendMail(mailOptions);
}
