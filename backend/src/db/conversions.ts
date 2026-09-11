import { supabase } from '../lib/supabase.js';
import type { ConfirmationType, Conversion } from '../types/index.js';

export async function createConversion(input: {
  sessionId: string;
  confirmationType: ConfirmationType;
  orderIdSelfReported?: string;
  sellerWebhookPayload?: unknown;
}): Promise<Conversion> {
  const { data, error } = await supabase
    .from('conversions')
    .insert({
      session_id: input.sessionId,
      confirmation_type: input.confirmationType,
      order_id_self_reported: input.orderIdSelfReported ?? null,
      seller_webhook_payload: input.sellerWebhookPayload ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Conversion;
}

export async function markConversionScheduled(id: string, scheduleId: string): Promise<void> {
  const { error } = await supabase.from('conversions').update({ bonus_schedule_id: scheduleId }).eq('id', id);
  if (error) throw error;
}

export async function markConversionPaid(id: string, payoutTxId: string): Promise<void> {
  const { error } = await supabase
    .from('conversions')
    .update({ status: 'paid', bonus_payout_tx_id: payoutTxId })
    .eq('id', id);
  if (error) throw error;
}

export async function markConversionCancelled(id: string): Promise<void> {
  const { error } = await supabase.from('conversions').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

export async function getConversionById(id: string): Promise<Conversion | null> {
  const { data, error } = await supabase.from('conversions').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Conversion | null;
}
