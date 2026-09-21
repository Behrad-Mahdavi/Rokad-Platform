async function sendLiveTestSms() {
  const token = '8FBAE90F05E6ABE22310AEAD04925F74B16384BC';
  const targetPhone = '09152749367';
  const message = 'با سلام و احترام؛\nاین یک پیامک آزمایشی تایید اتصال وب‌سرویس آموت به سامانه هوشمند رکاد می‌باشد.\nموفق و پیروز باشید.';

  console.log(`📡 Sending Live SMS to ${targetPhone} with Mobiles as comma-separated string / single string...`);

  // Variant A: Mobiles as string "09152749367"
  try {
    const url = 'https://portal.amootsms.com/rest/SendSimple';
    const bodyPayload = {
      SendDateTime: '',
      SMSMessageText: message,
      LineNumber: '',
      Mobiles: targetPhone,
    };

    console.log('Sending payload with Mobiles as string...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token,
      },
      body: JSON.stringify(bodyPayload),
    });

    const data = await response.json();
    console.log('Amoot API Response (String Variant):', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('❌ Request error:', err.message);
  }
}

sendLiveTestSms();
