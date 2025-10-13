-- Function to create a profile and default account for a new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer -- Needed to insert into public tables referencing auth.users
set search_path = public
as $$
declare
  _new_user_id uuid := new.id;
  _new_user_email text := new.email;
  _default_account_number text;
  _profile_exists boolean;
  _account_exists boolean;
begin
  -- Check if profile already exists (shouldn't happen with trigger timing, but good practice)
  select exists(select 1 from public.profiles where id = _new_user_id) into _profile_exists;

  if not _profile_exists then
    -- Insert into public.profiles
    insert into public.profiles (id, email)
    values (_new_user_id, _new_user_email);
    raise notice 'Profile created for user %', _new_user_id;

    -- Check if account already exists (again, safety check)
     select exists(select 1 from public.accounts where user_id = _new_user_id) into _account_exists;

     if not _account_exists then
        -- Generate a unique default account number (simple example, might need refinement)
        _default_account_number := 'ACC' || substr(replace(_new_user_id::text, '-', ''), 1, 10);

        -- Insert a default checking account
        insert into public.accounts (user_id, account_number, account_type, balance, currency, is_active)
        values (_new_user_id, _default_account_number, 'Checking', 0.00, 'USD', true);
         raise notice 'Default account created for user %', _new_user_id;
    else
         raise notice 'Account already exists for user %', _new_user_id;
    end if;

  else
     raise notice 'Profile already exists for user %', _new_user_id;
  end if;


  return new;
end;
$$;

-- Trigger to call the function after a new user is created in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
