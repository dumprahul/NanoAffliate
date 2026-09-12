import { Router } from 'express';
import { z } from 'zod';
import { getSessionById, setSessionStatus } from '../db/sessions.js';
import { getLinkById } from '../db/links.js';
import { submitHcsMessage } from '../hedera/hcs.js';
import { supabase } from '../lib/supabase.js';

export const sessionLifecycleRouter = Router();

const endSessionSchema = z.object({ session_id: z.string().uuid() });

/** Explicit "ending" ping — architecture §6.5 option 1 (beforeunload/pagehide, via sendBeacon). */
sessionLifecycleRouter.post('/session-end', async (req, res, next) => {
  try {
    const body = endSessionSchema.parse(req.body);
    await endSession(body.session_id, 'explicit_end');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export async function endSession(sessionId: string, reason: string): Promise<void> {
  const session = await getSessionById(sessionId);
  if (!session || session.status === 'ended') return;

  const link = await getLinkById(session.link_id);
  const endedAt = new Date().toISOString();

  await setSessionStatus(sessionId, 'ended', { ended_at: endedAt, end_reason: reason });

  const { count } = await supabase
    .from('ticks')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId);
  const { data: totalPaidRows } = await supabase.from('ticks').select('amount_paid').eq('session_id', sessionId);
  const totalPaid = (totalPaidRows ?? []).reduce((sum, row) => sum + Number(row.amount_paid ?? 0), 0);

  if (link) {
    await submitHcsMessage(link.hcs_topic_id, {
      type: 'session_end',
      session_id: sessionId,
      total_ticks: count ?? 0,
      total_paid: totalPaid,
      end_reason: reason,
    });
  }
}
