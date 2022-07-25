import { createRouter } from '~/server/createRouter';
import { prisma } from '~/server/globals/prisma';

export const boletosRouter = createRouter()
  .query('get-not-paid', {
    resolve: async () => {
      const boletos = await prisma.boleto.findMany({
        where: {
          paidAt: undefined,
        }
      })
      return boletos;
    },
  })
  .query('get-all', {
    resolve: async () => {
      return prisma.boleto.findMany();
    },
  });
