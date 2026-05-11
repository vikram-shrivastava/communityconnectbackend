import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const sendVerificationEmail = async (email, username, verifycode) => {
  try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      port: 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // 🌟 ADDED STRICT TIMEOUTS: Prevents the "infinite loading" bug in production
      connectionTimeout: 10000, 
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    const mailOptions = {
      from: `Kayasth Connect <${process.env.EMAIL_USER}>`, // 🌟 FIXED BRANDING
      to: email,
      subject: "Kayasth Connect || Verification Code",
      html: `
      <section style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hello ${username},</h2>
        <p>Thank you for registering. Please use the following verification code to complete your registration:</p>
        <p style="font-weight: bold; font-size: 1.5em; color: #f97316;">${verifycode}</p>
        <p>If you did not request this code, please ignore this email.</p>
      </section>
      `,
    };
    
    const mailResponse = await transport.sendMail(mailOptions);
    console.log("Email sent successfully:", mailResponse.messageId);

    return {
      success: true,
      message: "Verification email sent successfully",
    };
  } catch (error) {
    console.error("Error in sending verification email:", error.message || error);
    
    return {
      success: false,
      message: "Cannot send verification email",
    };
  }
}