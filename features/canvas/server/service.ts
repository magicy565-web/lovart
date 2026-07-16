import "server-only"

import { getRds } from "@/lib/rds"

type CanvasDocumentRow = {
  title: string
  document: unknown
  version: number
  updated_at: Date
}

export async function readCanvasDocument(input: { workspaceId: string; projectId: string | null }) {
  const result = await getRds().query<CanvasDocumentRow>(
    input.projectId
      ? "SELECT title, document, version, updated_at FROM canvas_documents WHERE project_id = $1"
      : "SELECT title, document, version, updated_at FROM canvas_documents WHERE workspace_id = $1",
    [input.projectId ?? input.workspaceId],
  )
  return result.rows[0] ?? null
}

export async function saveCanvasDocument(input: {
  workspaceId: string
  projectId: string | null
  title: string
  document: unknown
}) {
  const values = [input.projectId ?? input.workspaceId, input.title, JSON.stringify(input.document)]
  const result = input.projectId
    ? await getRds().query<{ version: number; updated_at: Date }>(`
        INSERT INTO canvas_documents (workspace_id, project_id, title, document)
        VALUES ($1, $1, $2, $3::jsonb)
        ON CONFLICT (project_id) WHERE project_id IS NOT NULL DO UPDATE SET
          title = EXCLUDED.title,
          document = EXCLUDED.document,
          version = canvas_documents.version + 1,
          updated_at = now()
        RETURNING version, updated_at
      `, values)
    : await getRds().query<{ version: number; updated_at: Date }>(`
        INSERT INTO canvas_documents (workspace_id, title, document)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (workspace_id) DO UPDATE SET
          title = EXCLUDED.title,
          document = EXCLUDED.document,
          version = canvas_documents.version + 1,
          updated_at = now()
        RETURNING version, updated_at
      `, values)
  return result.rows[0]
}
