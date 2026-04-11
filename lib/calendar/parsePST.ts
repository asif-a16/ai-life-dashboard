import { PSTFile, PSTFolder, PSTMessage } from 'pst-extractor'
// PSTAppointment is not exported from the index; import directly from the class file
import { PSTAppointment } from 'pst-extractor/dist/PSTAppointment.class'
import type { CalendarEvent } from '@/lib/types'

type ParsedCalendarEvent = Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>

function walkFolder(folder: PSTFolder, now: Date, cutoff: Date, results: ParsedCalendarEvent[]): void {
  if (folder.contentCount > 0) {
    let message: PSTMessage | null = folder.getNextChild()
    while (message !== null) {
      if (message instanceof PSTAppointment) {
        const appt = message
        if (!appt.isRecurring && appt.startTime && appt.startTime > now && appt.startTime <= cutoff) {
          const uid = `pst-${appt.subject ?? 'unknown'}-${appt.startTime.toISOString()}`
          results.push({
            title: appt.subject || 'Untitled',
            description: appt.body || null,
            location: appt.location || null,
            start_at: appt.startTime.toISOString(),
            end_at: appt.endTime ? appt.endTime.toISOString() : null,
            ics_uid: uid,
          })
        }
      }
      message = folder.getNextChild()
    }
  }

  if (folder.hasSubfolders) {
    const subfolders = folder.getSubFolders()
    for (const subfolder of subfolders) {
      walkFolder(subfolder, now, cutoff, results)
    }
  }
}

export function parsePST(buffer: Buffer): ParsedCalendarEvent[] {
  try {
    const pstFile = new PSTFile(buffer)
    const now = new Date()
    const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    const results: ParsedCalendarEvent[] = []
    walkFolder(pstFile.getRootFolder(), now, cutoff, results)
    return results
  } catch {
    return []
  }
}
