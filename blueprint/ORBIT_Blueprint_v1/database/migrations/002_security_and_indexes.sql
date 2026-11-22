-- SECURITY MIGRATION TEMPLATE — review with your Supabase deployment.
-- Supabase Auth user IDs must map to public.users.id.
-- Do not deploy until the identity mapping and workspace access model are verified.

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Example helper policy pattern for a Supabase setup where auth.uid()
-- equals public.users.id. Review recursion implications for workspace_members
-- and consider SECURITY DEFINER helper functions with a fixed search_path.

CREATE POLICY "workspace members can read workspaces"
ON workspaces FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace members can read documents"
ON documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = documents.workspace_id
      AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "workspace members can read tasks"
ON tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = tasks.workspace_id
      AND wm.user_id = auth.uid()
  )
);

-- Additional INSERT/UPDATE/DELETE policies are intentionally not generalized here.
-- Implement role-specific policies for every table and operation.
-- Never expose service-role credentials to the browser.
