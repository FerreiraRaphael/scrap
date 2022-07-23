import { trpc } from "~/client/trpc";

export default function IndexPage() {
  const hello = trpc.useQuery(['dogFacts.get-random-fact']);
  if (!hello.data) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <p>{JSON.stringify(hello.data.facts)}</p>
    </div>
  );
};
