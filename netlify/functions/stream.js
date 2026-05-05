const { google } = require('googleapis');

exports.handler = async (event) => {
  const fileId = event.queryStringParameters?.fileId;

  if (!fileId) {
    return { statusCode: 400, body: 'fileId manquant' };
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    return {
      statusCode: 302,
      headers: {
        'Location': driveUrl,
        'Authorization': `Bearer ${token.token}`,
        'Access-Control-Allow-Origin': '*',
      },
      body: '',
    };
  } catch (err) {
    return { statusCode: 500, body: `Erreur: ${err.message}` };
  }
};
