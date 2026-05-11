import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();
// Initialize with your API key from the Resend dashboard
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email, username, verifycode) => {
  try {
    const { data, error } = await resend.emails.send({
      // This must be a domain you own and verified in Resend
      from: 'Kayasth Connect <onboarding@mail.vikramshrivastav.app>', 
      to: [email],
      subject: 'Kayasth Connect || Verification Code',
      html: `
      <section style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hello ${username},</h2>
        <p>Thank you for registering. Please use the following verification code to complete your registration:</p>
        <p style="font-weight: bold; font-size: 1.5em; color: #f97316;">${verifycode}</p>
        <p>If you did not request this code, please ignore this email.</p>
      </section>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return { success: false, message: "Cannot send verification email" };
    }

    console.log("Email sent successfully:", data.id);
    return { success: true, message: "Verification email sent successfully" };

  } catch (error) {
    console.error("Unexpected error sending email:", error);
    return { success: false, message: "Cannot send verification email" };
  }
}