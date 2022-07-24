import { trpc } from "~/client/trpc";

export default function IndexPage() {
  const hello = trpc.useQuery(['dogFacts.boleto']);
  if (!hello.data) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <p>{JSON.stringify(hello.data)}</p>
    </div>
  );
};
