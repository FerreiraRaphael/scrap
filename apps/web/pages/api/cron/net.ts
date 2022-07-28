// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Boleto, Tipo } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next'
import { format } from 'date-fns';
import { prisma } from '~/server/globals/prisma';
import { getBoletoNet } from '~/server/lib/gmail/gmail';
import { middleware, WithCtx } from './_middlaware';

export default async function handler(
  req: WithCtx<NextApiRequest>,
  res: NextApiResponse<Boleto[]>
) {
  try {
    await middleware(req);
    if (!req.ctx?.gmail) {
      throw new Error('No google instance');
    }
    const [lastBoleto] = await prisma.boleto.findMany({
      orderBy: [{ sendAt: 'desc' }],
      take: 1,
      where: {
        tipo: Tipo.NET,
      }
    });
    const boletos = await getBoletoNet(req.ctx.gmail, lastBoleto?.sendAt);
    await prisma.boleto.createMany({
      data: boletos,
    });
    const boletosData = await prisma.boleto.findMany({
      where: {
        tipo: Tipo.NET,
        sendAt: {
          gt: lastBoleto?.sendAt,
        }
      }
    });
    res.status(200).json((boletosData));
  } catch (e) {
    console.log(e)
    res.status(500).send([]);
  }
}
