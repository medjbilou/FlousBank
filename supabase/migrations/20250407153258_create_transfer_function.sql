-- Function to safely create a transfer between two accounts
create or replace function create_transfer(
    source_account_id uuid,
    recipient_account_number text,
    transfer_amount numeric,
    transfer_description text default 'Transfer'
)
returns table (
    transaction_id uuid,
    source_new_balance numeric,
    recipient_new_balance numeric
)
language plpgsql
security definer -- Allows function to run with elevated privileges temporarily if needed (use with caution)
set search_path = public -- Ensure function can find tables
as $$
declare
    _recipient_account_id uuid;
    _source_balance numeric;
    _recipient_balance numeric;
    _new_source_balance numeric;
    _new_recipient_balance numeric;
    _debit_tx_id uuid;
    _credit_tx_id uuid;
begin
    -- 1. Validate inputs (basic checks)
    if transfer_amount <= 0 then
        raise exception 'Transfer amount must be positive';
    end if;

    -- 2. Lock rows and get recipient ID and balances within a transaction block
    select id, balance into _recipient_account_id, _recipient_balance
    from accounts
    where account_number = recipient_account_number
    for update; -- Lock recipient row

    if not found then
        raise exception 'Recipient account not found';
    end if;

    select balance into _source_balance
    from accounts
    where id = source_account_id
    for update; -- Lock source row

    if not found then
        raise exception 'Source account not found'; -- Should not happen if called correctly
    end if;

    -- 3. Check sufficient funds
    if _source_balance < transfer_amount then
        raise exception 'Insufficient funds in source account';
    end if;

    -- 4. Perform updates
    _new_source_balance := _source_balance - transfer_amount;
    _new_recipient_balance := _recipient_balance + transfer_amount;

    update accounts
    set balance = _new_source_balance
    where id = source_account_id;

    update accounts
    set balance = _new_recipient_balance
    where id = _recipient_account_id;

    -- 5. Record transactions
    insert into transactions (account_id, transaction_type, amount, description, status, recipient_account_id)
    values (source_account_id, 'Transfer', -transfer_amount, transfer_description, 'Completed', _recipient_account_id)
    returning id into _debit_tx_id;

    insert into transactions (account_id, transaction_type, amount, description, status, recipient_account_id)
    values (_recipient_account_id, 'Transfer', transfer_amount, transfer_description, 'Completed', source_account_id) -- Note recipient_id is the sender here
    returning id into _credit_tx_id;

    -- 6. Return results
    return query select _debit_tx_id, _new_source_balance, _new_recipient_balance;

end;
$$;
