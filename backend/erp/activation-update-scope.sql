-- Scope both singleton updates explicitly; keep database safe-update protection enabled.
do $migration$
declare definition text;
begin
 select pg_get_functiondef('erp_private.account_service(text,jsonb)'::regprocedure) into definition;
 definition:=replace(definition,
  'update erp_private.settings set lease=lease_id,lease_until=now()+interval ''2 minutes'';',
  'update erp_private.settings set lease=lease_id,lease_until=now()+interval ''2 minutes'' where singleton = s.singleton;');
 definition:=replace(definition,
  'update erp_private.settings set admin_created=true,token_hash=null,lease=null,lease_until=null;',
  'update erp_private.settings set admin_created=true,token_hash=null,lease=null,lease_until=null where singleton = s.singleton;');
 execute definition;
end;
$migration$;
