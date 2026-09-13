import { Router } from 'express';
import { z } from 'zod';
import { createCreator } from '../db/creators.js';

export const creatorsRouter = Router();

const createCreatorSchema = z.object({
  hedera_account_id: z.string().min(3),
  world_nullifier: z.string().optional(),
});

creatorsRouter.post('/creators', async (req, res, next) => {
  try {
    const body = createCreatorSchema.parse(req.body);
    const creator = await createCreator({
      hederaAccountId: body.hedera_account_id,
      worldNullifier: body.world_nullifier,
    });
    res.status(201).json({ creator });
  } catch (err) {
    next(err);
  }
});
