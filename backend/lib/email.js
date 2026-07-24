const sendEmail = async (to, subject, html) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log('Skipping email send: BREVO_API_KEY not configured.');
    return;
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'info@meridian.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Meridian';

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail
        },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    const data = await response.json();
    console.log('Brevo Email Response:', data);
  } catch (error) {
    console.error('Error sending email via Brevo:', error.message);
  }
};

module.exports = { sendEmail };
