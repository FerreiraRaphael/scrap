// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getBoletoNet } from '~/server/lib/gmail/gmail';
import { middleware } from './_middlaware';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string>
) {
  try {
    await middleware();
    await getBoletoNet()
    res.status(200).send('ok');
  } catch (e) {
    res.status(500).send('help');
  }
}
