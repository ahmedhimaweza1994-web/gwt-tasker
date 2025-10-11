import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings?.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-calendar',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

export async function getUncachableGoogleCalendarClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function createGoogleMeetEvent(title: string, description: string, startTime: Date, endTime: Date) {
  try {
    const calendar = await getUncachableGoogleCalendarClient();
    
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Riyadh',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Riyadh',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event,
    });

    return {
      meetingLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri,
      eventId: response.data.id,
      eventLink: response.data.htmlLink
    };
  } catch (error) {
    console.error('Error creating Google Meet event:', error);
    throw new Error('فشل في إنشاء رابط Google Meet');
  }
}
