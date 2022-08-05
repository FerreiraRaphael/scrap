import { Boleto } from "@prisma/client";
import { format } from "date-fns";
import { createSSGHelpers } from '@trpc/react/ssg';
import superjson from 'superjson';
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { trpc } from "~/client/trpc";
import { appRouter } from "~/server/routers/_app";
import { Button } from "~/components/Button";

export async function getServerSideProps() {
  const ssg = await createSSGHelpers({
    router: appRouter,
    ctx: {},
    transformer: superjson,
  });
  const boletos = await ssg.fetchQuery('boleto.get-not-paid');
  const boletosJson = superjson.stringify(boletos);
  return { props: { boletos: boletosJson } }
}
interface IIndexPageProps {
  boletos: Boleto[]
}
export default function IndexPage({ boletos }: IIndexPageProps) {
  const { data, isLoading, isError } = trpc.useQuery(['boleto.get-not-paid'], { initialData: boletos });
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error...</div>;
  }
  return (
    <BoletoList boletos={data!} />
  );
};

interface IBoletoList {
  boletos: Boleto[];
}
function BoletoList({ boletos }: IBoletoList) {
  const [parent] = useAutoAnimate<HTMLDivElement>();
  return <div ref={parent} className="grid grid-cols-1 md:grid-cols-2 xl:md:grid-cols-3">
    {boletos.map((boleto) => <BoletoItemWithPago boleto={boleto} key={boleto.id} />)}
  </div>
}

interface IBoletoItem {
  boleto: Boleto;
  onPagoClick: (id: number) => void;
}
function BoletoItem({ boleto, onPagoClick }: IBoletoItem) {
  return <div className="flex mt-4 p-4 items-center justify-center">
    <div className="BoletoItem">
      <span className="text-2xl font-bold">{boleto.tipo}</span>
      <div className="flex gap-4 justify-between">
        <span className={`text-base`}>Valor: R${(boleto.valor)}</span>
        <span className="text-base">Vencimento: {format(boleto.vencimento, 'dd/MM/yyyy')}</span>
      </div>
      <div className="flex justify-end gap-4">
        <Button onClick={async () => {
          if (navigator) {
            await navigator.clipboard.writeText(boleto.codigoBarras);
          }
        }}>Copiar código boleto</Button>
        <Button onClick={() => onPagoClick(boleto.id)} >Pago</Button>
      </div>
    </div>
    <style jsx>{
      `
        .BoletoItem {
          @apply flex flex-1 flex-col gap-4 border-black border-2 max-w-md relative p-4
          shadow hover:shadow-xl transition-all duration-150
        }
      `
    }
    </style>
  </div>
}

type BoletoItemWithPago = Pick<IBoletoItem, 'boleto'>
function BoletoItemWithPago({ boleto }: BoletoItemWithPago) {
  const utils = trpc.useContext();
  const { mutate } = trpc.useMutation('boleto.pay');
  return <BoletoItem boleto={boleto} onPagoClick={(id) => {
    mutate({
      id,
    }, {
      onSuccess: () => {
        utils.invalidateQueries(['boleto.get-not-paid']);
      }
    })
  }} />
}
