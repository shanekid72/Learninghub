import { ModuleEditor } from "@/components/admin/module-editor"

export default async function EditModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>
}) {
  const { moduleId } = await params
  return <ModuleEditor mode="edit" moduleId={moduleId} />
}
