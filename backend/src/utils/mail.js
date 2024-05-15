import nodemailer from "nodemailer";
import Mailgen from "mailgen";

const sendEmail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "salted",
    product: {
      name: "Stajane",
      link: "http//localhost:8000",
      logo: "",
      logoHeight: "30px",
      copyright: "Copyright © 2024 Stajane. All rights reserved.",
    },
  });

  const emailText = mailGenerator.generatePlaintext(options.mailgenContent);
  const emailHTML = mailGenerator.generate(options.mailgenContent);

  const transporter = nodemailer.createTransport({
    host: process.env.NODEMAILER_HOST,
    port: process.env.NODEMAILER_HOST_PORT,
    auth: {
      user: process.env.NODEMAILER_EMAIL_USER,
      pass: process.env.NODEMAILER_EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.NODEMAILER_EMAIL_USER,
    to: options.email,
    subject: options.subject,
    text: emailText,
    html: emailHTML,
  });
};

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro:
        "You have received this email because a password reset request for your account was received.",
      action: {
        instructions: "Click the button below to reset your password:",
        button: {
          color: "#EE3266",
          text: "Reset your password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export { sendEmail, forgotPasswordMailgenContent };
