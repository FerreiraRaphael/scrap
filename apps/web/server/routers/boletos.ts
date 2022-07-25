import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createRouter } from '~/server/createRouter';
import { prisma } from '~/server/globals/prisma';

export const boletosRouter = createRouter()
  .query('get-not-paid', {
    resolve: async () => {
      const boletos = await prisma.boleto.findMany({
        where: {
          paidAt: undefined,
        },
        orderBy: {
          vencimento: 'asc',
          tipo: 'asc',
        }
      })
      return boletos;
    },
  })
  .query('get-all', {
    resolve: async () => {
      return prisma.boleto.findMany();
    },
  })
  .mutation('pay', {
    input: z.object({
      id: z.number()
    }),
    resolve: async ({ input: { id } }) => {
      const boleto = await prisma.boleto.findFirst({ where: { id } });
      if (!boleto) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'boleto not found',
        });
      }
      return prisma.boleto.update({
        where: { id },
        data: {
          paidAt: new Date(),
        },
      })
    }
  });
