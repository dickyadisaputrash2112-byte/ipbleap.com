alter table erp_private.settings add column token_hash text, add column expires_at timestamptz, add column lease uuid, add column lease_until timestamptz;
create table erp_private.activations(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),token_hash text unique not null,expires_at timestamptz not null,used_at timestamptz,lease uuid,lease_until timestamptz,created_by uuid references public.erp_profiles(id));
alter table erp_private.activations enable row level security;
create function erp_private.account_service(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s erp_private.settings; a erp_private.activations; u auth.users; person public.erp_profiles; actor uuid; sid uuid; token text:=p->>'hash'; lease_id uuid; target uuid; r text[];
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Akses layanan ditolak.' using errcode='42501'; end if;
 if p_action in ('inspect_setup','reserve_setup','finish_setup') then
  select * into s from erp_private.settings where singleton for update;
  if s.admin_created or s.token_hash is null or s.token_hash<>token or s.expires_at<now() then raise exception 'Tautan aktivasi tidak berlaku atau sudah digunakan.'; end if;
  if p_action='inspect_setup' then return jsonb_build_object('email',s.bootstrap_email,'setup',true); end if;
  if p_action='reserve_setup' then
   if s.lease_until>now() then raise exception 'Aktivasi sedang diproses. Coba lagi dalam dua menit.'; end if;
   lease_id:=gen_random_uuid(); update erp_private.settings set lease=lease_id,lease_until=now()+interval '2 minutes' where singleton = s.singleton;
   return jsonb_build_object('email',s.bootstrap_email,'lease',lease_id);
  end if;
  if s.lease is distinct from (p->>'lease')::uuid or s.lease_until<now() then raise exception 'Aktivasi berakhir. Coba lagi.'; end if;
  select * into u from auth.users where id=(p->>'user')::uuid;
  if u.email is distinct from s.bootstrap_email or u.email_confirmed_at is null then raise exception 'Akun aktivasi tidak cocok.'; end if;
  if exists(select 1 from public.erp_profiles where active and 'system'=any(roles)) then raise exception 'Pengelola pertama sudah aktif.'; end if;
  insert into public.erp_profiles(id,email,display_name,active,roles) values(u.id,u.email,coalesce(nullif(p->>'name',''),'Pengelola IPB LEAP'),true,array['system']) on conflict(id) do update set display_name=excluded.display_name,active=true,roles=array['system'];
  update erp_private.settings set admin_created=true,token_hash=null,lease=null,lease_until=null where singleton = s.singleton;
  insert into public.erp_audit(actor_id,action,entity_id) values(u.id,'Aktivasi pengelola pertama',u.id);
  return jsonb_build_object('ok',true);
 elsif p_action in ('inspect_activation','reserve_activation','finish_activation') then
  select * into a from erp_private.activations where token_hash=token for update;
  select * into person from public.erp_profiles where id=a.user_id;
  if a.id is null or a.used_at is not null or a.expires_at<now() or person.active then raise exception 'Tautan aktivasi tidak berlaku atau sudah digunakan.'; end if;
  if p_action='inspect_activation' then return jsonb_build_object('email',person.email,'name',person.display_name,'setup',false); end if;
  if p_action='reserve_activation' then
   if a.lease_until>now() then raise exception 'Aktivasi sedang diproses. Coba lagi dalam dua menit.'; end if;
   lease_id:=gen_random_uuid(); update erp_private.activations set lease=lease_id,lease_until=now()+interval '2 minutes' where id=a.id;
   return jsonb_build_object('user',a.user_id,'email',person.email,'lease',lease_id);
  end if;
  if a.lease is distinct from (p->>'lease')::uuid or a.lease_until<now() then raise exception 'Aktivasi berakhir. Coba lagi.'; end if;
  update public.erp_profiles set active=true,updated_at=now() where id=a.user_id;
  update erp_private.activations set used_at=now(),lease=null,lease_until=null where id=a.id;
  insert into public.erp_audit(actor_id,action,entity_id) values(a.user_id,'Aktivasi akun',a.user_id);
  return jsonb_build_object('ok',true);
 elsif p_action in ('authorize','provision','reissue') then
  actor:=(p->>'actor')::uuid; sid:=(p->>'session')::uuid;
  if not exists(select 1 from public.erp_profiles actor_profile join auth.sessions actor_session on actor_session.user_id=actor_profile.id join auth.users actor_user on actor_user.id=actor_profile.id where actor_profile.id=actor and actor_profile.active and 'system'=any(actor_profile.roles) and actor_session.id=sid and (actor_session.not_after is null or actor_session.not_after>now()) and actor_user.email_confirmed_at is not null) then raise exception 'Hanya Super Admin aktif yang dapat mengelola akun.' using errcode='42501'; end if;
  if p_action='authorize' then return jsonb_build_object('ok',true); end if;
  target:=(p->>'user')::uuid;
  if p_action='provision' then
   select * into u from auth.users where id=target;
   select array_agg(value) into r from jsonb_array_elements_text(p->'roles');
   if r is null or not r<@array['mentee','asmen','mentor','program','finance','system']::text[] then raise exception 'Pilih peran akun yang benar.'; end if;
   if length(trim(p->>'name'))<2 or u.id is null or u.email is distinct from p->>'email' then raise exception 'Identitas akun belum lengkap.'; end if;
   insert into public.erp_profiles(id,email,display_name,roles) values(target,u.email,trim(p->>'name'),r);
  end if;
  select * into person from public.erp_profiles where id=target for update;
  if person.id is null or person.active then raise exception 'Tautan baru hanya untuk akun yang belum aktif.'; end if;
  update erp_private.activations set used_at=now() where user_id=target and used_at is null;
  insert into erp_private.activations(user_id,token_hash,expires_at,created_by) values(target,token,now()+interval '14 days',actor);
  insert into public.erp_audit(actor_id,action,entity_id) values(actor,'Menyiapkan aktivasi akun',target);
  return jsonb_build_object('ok',true,'email',person.email);
 end if;
 raise exception 'Permintaan akun tidak dikenali.';
end;
$$;
create function public.erp_account_service(p_action text,p jsonb) returns jsonb language sql security invoker set search_path='' as $$select erp_private.account_service(p_action,p)$$;
revoke all on function public.erp_account_service(text,jsonb),erp_private.account_service(text,jsonb) from public,anon,authenticated;
grant usage on schema erp_private to service_role;
grant execute on function public.erp_account_service(text,jsonb),erp_private.account_service(text,jsonb) to service_role;
