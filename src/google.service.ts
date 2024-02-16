// meeting.service.ts

import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleMeetService {
  private calendar: any;



  constructor() {

    const credentials = require('../googleapis.json');
    const auth = new google.auth.GoogleAuth({
      credentials,

      scopes: ['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/plus.login'],
    });

    this.calendar = google.calendar({
      version: 'v3',
      auth: auth, // Your authenticated Google API client
    });
  }

  async createMeeting(): Promise<string> {
    try {
      const event = await this.calendar.events.insert({
        calendarId: 'primary', // Or specify your calendar ID
        conferenceDataVersion: 1,
        resource: {
          summary: "hey",
          start: { 
            dateTime: "2024-02-15T09:00:00-07:00",
          },
          end: {
            dateTime: "2024-02-15T09:00:00-08:00",
          },
         
          conferenceData: {
            createRequest: { requestId: 'hsgdgsdg',conferenceSolutionKey: { type: 'eventNamedHangout' },}
          },
          visibility: 'public', // Set the visibility to public

        },
      });

      // Extract Google Meet link
      const meetingLink = event.data.hangoutLink;
      console.log(meetingLink,event.data);
      return meetingLink;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw new Error('Error creating meeting');
    }
  }
}
