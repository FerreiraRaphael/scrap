// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Boleto, Tipo } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '~/server/globals/prisma';
import { getBoletoNubank } from '~/server/lib/gmail/gmail';
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
      orderBy: [{ sendAt: 'asc' }],
      take: 1,
      where: {
        tipo: Tipo.NUBANK,
      }
    });
    const boleto = await getBoletoNubank(req.ctx.gmail, lastBoleto?.sendAt);
    if (!boleto) {
      return res.status(404).json([]);;
    }
    await prisma.boleto.create({
      data: boleto,
    });
    const boletosData = await prisma.boleto.findMany();
    res.status(200).json((boletosData));
  } catch (e) {
    console.log(e)
    res.status(500).send([]);
  }
}
