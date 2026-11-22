-- ============================================================
-- ORBIT RLS policies — versi lengkap (melengkapi 002).
-- Asumsi Supabase: auth.uid() = public.users.id.
-- Pola anti-rekursif: SEMUA kebijakan hanya memanggil helper
-- SECURITY DEFINER, tidak pernah membaca workspace_members
-- langsung di dalam policy lain.
-- Review + uji workspace isolation sebelum deploy (checklist 08).
-- ============================================================

-- ------------------------------------------------------------
-- Helper — SECURITY DEFINER dengan search_path terkunci.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.orbit_can_access(
  w_id uuid,
  min_role text DEFAULT 'viewer'
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = w_id
      AND user_id = auth.uid()
      AND CASE min_role
        WHEN 'admin'  THEN role IN ('owner','admin')
        WHEN 'member' THEN role IN ('owner','admin','member')
        ELSE TRUE
      END
  );
$$;

-- Bootstrap: pemilik workspace baru belum punya baris membership
-- saat pertama kali membuatnya. Kebijakan INSERT workspace_members
-- mengizinkan pemilik workspace (dari public.workspaces, yang
-- INSERT-nya dibatasi owner_id = auth.uid()) mendaftarkan dirinya.
-- Alternatif yang lebih ketat: RPC SECURITY DEFINER create_workspace
-- yang membuat kedua baris dalam satu transaksi.

-- ------------------------------------------------------------
-- users — tiap pengguna hanya melihat & mengelola barisnya.
-- Pembuatan baris users dilakukan trigger dari auth.users (Supabase),
-- bukan lewat client.
-- ------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own" ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users update own" ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------
-- workspaces & membership
-- ------------------------------------------------------------

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read workspaces" ON workspaces FOR SELECT
  USING (public.orbit_can_access(id, 'viewer'));

CREATE POLICY "owner creates workspace" ON workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners manage workspaces" ON workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners delete workspaces" ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

CREATE POLICY "members view membership" ON workspace_members FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));

CREATE POLICY "owner self-register membership" ON workspace_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = workspace_id AND w.owner_id = auth.uid()
    )
  );

CREATE POLICY "admins manage membership" ON workspace_members FOR UPDATE
  USING (public.orbit_can_access(workspace_id, 'admin'))
  WITH CHECK (public.orbit_can_access(workspace_id, 'admin'));

CREATE POLICY "admins remove membership" ON workspace_members FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'admin'));

-- ------------------------------------------------------------
-- Tabel ber-scope workspace: pola seragam
-- (documents, document_chunks, entities, document_entities,
--  events, tasks, reminders)
-- viewer=baca, member=tulis. Perketat DELETE ke admin bila perlu.
-- ------------------------------------------------------------

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs read" ON documents FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
CREATE POLICY "docs insert" ON documents FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "docs update" ON documents FOR UPDATE
  USING (public.orbit_can_access(workspace_id, 'member'))
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "docs delete" ON documents FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

CREATE POLICY "chunks read" ON document_chunks FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
CREATE POLICY "chunks insert" ON document_chunks FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "chunks delete" ON document_chunks FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

CREATE POLICY "entities read" ON entities FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
CREATE POLICY "entities insert" ON entities FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "entities update" ON entities FOR UPDATE
  USING (public.orbit_can_access(workspace_id, 'member'))
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "entities delete" ON entities FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

CREATE POLICY "doc_entities read" ON document_entities FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
CREATE POLICY "doc_entities insert" ON document_entities FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "doc_entities delete" ON document_entities FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

CREATE POLICY "events read" ON events FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
CREATE POLICY "events insert" ON events FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "events update" ON events FOR UPDATE
  USING (public.orbit_can_access(workspace_id, 'member'))
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "events delete" ON events FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

CREATE POLICY "tasks read" ON tasks FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
CREATE POLICY "tasks insert" ON tasks FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "tasks update" ON tasks FOR UPDATE
  USING (public.orbit_can_access(workspace_id, 'member'))
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "tasks delete" ON tasks FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

CREATE POLICY "reminders read" ON reminders FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
CREATE POLICY "reminders insert" ON reminders FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "reminders update" ON reminders FOR UPDATE
  USING (public.orbit_can_access(workspace_id, 'member'))
  WITH CHECK (public.orbit_can_access(workspace_id, 'member'));
CREATE POLICY "reminders delete" ON reminders FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

-- ------------------------------------------------------------
-- conversations & messages — messages ber-scope via conversations
-- (tanpa kolom workspace_id sendiri). Client hanya boleh menulis
-- pesan role='user'; pesan assistant/tool ditulis service role
-- (bypass RLS) setelah validasi server.
-- ------------------------------------------------------------

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations read" ON conversations FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));

CREATE POLICY "conversations insert" ON conversations FOR INSERT
  WITH CHECK (public.orbit_can_access(workspace_id, 'member') AND created_by = auth.uid());

CREATE POLICY "conversations delete" ON conversations FOR DELETE
  USING (public.orbit_can_access(workspace_id, 'member'));

CREATE POLICY "messages read via conversation" ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND public.orbit_can_access(c.workspace_id, 'viewer')
    )
  );

CREATE POLICY "members insert user messages" ON messages FOR INSERT
  WITH CHECK (
    NEW.role = 'user'
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = NEW.conversation_id
        AND public.orbit_can_access(c.workspace_id, 'member')
    )
  );

-- ------------------------------------------------------------
-- ai_approvals — keputusan approval dilakukan pemilik aksi.
-- Transisi status (pending→approved/rejected/expired/executed)
-- divalidasi di server; RLS hanya membatasi siapa boleh menyentuh.
-- ------------------------------------------------------------

ALTER TABLE ai_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals read" ON ai_approvals FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));

CREATE POLICY "members create approvals" ON ai_approvals FOR INSERT
  WITH CHECK (
    public.orbit_can_access(workspace_id, 'member')
    AND user_id = auth.uid()
  );

CREATE POLICY "owner decides approvals" ON ai_approvals FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- activity_logs — ditulis service role; dibaca admin/owner.
-- ------------------------------------------------------------

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read activity" ON activity_logs FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'admin'));

-- ------------------------------------------------------------
-- Tabel baru dari migration 003
-- ------------------------------------------------------------

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read ai_usage" ON ai_usage FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'admin'));

-- INSERT tidak dibuka ke client — service role saja (bypass RLS).

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own tokens" ON device_tokens FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "users manage own tokens" ON device_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own tokens" ON device_tokens FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "users delete own tokens" ON device_tokens FOR DELETE
  USING (user_id = auth.uid());

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans readable" ON plans FOR SELECT
  USING (TRUE); -- katalog harga publik untuk client

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read subscription" ON subscriptions FOR SELECT
  USING (public.orbit_can_access(workspace_id, 'viewer'));
-- INSERT/UPDATE subscription hanya lewat service role / webhook billing.

-- ------------------------------------------------------------
-- Checklist pengujian setelah deploy:
-- 1. Dua workspace berbeda → retrieval lintas workspace harus kosong.
-- 2. role='viewer' tidak bisa INSERT documents/tasks.
-- 3. Pengguna luar tidak bisa membaca conversations/messages.
-- 4. INSERT messages role='assistant' oleh client harus ditolak.
-- 5. Bootstrap workspace baru: insert workspaces + self-membership sukses.
-- 6. ai_usage INSERT oleh client anonim/authenticated harus ditolak.
-- ------------------------------------------------------------
