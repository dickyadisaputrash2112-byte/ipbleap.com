-- Rollback-only account management regression; no real account or credentials are changed.
begin;
do $test$
declare admin_id uuid:=gen_random_uuid(); mentee_id uuid:=gen_random_uuid(); target_id uuid:=gen_random_uuid(); admin_session uuid:=gen_random_uuid(); mentee_session uuid:=gen_random_uuid(); result jsonb; trusted jsonb; initial_hash text:=gen_random_uuid()::text; next_hash text:=gen_random_uuid()::text; target_email text;
begin
 target_email:='management-test-'||target_id||'@example.invalid';
 insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
  (admin_id,'management-test-'||admin_id||'@example.invalid',now(),'{}','{}'),
  (mentee_id,'management-test-'||mentee_id||'@example.invalid',now(),'{}','{}'),
  (target_id,target_email,now(),'{}','{}');
 insert into public.erp_profiles(id,email,display_name,roles,active) values
  (admin_id,'management-test-'||admin_id||'@example.invalid','Regression admin',array['system'],true),
  (mentee_id,'management-test-'||mentee_id||'@example.invalid','Regression mentee',array['mentee'],true);
 insert into auth.sessions(id,user_id,created_at,updated_at) values(admin_session,admin_id,now(),now()),(mentee_session,mentee_id,now(),now());
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 trusted:=jsonb_build_object('actor',admin_id,'session',admin_session);
 result:=public.erp_account_service('authorize',trusted);assert(result->>'ok')::boolean,'active administrator must be authorized';
 begin perform public.erp_account_service('authorize',jsonb_build_object('actor',mentee_id,'session',mentee_session));raise exception 'TEST FAILED mentee authorized';exception when insufficient_privilege then null;end;
 begin perform public.erp_account_service('authorize',jsonb_build_object('actor',admin_id,'session',mentee_session));raise exception 'TEST FAILED mismatched session authorized';exception when insufficient_privilege then null;end;
 begin perform public.erp_account_service('authorize',jsonb_build_object('actor',admin_id,'session',gen_random_uuid()));raise exception 'TEST FAILED missing session authorized';exception when insufficient_privilege then null;end;
 update auth.sessions set not_after=now()-interval '1 minute' where id=admin_session;
 begin perform public.erp_account_service('authorize',trusted);raise exception 'TEST FAILED expired session authorized';exception when insufficient_privilege then null;end;
 update auth.sessions set not_after=null where id=admin_session;
 update public.erp_profiles set active=false where id=admin_id;
 begin perform public.erp_account_service('authorize',trusted);raise exception 'TEST FAILED inactive administrator authorized';exception when insufficient_privilege then null;end;
 update public.erp_profiles set active=true where id=admin_id;
 result:=public.erp_account_service('provision',trusted||jsonb_build_object('user',target_id,'email',target_email,'name','Regression target','roles',jsonb_build_array('mentee'),'hash',initial_hash));assert(result->>'ok')::boolean,'account provision';
 assert(select not active and roles=array['mentee'] from public.erp_profiles where id=target_id),'new account remains pending owner activation';
 assert(select count(*)=1 from erp_private.activations where user_id=target_id and used_at is null and token_hash=initial_hash),'one initial activation';
 result:=public.erp_account_service('reissue',trusted||jsonb_build_object('user',target_id,'hash',next_hash));assert(result->>'ok')::boolean,'activation reissue';
 assert(select count(*)=1 from erp_private.activations where user_id=target_id and used_at is null and token_hash=next_hash),'one current activation';
 assert(select used_at is not null from erp_private.activations where user_id=target_id and token_hash=initial_hash),'old activation invalidated';
 assert not has_function_privilege('authenticated','public.erp_account_service(text,jsonb)','execute'),'browser cannot call service RPC directly';
end;
$test$;
rollback;
select jsonb_build_object('fixtureUsersRemaining',(select count(*) from auth.users where email like 'management-test-%@example.invalid'),'users',(select count(*) from auth.users),'profiles',(select count(*) from public.erp_profiles)) as after_regression;
