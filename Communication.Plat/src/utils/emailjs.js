import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_pkfwzf6';
const TEMPLATE_ID = 'template_vogmagi';
const PUBLIC_KEY = 'swg7ncndMcO1VVHN7';

// Initialize EmailJS
emailjs.init(PUBLIC_KEY);

export const sendOtpEmail = async (toEmail, otpCode) => {
  try {
    const templateParams = {
      email: toEmail,
      passcode: otpCode,
    };
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
    return response;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
