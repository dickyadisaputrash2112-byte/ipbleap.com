alter table public.erp_cohorts add column revision int not null default 0;
create function erp_private.command(p_action text,p jsonb,p_expected int) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=(p->>'cohort')::uuid; t uuid; g public.erp_groups; x uuid; ids uuid[]; roles_list text[]; n int; row_revision int; start_date date; checkday int; month_index int; current_date_local date; k text; slot int;
begin
 if not erp_private.session_valid() then raise exception 'Masuk kembali untuk melanjutkan.' using errcode='42501'; end if;
 if p_action='set_profile' then
  perform pg_advisory_xact_lock(hashtext('ipbleap-system-roles'));
  if not erp_private.has_role('system') then raise exception 'Hanya Super Admin dapat mengelola peran.' using errcode='42501'; end if;
  t:=(p->>'user')::uuid;select array_agg(value) into roles_list from jsonb_array_elements_text(p->'roles');roles_list:=coalesce(roles_list,'{}');
  if not roles_list<@array['mentee','asmen','mentor','program','finance','system']::text[] then raise exception 'Peran tidak dikenal.'; end if;
  if not exists(select 1 from public.erp_profiles where id=t) then raise exception 'Akun tidak ditemukan.'; end if;
  if not ((p->>'active')::boolean and 'system'=any(roles_list)) and exists(select 1 from public.erp_profiles where id=t and active and 'system'=any(roles)) and not exists(select 1 from public.erp_profiles where id<>t and active and 'system'=any(roles)) then raise exception 'Pertahankan sedikitnya satu Super Admin aktif. Aktifkan pengganti lebih dahulu.'; end if;
  if (p->>'active')::boolean and exists(select 1 from erp_private.activations where user_id=t and used_at is null) then raise exception 'Pemilik akun harus menyelesaikan aktivasi sendiri.'; end if;
  update public.erp_profiles set roles=roles_list,active=(p->>'active')::boolean,updated_at=now() where id=t;
 elsif p_action='create_cohort' then
  if not erp_private.has_role('system') then raise exception 'Super Admin menyiapkan cohort.' using errcode='42501'; end if;
  start_date:=(p->>'starts_on')::date;
  if start_date<>date_trunc('month',start_date)::date or length(trim(p->>'name'))<2 then raise exception 'Isi nama cohort dan bulan mulai M1.'; end if;
  insert into public.erp_cohorts(name,starts_on,ends_on,created_by) values(trim(p->>'name'),start_date,(start_date+interval '12 months -1 day')::date,auth.uid()) returning id into c;t:=c;
  insert into public.erp_cohort_staff(cohort_id,user_id,can_manage) values(c,auth.uid(),true);
 else
  if c is null or not erp_private.manages(c) then raise exception 'Tidak ditugaskan mengelola cohort ini.' using errcode='42501'; end if;
  select revision into row_revision from public.erp_cohorts where id=c for update;
  if p_expected is distinct from row_revision then raise exception 'Data berubah. Muat ulang sebelum menyimpan.' using errcode='40001'; end if;
  if p_action='set_staff' then
   t:=(p->>'user')::uuid;
   if not exists(select 1 from public.erp_profiles where id=t and active and 'program'=any(roles)) then raise exception 'Pilih akun Tim Program aktif.'; end if;
   insert into public.erp_cohort_staff(cohort_id,user_id,can_manage,can_assess) values(c,t,(p->>'manage')::boolean,(p->>'assess')::boolean) on conflict(cohort_id,user_id) do update set can_manage=excluded.can_manage,can_assess=excluded.can_assess;
  elsif p_action='enrol' then
   t:=(p->>'user')::uuid;k:=p->>'role';
   if k not in ('mentee','mentor','asmen','program','finance') or not exists(select 1 from public.erp_profiles where id=t and active and k=any(roles)) then raise exception 'Pilih akun aktif dengan peran sesuai.'; end if;
   if k='mentee' and (p->>'field' not in ('Entrepreneur / Business','Academic & Research','Professional / Corporate / Bureaucracy','Politics / Public Leadership','Social & Community / Social Impact') or length(trim(p->>'pathway'))=0) then raise exception 'Isi Bidang dan pathway hasil seleksi.'; end if;
   insert into public.erp_enrolments(cohort_id,user_id,role,field,pathway) values(c,t,k,coalesce(p->>'field',''),coalesce(p->>'pathway','')) on conflict(cohort_id,user_id,role) do update set field=excluded.field,pathway=excluded.pathway,active=true;
  elsif p_action='group_save' then
   perform pg_advisory_xact_lock(hashtext(c::text));
   if length(trim(p->>'name'))<2 or p->>'field' not in ('Entrepreneur / Business','Academic & Research','Professional / Corporate / Bureaucracy','Politics / Public Leadership','Social & Community / Social Impact') then raise exception 'Isi nama dan Bidang kelompok.'; end if;
   select array_agg(value::uuid) into ids from jsonb_array_elements_text(p->'members');ids:=coalesce(ids,'{}');
   if cardinality(ids)>5 or (select count(distinct q) from unnest(ids) q)<>cardinality(ids) then raise exception 'Kelompok maksimal lima mentee berbeda.'; end if;
   if exists(select 1 from unnest(ids) q where not exists(select 1 from public.erp_enrolments e join public.erp_profiles a on a.id=e.user_id where e.user_id=q and e.cohort_id=c and e.role='mentee' and e.active and e.field=p->>'field' and a.active and 'mentee'=any(a.roles))) then raise exception 'Mentee harus aktif di cohort dan Bidang yang sama.'; end if;
   if not exists(select 1 from public.erp_enrolments e join public.erp_profiles a on a.id=e.user_id where e.cohort_id=c and e.user_id=(p->>'mentor')::uuid and e.role='mentor' and e.active and a.active and 'mentor'=any(a.roles)) or not exists(select 1 from public.erp_enrolments e join public.erp_profiles a on a.id=e.user_id where e.cohort_id=c and e.user_id=(p->>'asmen')::uuid and e.role='asmen' and e.active and a.active and 'asmen'=any(a.roles)) then raise exception 'Tetapkan satu Mentor dan satu Asmen yang terdaftar.'; end if;
   t:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
   if exists(select 1 from public.erp_groups where id=t and cohort_id<>c) then raise exception 'Kelompok tidak cocok.'; end if;
   if exists(select 1 from public.erp_groups h where h.cohort_id=c and h.id<>t and (h.mentor_id=(p->>'mentor')::uuid or h.asmen_id=(p->>'asmen')::uuid)) then raise exception 'Mentor dan Asmen sudah ditugaskan pada kelompok lain di cohort ini.'; end if;
   if exists(select 1 from public.erp_group_members m join public.erp_groups h on h.id=m.group_id where h.cohort_id=c and h.id<>t and m.active and m.user_id=any(ids)) then raise exception 'Mentee sudah berada dalam kelompok lain.'; end if;
   if (p->>'active')::boolean and cardinality(ids)<>5 then raise exception 'Aktifkan setelah lima mentee lengkap.'; end if;
   insert into public.erp_groups(id,cohort_id,name,field,mentor_id,asmen_id,active) values(t,c,trim(p->>'name'),p->>'field',(p->>'mentor')::uuid,(p->>'asmen')::uuid,(p->>'active')::boolean) on conflict(id) do update set name=excluded.name,field=excluded.field,mentor_id=excluded.mentor_id,asmen_id=excluded.asmen_id,active=excluded.active;
   update public.erp_group_members set active=false,left_at=now() where group_id=t and active and not(user_id=any(ids));
   foreach x in array ids loop insert into public.erp_group_members(group_id,user_id) select t,x where not exists(select 1 from public.erp_group_members where group_id=t and user_id=x and active);end loop;
  elsif p_action='plan_sessions' then
   t:=(p->>'group')::uuid;select * into g from public.erp_groups where id=t and cohort_id=c and active;
   if g.id is null then raise exception 'Aktifkan kelompok dahulu.'; end if;
   if exists(select 1 from public.erp_sessions where group_id=t) then raise exception 'Jadwal sudah tersedia; jangan membuat ulang.'; end if;
   if (p->>'day1')::int not between 1 and 28 or (p->>'day2')::int not between 1 and 28 or (p->>'day2')::int<=(p->>'day1')::int or (p->>'mentorDay')::int not between 1 and 28 then raise exception 'Pilih dua tanggal check-in berbeda dan tanggal mentoring (1–28).'; end if;
   select starts_on into start_date from public.erp_cohorts where id=c;select array_agg(user_id) into ids from public.erp_group_members where group_id=t and active;
   for month_index in 2..12 loop
    foreach k in array array['checkin','mentoring'] loop
     for slot in 1..(case when k='checkin' then 2 else 1 end) loop
      checkday:=case when k='mentoring' then (p->>'mentorDay')::int when slot=1 then (p->>'day1')::int else (p->>'day2')::int end;
      current_date_local:=(start_date+make_interval(months=>month_index-1))::date+(checkday-1);
      insert into public.erp_sessions(cohort_id,group_id,kind,starts_at,month_no,participant_ids,created_by) values(c,t,k,(current_date_local+(p->>'time')::time) at time zone 'Asia/Jakarta',month_index,ids,auth.uid());
     end loop;
    end loop;
   end loop;
  elsif p_action='cancel_session' then
   t:=(p->>'session')::uuid;
   if length(trim(p->>'reason'))<5 then raise exception 'Isi alasan pembatalan.'; end if;
   update public.erp_sessions set cancelled=true,cancellation_reason=trim(p->>'reason') where id=t and cohort_id=c;
   if not found then raise exception 'Jadwal tidak ditemukan.'; end if;
  else raise exception 'Permintaan tidak dikenali.'; end if;
  update public.erp_cohorts set revision=revision+1 where id=c;
 end if;
 insert into public.erp_audit(cohort_id,actor_id,action,entity_id,metadata) values(c,auth.uid(),p_action,t,jsonb_build_object('target',t));
 return jsonb_build_object('ok',true,'id',t,'cohort',c);
end;
$$;
create function public.erp_command(p_action text,p_payload jsonb,p_expected int default null) returns jsonb language sql security invoker set search_path='' as $$select erp_private.command(p_action,p_payload,p_expected)$$;
revoke all on function public.erp_command(text,jsonb,int),erp_private.command(text,jsonb,int) from public,anon;
grant execute on function public.erp_command(text,jsonb,int),erp_private.command(text,jsonb,int) to authenticated;
