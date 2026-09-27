-- Development-only users. Do not use these credentials in production.
do $$
declare
  owner_id uuid;
  member_id uuid;
begin
  select id into owner_id from auth.users where lower(email) = 'owner@gmail.com' limit 1;
  if owner_id is null then
    owner_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', owner_id, 'authenticated', 'authenticated',
      'owner@gmail.com', extensions.crypt('123456', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Studio Owner","role":"owner"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  else
    update auth.users set
      encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Studio Owner","role":"owner"}'::jsonb,
      updated_at = now()
    where id = owner_id;
  end if;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (owner_id::text, owner_id, jsonb_build_object('sub', owner_id::text, 'email', 'owner@gmail.com', 'email_verified', true), 'email', now(), now(), now())
  on conflict (provider_id, provider) do update set identity_data = excluded.identity_data, updated_at = now();
  insert into public.profiles (id, email, full_name, role, status)
  values (owner_id, 'owner@gmail.com', 'Studio Owner', 'owner', 'active')
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, role = excluded.role, status = excluded.status;

  select id into member_id from auth.users where lower(email) = 'member@gmail.com' limit 1;
  if member_id is null then
    member_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', member_id, 'authenticated', 'authenticated',
      'member@gmail.com', extensions.crypt('123456', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Team Member","role":"member"}'::jsonb,
      now(), now(), '', '', '', ''
    );
  else
    update auth.users set
      encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name":"Team Member","role":"member"}'::jsonb,
      updated_at = now()
    where id = member_id;
  end if;

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (member_id::text, member_id, jsonb_build_object('sub', member_id::text, 'email', 'member@gmail.com', 'email_verified', true), 'email', now(), now(), now())
  on conflict (provider_id, provider) do update set identity_data = excluded.identity_data, updated_at = now();
  insert into public.profiles (id, email, full_name, role, status)
  values (member_id, 'member@gmail.com', 'Team Member', 'member', 'active')
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name, role = excluded.role, status = excluded.status;
end $$;
