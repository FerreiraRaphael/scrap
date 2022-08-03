import { Boleto } from "@prisma/client";
import { format } from "date-fns";
import { createSSGHelpers } from '@trpc/react/ssg';
import { trpc } from "~/client/trpc";
import { appRouter } from "~/server/routers/_app";
import superjson from 'superjson';
import { useAutoAnimate } from '@formkit/auto-animate/react'

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
  return <div ref={parent} className="grid grid-cols-1 md:grid-cols-2 xl:md:grid-cols-3">{boletos.map((boleto) => <BoletoItemWithPago boleto={boleto} key={boleto.id} />)}</div>
}

interface IBoletoItem {
  boleto: Boleto;
  onPagoClick: (id: number) => void;
}
function BoletoItem({ boleto, onPagoClick }: IBoletoItem) {
  return <div className="flex mt-4 p-4 items-center justify-center">
    <div className="flex flex-1 flex-col gap-4 border-red-100 rounded-md shadow p-4 max-w-md">
      <span className="text-2xl">{boleto.tipo}</span>
      <div className="flex gap-4 justify-between">
        <span className="text-base">Valor: R${(boleto.valor)}</span>
        <span className="text-base">Vencimento: {format(boleto.vencimento, 'dd/MM/yyyy')}</span>
      </div>
      <button onClick={async () => {
        if (navigator) {
          await navigator.clipboard.writeText(boleto.codigoBarras);
        }
      }} className="bg-green-300 rounded-md shadow p-1">Copiar código boleto</button>
      <button onClick={() => onPagoClick(boleto.id)} className="bg-green-300 rounded-md shadow p-1">Pago</button>
    </div>
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
