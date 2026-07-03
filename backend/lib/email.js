const sendEmail = async (to, subject, html) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('Skipping email send: RESEND_API_KEY not configured.');
    return;
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Meridian <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      })
    });
    const data = await response.json();
    console.log('Resend Email Response:', data);
  } catch (error) {
    console.error('Error sending email via Resend:', error.message);
  }
};

module.exports = { sendEmail };
