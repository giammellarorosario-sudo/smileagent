/**
 * Google Calendar Service
 * Handles Calendar API operations for SmileAgent
 * @module services/calendar
 */

const { google } = require('googleapis');
require('dotenv').config();

// OAuth2 Configuration (condivisa con Gmail)
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/auth/gmail/callback';

// Calendar Settings
const CALENDAR_TIMEZONE = 'Europe/Rome';

class CalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.isAuthenticated = false;
  }

  /**
   * Genera URL di autenticazione OAuth2 (include Calendar scope)
   * @returns {String} Authorization URL
   */
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Imposta credenziali OAuth2 da authorization code
   * @param {String} code - Authorization code from OAuth2 flow
   * @returns {Promise<Object>} Tokens
   */
  async setCredentialsFromCode(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      this.isAuthenticated = true;

      return {
        success: true,
        tokens: tokens
      };
    } catch (error) {
      console.error('Error setting credentials:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Imposta credenziali da tokens salvati
   * @param {Object} tokens - Saved OAuth2 tokens
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
    this.isAuthenticated = true;
  }

  /**
   * Crea appuntamento su Google Calendar
   * @param {String} patientEmail - Email paziente
   * @param {String} patientName - Nome paziente
   * @param {String} dateTime - Data/ora appuntamento ISO (es: 2025-03-15T14:30:00)
   * @param {String} description - Descrizione appuntamento
   * @param {Number} duration - Durata in minuti (default: 60)
   * @returns {Promise<Object>} Event creation result
   */
  async createAppointment(patientEmail, patientName, dateTime, description = '', duration = 60) {
    try {
      if (!this.isAuthenticated) {
        return {
          success: false,
          error: 'Calendar not authenticated'
        };
      }

      // Calcola end time
      const startDate = new Date(dateTime);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      // Costruisci evento
      const event = {
        summary: `Appuntamento - ${patientName}`,
        description: description || `Appuntamento con paziente ${patientName}\n\nCreato automaticamente da SmileAgent AI`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: CALENDAR_TIMEZONE
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: CALENDAR_TIMEZONE
        },
        attendees: [
          { email: patientEmail, displayName: patientName },
          { email: 'smileagent.italia@gmail.com' }
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 giorno prima
            { method: 'popup', minutes: 60 }, // 1 ora prima
            { method: 'popup', minutes: 30 }  // 30 minuti prima
          ]
        },
        colorId: '10', // Verde per appuntamenti medici
        conferenceData: {
          createRequest: {
            requestId: `smileagent-${Date.now()}`
          }
        }
      };

      // Crea evento
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all' // Invia notifica agli attendees
      });

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
        startTime: response.data.start.dateTime,
        endTime: response.data.end.dateTime,
        summary: response.data.summary
      };

    } catch (error) {
      console.error('Error creating calendar event:', error);
      return {
        success: false,
        error: error.message,
        details: error.errors || []
      };
    }
  }

  /**
   * Lista appuntamenti
   * @param {Number} daysAhead - Giorni futuri da includere (default: 30)
   * @param {Number} maxResults - Max events (default: 50)
   * @returns {Promise<Array>} List of events
   */
  async listAppointments(daysAhead = 30, maxResults = 50) {
    try {
      if (!this.isAuthenticated) {
        return {
          success: false,
          error: 'Calendar not authenticated'
        };
      }

      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const events = response.data.items || [];

      return {
        success: true,
        events: events.map(event => ({
          id: event.id,
          summary: event.summary,
          description: event.description,
          startTime: event.start.dateTime || event.start.date,
          endTime: event.end.dateTime || event.end.date,
          attendees: event.attendees || [],
          link: event.htmlLink
        })),
        count: events.length
      };

    } catch (error) {
      console.error('Error listing events:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancella appuntamento
   * @param {String} eventId - Event ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteAppointment(eventId) {
    try {
      if (!this.isAuthenticated) {
        return {
          success: false,
          error: 'Calendar not authenticated'
        };
      }

      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all' // Notifica cancellazione
      });

      return {
        success: true,
        message: 'Appointment deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Aggiorna appuntamento
   * @param {String} eventId - Event ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Update result
   */
  async updateAppointment(eventId, updates) {
    try {
      if (!this.isAuthenticated) {
        return {
          success: false,
          error: 'Calendar not authenticated'
        };
      }

      // Prima recupera evento esistente
      const existing = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId
      });

      // Merge updates
      const updatedEvent = {
        ...existing.data,
        ...updates
      };

      // Aggiorna evento
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: updatedEvent,
        sendUpdates: 'all' // Notifica modifiche
      });

      return {
        success: true,
        event: response.data
      };

    } catch (error) {
      console.error('Error updating event:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trova slot disponibili
   * @param {String} date - Data (YYYY-MM-DD)
   * @param {Number} durationMinutes - Durata appuntamento
   * @returns {Promise<Array>} Available time slots
   */
  async findAvailableSlots(date, durationMinutes = 60) {
    try {
      // Orari studio (configurabili)
      const workHours = {
        start: 9, // 9:00
        end: 18,  // 18:00
        lunchStart: 13, // 13:00
        lunchEnd: 14   // 14:00
      };

      // Lista eventi del giorno
      const startOfDay = new Date(`${date}T00:00:00`);
      const endOfDay = new Date(`${date}T23:59:59`);

      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      const busySlots = response.data.items || [];

      // Genera slot disponibili
      const availableSlots = [];
      let currentHour = workHours.start;

      while (currentHour < workHours.end) {
        // Skip lunch break
        if (currentHour >= workHours.lunchStart && currentHour < workHours.lunchEnd) {
          currentHour++;
          continue;
        }

        const slotStart = new Date(`${date}T${String(currentHour).padStart(2, '0')}:00:00`);
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

        // Check se slot è libero
        const isBusy = busySlots.some(event => {
          const eventStart = new Date(event.start.dateTime || event.start.date);
          const eventEnd = new Date(event.end.dateTime || event.end.date);

          return (slotStart < eventEnd && slotEnd > eventStart);
        });

        if (!isBusy) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            label: `${String(currentHour).padStart(2, '0')}:00 - ${String(currentHour).padStart(2, '0')}:${String(durationMinutes).padStart(2, '0')}`
          });
        }

        currentHour++;
      }

      return {
        success: true,
        date: date,
        availableSlots: availableSlots,
        count: availableSlots.length
      };

    } catch (error) {
      console.error('Error finding available slots:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = CalendarService;
