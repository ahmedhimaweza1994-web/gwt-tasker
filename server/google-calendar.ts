import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import type { GoogleCalendarToken } from '@shared/schema';

// Google OAuth 2.0 Configuration
// These will be stored as environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google-calendar/callback';

// Create OAuth2 client
export function getOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

// Generate authorization URL for user to consent
export function getAuthorizationUrl(): string {
  const oauth2Client = getOAuth2Client();
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Important: get refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token every time
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get access token or refresh token');
  }
  
  // Calculate expiration time
  const expiresAt = new Date();
  if (tokens.expiry_date) {
    expiresAt.setTime(tokens.expiry_date);
  } else {
    // Default to 1 hour from now
    expiresAt.setHours(expiresAt.getHours() + 1);
  }
  
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    scope: tokens.scope || 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
  };
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  
  const { credentials } = await oauth2Client.refreshAccessToken();
  
  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token');
  }
  
  const expiresAt = new Date();
  if (credentials.expiry_date) {
    expiresAt.setTime(credentials.expiry_date);
  } else {
    expiresAt.setHours(expiresAt.getHours() + 1);
  }
  
  return {
    accessToken: credentials.access_token,
    expiresAt,
  };
}

// Get authenticated Google Calendar client for a user
export async function getCalendarClient(tokenData: GoogleCalendarToken) {
  const oauth2Client = getOAuth2Client();
  
  // Check if token is expired
  const now = new Date();
  if (tokenData.expiresAt <= now) {
    // Token expired, refresh it
    const { accessToken, expiresAt } = await refreshAccessToken(tokenData.refreshToken);
    
    // Return the new tokens so they can be saved to database
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: tokenData.refreshToken,
    });
    
    return {
      calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
      updatedTokens: { accessToken, expiresAt },
    };
  }
  
  // Token still valid
  oauth2Client.setCredentials({
    access_token: tokenData.accessToken,
    refresh_token: tokenData.refreshToken,
  });
  
  return {
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
    updatedTokens: null,
  };
}

// Create Google Meet event
export async function createGoogleMeetEvent(
  tokenData: GoogleCalendarToken,
  title: string,
  description: string,
  startTime: Date,
  endTime: Date
) {
  const { calendar, updatedTokens } = await getCalendarClient(tokenData);
  
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
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: event,
  });

  return {
    meetingLink: response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri,
    eventId: response.data.id,
    eventLink: response.data.htmlLink,
    updatedTokens, // Return updated tokens if they were refreshed
  };
}
