import { z } from 'zod';
import { createRouter } from '~/server/createRouter';

interface DogFactApiResponse {
  facts: string[];
  success: boolean;
}

export const dogFactsRouter = createRouter().query('get-random-fact', {
  input: z
    .object({
      number: z.number().optional(),
    })
    .optional(),
  resolve: async ({ input }) => {
    const url = new URL('https://dog-api.kinduff.com/api/facts');
    if (input?.number) {
      url.searchParams.set('number', input?.number.toString());
    }
    const resposne = await fetch(url.toString());
    return (await resposne.json()) as DogFactApiResponse;
  },
});
