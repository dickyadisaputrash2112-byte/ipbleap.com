-- Runs in a transaction and leaves the real activation, Auth users, and profiles untouched.
begin;
do $test$
declare admin_id uuid:=gen_random_uuid(); member_id uuid:=gen_random_uuid(); admin_email text; member_email text; result jsonb; lease uuid; h text:='transaction-only-token-hash'; activation_hash text:='transaction-only-member-hash';
begin
 if exists(select 1 from public.erp_profiles where active and 'system'=any(roles)) then raise exception 'Run initial-activation regression only before the real administrator is activated.'; end if;
 admin_email:='activation-test-'||admin_id||'@example.invalid';member_email:='activation-test-'||member_id||'@example.invalid';
 insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values(admin_id,admin_email,now(),'{}','{}'),(member_id,member_email,now(),'{}','{}');
 update erp_private.settings set bootstrap_email=admin_email,token_hash=h,expires_at=now()+interval '1 hour',admin_created=false,lease=null,lease_until=null where singleton;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 result:=public.erp_account_service('inspect_setup',jsonb_build_object('hash',h));assert result->>'email'=admin_email,'setup identity';
 result:=public.erp_account_service('reserve_setup',jsonb_build_object('hash',h));lease:=(result->>'lease')::uuid;assert lease is not null,'setup reserve updates intended row';
 begin
  perform public.erp_account_service('reserve_setup',jsonb_build_object('hash',h));raise exception 'TEST FAILED duplicate setup reservation';
 exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 result:=public.erp_account_service('finish_setup',jsonb_build_object('hash',h,'lease',lease,'user',admin_id,'name','Regression administrator'));
 assert (result->>'ok')::boolean,'setup completion';
 assert(select admin_created and token_hash is null and settings.lease is null from erp_private.settings where singleton),'setup token consumed and lease cleared';
 assert(select active and roles=array['system'] from public.erp_profiles where id=admin_id),'initial system profile';
 begin perform public.erp_account_service('inspect_setup',jsonb_build_object('hash',h));raise exception 'TEST FAILED reused setup token';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 insert into public.erp_profiles(id,email,display_name,roles,active) values(member_id,member_email,'Regression member',array['mentee'],false);
 insert into erp_private.activations(user_id,token_hash,expires_at,created_by) values(member_id,activation_hash,now()+interval '1 hour',admin_id);
 result:=public.erp_account_service('reserve_activation',jsonb_build_object('hash',activation_hash));lease:=(result->>'lease')::uuid;
 assert result->>'user'=member_id::text,'member identity';
 result:=public.erp_account_service('finish_activation',jsonb_build_object('hash',activation_hash,'lease',lease));assert(result->>'ok')::boolean,'member activation';
 assert(select active from public.erp_profiles where id=member_id),'member active';
 begin perform public.erp_account_service('inspect_activation',jsonb_build_object('hash',activation_hash));raise exception 'TEST FAILED reused member token';exception when others then if sqlerrm like 'TEST FAILED%' then raise;end if;end;
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 begin perform public.erp_account_service('inspect_setup',jsonb_build_object('hash',h));raise exception 'TEST FAILED client service access';exception when insufficient_privilege then null;end;
end;
$test$;
rollback;
select jsonb_build_object('actualSetupPending',not admin_created,'actualLeaseActive',coalesce(lease_until>now(),false),'users',(select count(*) from auth.users),'profiles',(select count(*) from public.erp_profiles),'records',(select count(*) from public.erp_records)) as after_regression from erp_private.settings where singleton;
