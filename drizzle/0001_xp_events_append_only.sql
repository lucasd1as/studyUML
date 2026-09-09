-- xp_events is an append-only ledger. Current XP is always derived from SUM(amount); nothing rewrites history.
-- Corrections are new rows with reason = 'admin_adjustment'. The single exception: deleting a user account takes
-- its ledger with it (the cascade runs after the users row is gone, which is what the DELETE branch checks).
CREATE OR REPLACE FUNCTION xp_events_forbid_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM users WHERE id = OLD.user_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'xp_events is append-only (% not allowed)', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER xp_events_append_only
  BEFORE UPDATE OR DELETE ON "xp_events"
  FOR EACH ROW EXECUTE FUNCTION xp_events_forbid_mutation();
