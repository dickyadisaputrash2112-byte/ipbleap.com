create function erp_private.account_gateway(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; existing_user uuid;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Akses layanan ditolak.' using errcode='42501'; end if;
 result:=erp_private.account_service(p_action,p);
 if p_action='reserve_setup' then
  select id into existing_user from auth.users where email=result->>'email';
  if existing_user is not null and exists(select 1 from public.erp_profiles where id=existing_user and active) then raise exception 'Akun pengelola sudah aktif. Masuk dengan akun tersebut.'; end if;
  result:=result||jsonb_build_object('user',existing_user);
 end if;
 return result;
end;$$;
revoke all on function erp_private.account_gateway(text,jsonb) from public,anon,authenticated;
grant execute on function erp_private.account_gateway(text,jsonb) to service_role;
create or replace function public.erp_account_service(p_action text,p jsonb) returns jsonb language sql security invoker set search_path='' as $$select erp_private.account_gateway(p_action,p)$$;
