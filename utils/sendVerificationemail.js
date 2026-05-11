import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
export const sendVerificationEmail = async ( email,username,verifycode) => {
    try {
    const transport = nodemailer.createTransport({
      service: "gmail",
      secure: true,
      port: 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log(process.env.EMAIL_USER, process.env.EMAIL_PASS);

    const mailOptions = {
      from: `Resume Ranker <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Resume Ranker || Verification Code",
      html: `
      <section style="font-family: Arial, sans-serif; color: #333;">
        <h2>Hello ${username},</h2>
        <p>Thank you for registering. Please use the following verification code to complete your registration:</p>
        <p style="font-weight: bold; font-size: 1.5em; color: #4CAF50;">${verifycode}</p>
        <p>If you did not request this code, please ignore this email.</p>
      </section>
      `,
    };
    console.log("here");
    
    const mailResponse = await transport.sendMail(mailOptions);
    console.log("here2");
    console.log("Email sent successfully:", mailResponse);

    return {
      success: true,
      message: "Verification email sent successfully",
    };
  } catch (error) {
    console.error("Error in sending verification email:", error.message || error);
    console.log(email, username, verifycode);
    
    return {
      success: false,
      message: "Cannot send verification email",
    };
  }
}