// Africa's Talking SMS integration
// Sign up at africastalking.com to get credentials
const sendSMS = async (phone, message) => {
  try {
    // TODO: Replace with real credentials when you sign up
    const username = process.env.AT_USERNAME;
    const apiKey = process.env.AT_API_KEY;

    if (!username || !apiKey) {
      // SMS not configured yet — just log the message
      console.log(`[SMS SIMULATION] To: ${phone} | Message: ${message}`);
      return { success: true, simulated: true };
    }

    // Real Africa's Talking integration (activates when credentials are added)
    const AfricasTalking = require('africastalking')({
      username,
      apiKey
    });

    const sms = AfricasTalking.SMS;
    const result = await sms.send({
      to: [phone],
      message,
      from: 'HKCS'
    });

    console.log('SMS sent:', result);
    return { success: true, result };

  } catch (error) {
    console.error('SMS error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendSMS };