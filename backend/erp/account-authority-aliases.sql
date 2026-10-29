-- Keep authorization predicates intact while separating query aliases from PL/pgSQL row variables.
do $migration$
declare definition text; previous_query text; updated_query text;
begin
 select pg_get_functiondef('erp_private.account_service(text,jsonb)'::regprocedure) into definition;
 previous_query:='select 1 from public.erp_profiles p join auth.sessions s on s.user_id=p.id join auth.users u on u.id=p.id where p.id=actor and p.active and ''system''=any(p.roles) and s.id=sid and (s.not_after is null or s.not_after>now()) and u.email_confirmed_at is not null';
 updated_query:='select 1 from public.erp_profiles actor_profile join auth.sessions actor_session on actor_session.user_id=actor_profile.id join auth.users actor_user on actor_user.id=actor_profile.id where actor_profile.id=actor and actor_profile.active and ''system''=any(actor_profile.roles) and actor_session.id=sid and (actor_session.not_after is null or actor_session.not_after>now()) and actor_user.email_confirmed_at is not null';
 if position(previous_query in definition)=0 then raise exception 'Account authorization definition changed; inspect before migrating.'; end if;
 definition:=replace(definition,previous_query,updated_query);
 execute definition;
end;
$migration$;
