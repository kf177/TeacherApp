import JobEditClient from "./JobEditClient";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobEditClient id={id} />;
}
