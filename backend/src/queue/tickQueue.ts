/**
 * BullMQ tick scheduler + worker — architecture/README.md §12.2.
 * Every 5s, enqueue one "score-session" job per active session; a worker
 * runs the Oracle -> payout flow.
 *
 * TODO: implement once Supabase `sessions` and the Oracle route are wired
 * (build order steps 6-7).
 */
export {};
