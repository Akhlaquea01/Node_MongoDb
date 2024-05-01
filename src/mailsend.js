import { sendEmail } from './utils/email.js';

const mailOptions = {
    from: 'masticode14@gmail.com',
    to: 'akhlaquea01@gmail.com',
    subject: 'Hello from Node.js',
    text: 'Hello, this is a test email sent from Node.js',
    html: '<b>Hello, this is a test email sent from <i>Node.js</i></b>'
};

sendEmail(mailOptions);