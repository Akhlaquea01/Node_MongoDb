import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASS_CODE
    }
});

export const sendEmail = async (mailOptions) => {
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
    } catch (error) {
      return res.status(500).json(
        new ApiResponse(500, undefined, "Something went wrong", error)
      );
    }
};

export const registrationEmail = ({ userName }) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome ${userName}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #fff;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #333;
        text-align: center;
      }
      p {
        color: #666;
      }
      .thanks {
        text-align: center;
        font-size: 24px;
        color: #00b300;
        margin-bottom: 30px;
      }
      .feedback {
        text-align: center;
        margin-top: 30px;
      }
      .feedback a {
        color: #0000ee;
        text-decoration: none;
      }
      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 20px auto;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <p class="thanks">Hi ${userName},</p>
      <p>We are grateful that you have registered for our service! As a token of appreciation, we want to say thank you!</p>
      <img src="https://static.vecteezy.com/system/resources/thumbnails/026/162/295/small/thank-you-colorful-card-illustration-vector.jpg" alt="Thanksgiving Image">
      <p>If you have any questions or feedback, please feel free to <a href="#">mail us</a>. We value your opinion!</p>
      <div class="feedback">
        <p>Thanks again!</p>
        <p>Akhlaque</p>
      </div>
    </div>
  </body>
  </html>
`;