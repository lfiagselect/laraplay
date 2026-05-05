const { google } = require('googleapis');

exports.handler = async (event) => {
  const fileId = event.queryStringParameters?.fileId;

  if (!fileId) {
    return { statusCode: 400, body: 'fileId manquant' };
  }

  try {
    const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    const credentials = JSON.parse(json);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    const driveResponse = await fetch(driveUrl, {
      headers: { 'Authorization': `Bearer ${token}` },
      redirect: 'follow',
    });

    if (!driveResponse.ok) {
      return { statusCode: driveResponse.status, body: `Erreur Drive: ${driveResponse.status}` };
    }

    const buffer = await driveResponse.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': driveResponse.headers.get('Content-Type') || 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
    };

  } catch (err) {
    return { statusCode: 500, body: `Erreur: ${err.message}` };
  }
};
