import { sendEmail } from './utils/email.js';

const mailOptions = {
    from: 'masticode14@gmail.com',
    to: 'akhlaquea01@gmail.com',
    subject: 'Hello from Node',
    text: 'Hello, this is a test email sent from Node',
    html: '<b>Hello, this is a test email sent from <i>Node</i></b>'
};

sendEmail(mailOptions);