import { Boleto } from "@prisma/client";
import { format } from "date-fns";
import { trpc } from "~/client/trpc";

export default function IndexPage() {
  const { data, isLoading, isError } = trpc.useQuery(['boleto.get-not-paid']);
  if (isLoading) {
    return <div>Loading...</div>;
  }
  if (isError) {
    return <div>Error...</div>;
  }

  return (
    <div>
      <BoletoList boletos={data!} />
    </div>
  );
};

interface IBoletoList {
  boletos: Boleto[];
}
function BoletoList({ boletos }: IBoletoList) {
  return <ul>{boletos.map((boleto) => <BoletoItemWithPago boleto={boleto} key={boleto.id} />)}</ul>
}

interface IBoletoItem {
  boleto: Boleto;
  onPagoClick: (id: number) => void;
}
function BoletoItem({ boleto, onPagoClick }: IBoletoItem) {
  return <li className="mt-4 p-4">
    <div className="flex flex-col gap-4 border-red-100 rounded-md shadow p-4">
      <text className="text-2xl">{boleto.tipo}</text>
      <div className="flex gap-4 justify-between">
        <text className="text-base">Valor: R${(boleto.valor)}</text>
        <text className="text-base">Vencimento: {format(boleto.vencimento, 'dd/MM/yyyy')}</text>
      </div>
      <button onClick={async () => {
        if (navigator) {
          await navigator.clipboard.writeText(boleto.codigoBarras);
        }
      }} className="bg-green-300 rounded-md shadow p-1">Copiar código boleto</button>
      <button onClick={() => onPagoClick(boleto.id)} className="bg-green-300 rounded-md shadow p-1">Pago</button>
    </div>
  </li>
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
