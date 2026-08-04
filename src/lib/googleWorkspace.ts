import { getGoogleAccessToken } from './googleAuth';

const API_HEADERS = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Google Calendar Services
export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

export const listCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('No Google Access Token found');

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=50&orderBy=startTime&singleEvents=true',
    { headers: API_HEADERS(token) }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(err.error?.message || 'Failed to fetch calendar events');
  }

  const data = await response.json();
  return data.items || [];
};

export const createCalendarEvent = async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('No Google Access Token found');

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: API_HEADERS(token),
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(err.error?.message || 'Failed to create calendar event');
  }

  return response.json();
};

// Google Chat Services
export interface ChatSpace {
  name: string; // "spaces/SPACE_ID"
  displayName?: string;
  type?: string;
}

export interface GoogleChatMessage {
  name: string;
  text: string;
  createTime: string;
  sender: {
    name: string;
    displayName?: string;
    avatarUrl?: string;
    type?: string;
  };
}

export const listChatSpaces = async (): Promise<ChatSpace[]> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('No Google Access Token found');

  const response = await fetch('https://chat.googleapis.com/v1/spaces', {
    headers: API_HEADERS(token)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(err.error?.message || 'Failed to fetch Chat spaces');
  }

  const data = await response.json();
  return data.spaces || [];
};

export const listChatMessages = async (spaceName: string): Promise<GoogleChatMessage[]> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('No Google Access Token found');

  const response = await fetch(
    `https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=50`,
    { headers: API_HEADERS(token) }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(err.error?.message || 'Failed to fetch Chat messages');
  }

  const data = await response.json();
  return data.messages || [];
};

export const sendChatMessage = async (spaceName: string, text: string): Promise<GoogleChatMessage> => {
  const token = getGoogleAccessToken();
  if (!token) throw new Error('No Google Access Token found');

  const response = await fetch(
    `https://chat.googleapis.com/v1/${spaceName}/messages`,
    {
      method: 'POST',
      headers: API_HEADERS(token),
      body: JSON.stringify({ text })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(err.error?.message || 'Failed to send Google Chat message');
  }

  return response.json();
};
