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
      <p>{JSON.stringify(data)}</p>
    </div>
  );
};
