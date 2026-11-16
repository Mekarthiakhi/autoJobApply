import { google } from 'googleapis';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class CalendarService {
  private oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  constructor() {}

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
    });
  }

  async setCredentials(code: string): Promise<any> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (error) {
      logger.error('Failed to get calendar tokens', error);
      throw error;
    }
  }

  async scheduleInterview(
    tokens: any,
    summary: string,
    description: string,
    startTime: Date,
    endTime: Date
  ) {
    try {
      this.oauth2Client.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      const event = {
        summary,
        description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC', // Use user's time zone in production
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      logger.info(`Scheduled interview: ${response.data.htmlLink}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to schedule interview in calendar', error);
      throw error;
    }
  }
}

export const calendarService = new CalendarService();
