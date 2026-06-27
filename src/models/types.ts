/**
 * Plain data models shared between screens, repositories, and stores.
 * Ported from the mobile app's `src/models/types.ts`; the desktop detail
 * panel needs a few extra optional fields (see `Medication`).
 *
 * No seed data lives here — see `src/data/` for that.
 */

/** Care-flow status used by medications and appointments. */
export type CareStatus =
  | 'taken'
  | 'confirmed'
  | 'reminderSet'
  | 'dueSoon'
  | 'missed'
  | 'scheduled';

export interface Medication {
  readonly id: string;
  readonly name: string;
  readonly dose: string;
  readonly schedule: string;
  readonly instructions: string;
  readonly status: CareStatus;
  /**
   * When the user last marked this medication as taken (ms since epoch).
   * `null` means it has never been logged. Set by `markTaken`.
   */
  readonly lastTakenAt: number | null;

  // --- Desktop detail-panel fields (optional; absent on the mobile model) ---
  /** e.g. "Blood pressure" — shown next to the schedule in the detail header. */
  readonly category?: string;
  /** Short due/time label for the master-list pill, e.g. "8:00 AM · Daily". */
  readonly timeLabel?: string;
  /** Refill countdown, e.g. "12 days left". */
  readonly refill?: string;
  /** 7-day adherence summary, e.g. "6 of 7". */
  readonly adherence?: string;
  /** Prescribing clinician, e.g. "Dr. Park". */
  readonly prescriber?: string;
  /** Human label for when a completed med was taken, e.g. "7:30 AM". */
  readonly takenAtLabel?: string;
}

export interface Appointment {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly badge: string;
  readonly badgeTone: 'soon' | 'later';
}

export interface MessagePreview {
  readonly id: string;
  readonly from: string;
  readonly preview: string;
  readonly unread: boolean;
}

export interface StatCard {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly tone: 'amber' | 'teal' | 'neutral';
}
