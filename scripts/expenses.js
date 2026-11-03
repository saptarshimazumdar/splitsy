// Guard against opening this page directly without any members
if (!getPeople().length) {
    location.replace('members.html');
}

const PAID_BY = 'paid-by';
const PAID_BY_MULTIPLE = 'paid-by-multiple';
const MULTIPLE_PAYERS = '__multiple__';
const EXPENSE_FORM = 'form-group-expenses';
const EXPENSE_LIST_TABLE_BODY = 'expense-list-table-body';
const DIVIDED_AMONG = 'divided-among';

const expenseFormGroup = document.getElementById(EXPENSE_FORM);
const expenseListTableBody = document.getElementById(EXPENSE_LIST_TABLE_BODY);
const dividedAmong = document.getElementById(DIVIDED_AMONG);
const paidBy = document.getElementById(PAID_BY);
const paidByMultiple = document.getElementById(PAID_BY_MULTIPLE);
const expenseAmount = document.getElementById('expense-amount');
const expenseName = document.getElementById('expense-name');
const kindSelect = document.getElementById('expense-kind');
const estimateIdInput = document.getElementById('estimate-id');
const expenseIdInput = document.getElementById('expense-id');
const consumptionSelect = document.getElementById('paid-equally');
const advanceFields = document.getElementById('advance-fields');
const budgetItemSelect = document.getElementById('budget-item');
const agreedLine = document.getElementById('agreed-line');
const agreedInput = document.getElementById('agreed-amount');

// Form-only kind: an actual expense paid ahead or in parts
const KIND_ADVANCE = 'advance';
const actualFields = document.getElementById('actual-fields');

let expenseFilter = 'all';

// Inputs the user has edited; the rest share whatever remains
const manualPayers = new Set();
const manualConsumers = new Set();

const splitEqually = (total, inputs, manualSet) => {
    const manual = inputs.filter(input => manualSet.has(input));
    const others = inputs.filter(input => !manualSet.has(input));
    if (!total) {
        others.forEach(input => { input.value = ''; });
        return;
    }
    const remaining = round(total - manual.reduce((acc, input) => acc + Number(input.value), 0));
    if (!others.length || remaining < 0) return;
    const share = Math.floor(remaining / others.length * 100) / 100;
    others.forEach((input, idx) => {
        input.value = idx === others.length - 1 ? round(remaining - share * (others.length - 1)) : share;
    });
}

const getTotal = () => Number(expenseAmount.value) || 0;

const splitAmongPayers = () => {
    const inputs = [...paidByMultiple.querySelectorAll('input[data-payer]')];
    splitEqually(getTotal(), inputs, manualPayers);
}

const splitAmongConsumers = () => {
    const inputs = [...dividedAmong.querySelectorAll('input[data-consumer]')];
    const included = inputs.filter(input => input.closest('.member').querySelector('input[type="checkbox"]').checked);
    inputs.forEach(input => {
        if (!included.includes(input)) {
            input.value = '';
            manualConsumers.delete(input);
        }
        input.disabled = !included.includes(input);
    });
    splitEqually(getTotal(), included, manualConsumers);
}

expenseAmount.addEventListener('input', () => {
    splitAmongPayers();
    splitAmongConsumers();
});

paidByMultiple.addEventListener('input', (event$) => {
    const input = event$.target;
    if (input.dataset.payer === undefined) return;
    input.value === '' ? manualPayers.delete(input) : manualPayers.add(input);
    splitAmongPayers();
});

dividedAmong.addEventListener('input', (event$) => {
    const input = event$.target;
    if (input.dataset.consumer === undefined) return;
    input.value === '' ? manualConsumers.delete(input) : manualConsumers.add(input);
    splitAmongConsumers();
});

dividedAmong.addEventListener('change', (event$) => {
    if (event$.target.type !== 'checkbox') return;
    manualConsumers.clear();
    splitAmongConsumers();
});

expenseFormGroup.addEventListener('submit', function (event$) {
    event$.preventDefault();
    const response = [...event$.target.elements].reduce((acc, el) => {
        if (el.type === 'checkbox') {
            return acc;
        } else if (el.dataset.payer !== undefined) {
            if (Number(el.value) > 0) {
                acc.payers.push({ p: el.dataset.payer, amount: Number(el.value) });
            }
        } else if (el.dataset.consumer !== undefined) {
            if (Number(el.value) > 0) {
                acc.consumers.push({ p: el.dataset.consumer, amount: Number(el.value) });
            }
        } else if (el.name === 'contribution') {
            acc['equal'] = Boolean(Number(el.value));
        } else {
            acc[el.name] = el.value;
        }
        return acc;
    }, ({
        payers: [],
        consumers: []
    }))
    if ((response.kind === KIND_ESTIMATE ? processEstimate(response) : processExpense(response))) {
        closeExpenseForm();
    }
});

expenseFormGroup.addEventListener('reset', function () {
    manualPayers.clear();
    manualConsumers.clear();
    closeExpenseForm();
    // select values are only restored after the reset event
    setTimeout(syncFormVisibility);
});

const setPaidBy = () => {
    const people = getPeople();
    paidBy.replaceChildren(...people.map(({ id, name }) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        return option;
    }));
    if (people.length > 1) {
        const multiple = document.createElement('option');
        multiple.value = MULTIPLE_PAYERS;
        multiple.textContent = 'Multiple people';
        paidBy.appendChild(multiple);
    }
}

const setPayerAmounts = () => {
    paidByMultiple.replaceChildren(...getPeople().map(({ id, name }) => {
        const row = document.createElement('label');
        row.className = 'member payer-amount';
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = 'any';
        input.placeholder = 'Paid';
        input.dataset.payer = id;
        const label = document.createElement('span');
        label.textContent = name;
        row.append(label, input);
        return row;
    }));
}

const togglePayers = (select) => {
    const multiple = select.value === MULTIPLE_PAYERS;
    paidByMultiple.classList.toggle('remove-from-screen', !multiple);
    if (multiple) {
        manualPayers.clear();
        splitAmongPayers();
    }
}

const setDividedAmong = () => {
    dividedAmong.replaceChildren(...getPeople().map(({ id, name }, idx) => {
        const row = document.createElement('span');
        row.className = 'member consumer-amount';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `payee-${idx}-id`;
        checkbox.name = `payee-${idx}`;
        checkbox.value = id;
        checkbox.defaultChecked = true;
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = name;
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = 'any';
        input.placeholder = 'Used';
        input.dataset.consumer = id;
        row.append(checkbox, label, input);
        return row;
    }));
}

// Which payments a budget item can still take
const getPaymentOptions = (store, estimate) => {
    const linked = getLinkedExpenses(store, estimate);
    const left = (estimate.agreedAmt || 0) - getPaidSoFar(store, estimate);
    const hasFinal = linked.some(it => !it.advance);
    return {
        advance: !hasFinal && (!estimate.agreedAmt || left > 0),
        actual: !hasFinal && (!linked.length || left > 0)
    };
}

const renderExpense = (store, expense) => {
    // Only an actual expense linked to an estimate is toned
    const estimate = isEstimate(expense) ? null : store.expenses.find(it => it.id === expense.estimateId);
    const variance = estimate ? getVariance(store, estimate) : null;
    const tone = !expense.advance && variance > 0 ? ' over' : !expense.advance && variance < 0 ? ' under' : '';
    const actions = (canLogPayment = false) => `
        <span class="expense-list-table-item-actions">
            ${canLogPayment ? `<span class="expense-list-table-item-action" title="Log payment" onclick="showPayMenu(event, '${expense.id}')">&plus;</span>` : ''}
            <span class="expense-list-table-item-action" title="Edit" onclick="editExpense('${expense.id}')">&#9998;</span>
            <span class="expense-list-table-item-action" title="Remove" onclick="removeExpense('${expense.id}')">&times;</span>
        </span>`;

    if (isEstimate(expense)) {
        const linked = getLinkedExpenses(store, expense);
        const paid = getPaidSoFar(store, expense);
        const left = (expense.agreedAmt || 0) - paid;
        const variance = getVariance(store, expense);
        const verdict = variance === null ? '' : ` \u00b7 ${describeVariance(variance)}`;
        let status = 'Not spent yet';
        if (expense.agreedAmt) {
            status = `Paid \u20b9${formatPaise(paid)} of \u20b9${formatPaise(expense.agreedAmt)} \u00b7 ${left > 0 ? `\u20b9${formatPaise(left)} left` : 'fully paid'}${verdict}`;
        } else if (linked.length) {
            status = `Actual \u20b9${formatPaise(paid)}${verdict}`;
        }
        const options = getPaymentOptions(store, expense);
        return `
            <div class="expense-list-table-item estimate">
                <div class="line">
                    <span class="expense-list-table-item-name">
                        <strong>${escapeHtml(expense.item)}</strong> <small class="expense-tag">Estimate</small>
                    </span>
                    <span class="expense-list-table-item-amount">
                        <small>&#8377;${formatPaise(expense.amt)}</small>
                    </span>
                </div>
                <div class="line">
                    <span class="expense-list-table-item-paid-by"><small>${status}</small></span>
                    ${actions(options.advance || options.actual)}
                </div>
            </div>
        `;
    }
    return `
        <div class="expense-list-table-item${tone}">
            <div class="line">
                <span class="expense-list-table-item-name">
                    <strong>${escapeHtml(expense.item)}</strong>${expense.advance ? ' <small class="expense-tag">Advance</small>' : ''}
                </span>
                <span class="expense-list-table-item-amount">
                    <small>&#8377;${formatPaise(getExpenseTotal(expense))}</small>
                </span>
            </div>
            <div class="line">
                <span class="expense-list-table-item-paid-by">
                    <small>${escapeHtml(expense.paid.map(it => getPersonName(store, it.p)).join(', '))}</small>
                </span>
                ${actions()}
            </div>
        </div>
    `;
}

const fillExpenseTable = () => {
    const store = getStore();
    const expenses = store.expenses.filter(expense =>
        expenseFilter === 'all' || (expenseFilter === KIND_ESTIMATE) === isEstimate(expense));
    expenseListTableBody.innerHTML = expenses.length
        ? expenses.map(expense => renderExpense(store, expense)).join('\n')
        : `<tr><div class="no-expenses">No expenses recorded yet.</div></tr>`;
}

document.getElementById('expense-filter').addEventListener('click', (event$) => {
    const filter = event$.target.dataset.filter;
    if (!filter) return;
    expenseFilter = filter;
    [...event$.currentTarget.children].forEach(button => button.classList.toggle('selected', button === event$.target));
    fillExpenseTable();
});

const removeExpense = (id) => {
    const store = getStore();
    if (!store.expenses.some(expense => expense.id === id)) {
        alert('Expense not found.');
        return;
    }
    const removed = store.expenses.find(expense => expense.id === id);
    store.expenses = store.expenses.filter(expense => expense.id !== id);
    // an estimate that disappears frees its linked actual expense
    store.expenses.forEach(expense => {
        if (expense.estimateId === id) delete expense.estimateId;
    });
    // a budget item with no part payments left no longer has an agreed total
    const budgetItem = store.expenses.find(expense => expense.id === removed.estimateId);
    if (budgetItem && !getLinkedExpenses(store, budgetItem).length) delete budgetItem.agreedAmt;
    setStore(store);
    fillExpenseTable();
}

const toggleDividedAmong = (event$) => {
    const everyone = !!Number(event$.value);
    dividedAmong.classList.toggle('remove-from-screen', everyone);
    if (!everyone) {
        manualConsumers.clear();
        splitAmongConsumers();
    }
}

const closeExpenseForm = () => {
    estimateIdInput.value = '';
    expenseIdInput.value = '';
    kindSelect.disabled = false;
    budgetItemSelect.disabled = false;
    expenseFormGroup.reset();
    closeModal();
}

// Estimates only need a name and an amount, so the payer and split fields are hidden
const toggleKind = (select) => {
    actualFields.classList.toggle('remove-from-screen', select.value === KIND_ESTIMATE);
    advanceFields.classList.toggle('remove-from-screen', select.value !== KIND_ADVANCE);
}

// Derives panel visibility from the selects without recalculating any amounts
const syncFormVisibility = () => {
    toggleKind(kindSelect);
    agreedLine.classList.toggle('remove-from-screen', !budgetItemSelect.value);
    paidByMultiple.classList.toggle('remove-from-screen', paidBy.value !== MULTIPLE_PAYERS);
    dividedAmong.classList.toggle('remove-from-screen', !!Number(consumptionSelect.value));
}

// Only budget items without a full payment can take part payments
const setBudgetItems = (selectedId = '') => {
    const store = getStore();
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'None';
    const items = store.expenses
        .filter(it => isEstimate(it) && getLinkedExpenses(store, it).every(linked => linked.advance))
        .map(it => {
            const option = document.createElement('option');
            option.value = it.id;
            option.textContent = `${it.item} (\u20b9${formatPaise(it.amt)})`;
            return option;
        });
    budgetItemSelect.replaceChildren(none, ...items);
    budgetItemSelect.value = selectedId;
}

const toggleBudgetItem = (select) => {
    const estimate = getStore().expenses.find(it => it.id === select.value);
    agreedLine.classList.toggle('remove-from-screen', !estimate);
    if (!estimate) {
        agreedInput.value = '';
        return;
    }
    agreedInput.value = formatPaise(estimate.agreedAmt || estimate.amt);
    if (!expenseName.value) expenseName.value = estimate.item;
}

const startNewExpense = () => {
    if (estimateIdInput.value || expenseIdInput.value) expenseFormGroup.reset();
    setBudgetItems();
    openModal();
}

document.getElementById('toggle-expense-form').onclick = startNewExpense;

const addPayment = (id) => {
    const store = getStore();
    const estimate = store.expenses.find(it => it.id === id);
    if (!estimate || !isEstimate(estimate)) return;
    expenseFormGroup.reset();
    setBudgetItems(id);
    openModal();
    kindSelect.value = KIND_ADVANCE;
    kindSelect.disabled = true;
    budgetItemSelect.disabled = true;
    expenseName.value = estimate.item;
    agreedInput.value = formatPaise(estimate.agreedAmt || estimate.amt);
    expenseAmount.value = estimate.agreedAmt ? formatPaise(estimate.agreedAmt - getPaidSoFar(store, estimate)) : '';
    syncFormVisibility();
    expenseAmount.dispatchEvent(new Event('input'));
}

const convertEstimate = (id) => {
    const store = getStore();
    const estimate = store.expenses.find(expense => expense.id === id);
    if (!estimate || !isEstimate(estimate)) return;
    const linked = getLinkedExpenses(store, estimate);
    if (linked.some(it => !it.advance)) return;
    openModal();
    expenseName.value = estimate.item;
    // after advances, the actual payment is the remaining part of the agreed total
    expenseAmount.value = formatPaise(estimate.agreedAmt && linked.length
        ? estimate.agreedAmt - getPaidSoFar(store, estimate)
        : estimate.amt);
    kindSelect.value = KIND_ACTUAL;
    toggleKind(kindSelect);
    kindSelect.disabled = true;
    estimateIdInput.value = id;
    expenseAmount.dispatchEvent(new Event('input'));
}

// One floating menu, outside the scrolling list so it is never clipped
const payMenu = document.createElement('div');
payMenu.className = 'pay-menu';
document.body.appendChild(payMenu);

const hidePayMenu = () => {
    payMenu.style.display = 'none';
}

const showPayMenu = (event$, id) => {
    event$.stopPropagation();
    const store = getStore();
    const estimate = store.expenses.find(it => it.id === id);
    if (!estimate || !isEstimate(estimate)) return;
    const options = getPaymentOptions(store, estimate);
    const choices = [
        options.advance && ['Advance', () => addPayment(id)],
        options.actual && ['Actual', () => convertEstimate(id)]
    ].filter(Boolean);
    payMenu.replaceChildren(...choices.map(([label, action]) => {
        const choice = document.createElement('button');
        choice.type = 'button';
        choice.textContent = label;
        choice.onclick = () => {
            hidePayMenu();
            action();
        };
        return choice;
    }));

    const rect = event$.currentTarget.getBoundingClientRect();
    payMenu.style.display = 'flex';
    const left = Math.max(8, Math.min(rect.right - payMenu.offsetWidth, window.innerWidth - payMenu.offsetWidth - 8));
    const below = rect.bottom + 6;
    const top = below + payMenu.offsetHeight > window.innerHeight ? rect.top - payMenu.offsetHeight - 6 : below;
    payMenu.style.left = `${left}px`;
    payMenu.style.top = `${top}px`;
}

document.addEventListener('click', hidePayMenu);
window.addEventListener('scroll', hidePayMenu, true);

const isEqualSplit = (store, owed) => {
    const amounts = owed.map(it => it.amt);
    return owed.length === store.people.length
        && store.people.every(person => owed.some(it => it.p === person.id))
        && Math.max(...amounts) - Math.min(...amounts) <= 1;
}

// Opens the form prefilled; saving replaces the expense in place
const editExpense = (id) => {
    const store = getStore();
    const expense = store.expenses.find(it => it.id === id);
    if (!expense) return;

    expenseFormGroup.reset();
    setBudgetItems(expense.estimateId);
    openModal();
    expenseIdInput.value = id;
    expenseName.value = expense.item;
    kindSelect.value = isEstimate(expense) ? KIND_ESTIMATE : expense.advance ? KIND_ADVANCE : KIND_ACTUAL;
    kindSelect.disabled = true;

    if (isEstimate(expense)) {
        expenseAmount.value = formatPaise(expense.amt);
    } else {
        expenseAmount.value = formatPaise(getExpenseTotal(expense));

        if (expense.advance) {
            const budgetItem = store.expenses.find(it => it.id === expense.estimateId);
            budgetItemSelect.value = budgetItem ? budgetItem.id : '';
            budgetItemSelect.disabled = true;
            agreedInput.value = budgetItem?.agreedAmt ? formatPaise(budgetItem.agreedAmt) : '';
        }

        const multiplePayers = expense.paid.length > 1;
        paidBy.value = multiplePayers ? MULTIPLE_PAYERS : expense.paid[0].p;
        paidByMultiple.querySelectorAll('input[data-payer]').forEach(input => {
            const share = expense.paid.find(it => it.p === input.dataset.payer);
            input.value = multiplePayers && share ? formatPaise(share.amt) : '';
            if (input.value) manualPayers.add(input);
        });

        const equal = isEqualSplit(store, expense.owed);
        consumptionSelect.value = equal ? '1' : '0';
        dividedAmong.querySelectorAll('input[data-consumer]').forEach(input => {
            const share = expense.owed.find(it => it.p === input.dataset.consumer);
            input.closest('.member').querySelector('input[type="checkbox"]').checked = !!share;
            input.disabled = !share;
            input.value = !equal && share ? formatPaise(share.amt) : '';
            if (input.value) manualConsumers.add(input);
        });
    }
    syncFormVisibility();
}

// Updates the expense being edited, or adds a new one at the top of the list
const saveExpense = (store, existingId, fields, defaults) => {
    const idx = store.expenses.findIndex(it => it.id === existingId);
    if (idx >= 0) {
        store.expenses[idx] = { ...store.expenses[idx], ...fields };
    } else {
        store.expenses.unshift({ id: newId(), ts: Date.now(), ...defaults, ...fields });
    }
    setStore(store);
    fillExpenseTable();
}

const processEstimate = ({ item, price, expenseId }) => {
    const amt = toPaise(price);
    if (amt <= 0) {
        alert('An estimate needs an amount greater than zero.');
        return false;
    }
    saveExpense(getStore(), expenseId, { item, amt }, { kind: KIND_ESTIMATE });
    return true;
}

const sumPaise = (entries) => entries.reduce((acc, it) => acc + it.amt, 0);

// Tolerates a 1 paisa gap from rounding; the last entry absorbs it
const fitToTotal = (entries, total) => {
    if (!entries.length || Math.abs(sumPaise(entries) - total) > 1) return null;
    entries[entries.length - 1].amt += total - sumPaise(entries);
    return entries;
}

const toShares = (entries) => entries.map(({ p, amount }) => ({ p, amt: toPaise(amount) }));

const processExpense = (response) => {
    const store = getStore();
    const { payer, item, price, equal } = response;
    const total = toPaise(price);

    const paidEntries = payer === MULTIPLE_PAYERS ? toShares(response.payers) : [{ p: payer, amt: total }];
    const paid = fitToTotal(paidEntries, total);
    if (!paid) {
        alert(`Amounts paid (${formatPaise(sumPaise(paidEntries))}) must add up to the total (${price}).`);
        return false;
    }

    const owedEntries = equal
        ? splitPaise(total, store.people.length).map((amt, idx) => ({ p: store.people[idx].id, amt }))
        : toShares(response.consumers);
    const owed = fitToTotal(owedEntries, total);
    if (!owed) {
        alert(`Amounts consumed (${formatPaise(sumPaise(owedEntries))}) must add up to the total (${price}).`);
        return false;
    }

    // An advance can be a part payment of a budget item; a later actual payment is its final part
    const isAdvance = response.kind === KIND_ADVANCE;
    const existing = store.expenses.find(it => it.id === response.expenseId);
    const budgetItemId = isAdvance ? response.budgetItem : (response.estimateId || existing?.estimateId);
    const estimate = store.expenses.find(it => it.id === budgetItemId && isEstimate(it)) ?? null;
    const others = estimate ? getLinkedExpenses(store, estimate).filter(it => it.id !== response.expenseId) : [];
    const othersTotal = sumPaise(others.map(it => ({ amt: getExpenseTotal(it) })));
    const finalPayment = others.find(it => !it.advance);
    let agreed = null;

    if (isAdvance && budgetItemId) {
        if (!estimate) {
            alert('Budget item not found.');
            return false;
        }
        if (finalPayment) {
            if (!existing) {
                alert('This budget item is already fully paid.');
                return false;
            }
            agreed = othersTotal + total;
        } else {
            agreed = toPaise(response.agreed);
            if (agreed <= 0) {
                alert('Enter the agreed total for the budget item.');
                return false;
            }
            if (othersTotal + total > agreed) {
                alert(`Payments (${formatPaise(othersTotal + total)}) exceed the agreed total (${formatPaise(agreed)}).`);
                return false;
            }
        }
    } else if (estimate) {
        if (finalPayment) {
            alert('This budget item already has a final payment.');
            return false;
        }
        // the final payment closes an item that already has advances
        if (others.length) agreed = othersTotal + total;
    }
    if (estimate && agreed !== null) estimate.agreedAmt = agreed;

    saveExpense(store, response.expenseId, { item, paid, owed }, {
        kind: KIND_ACTUAL,
        ...(isAdvance ? { advance: true } : {}),
        ...(estimate ? { estimateId: estimate.id } : {})
    });
    return true;
}

const editNames = () => {
    location.href = 'members.html';
}

const settleExpenses = () => {
    location.href = 'settlement.html';
}

setPaidBy();
setPayerAmounts();
setDividedAmong();
fillExpenseTable();
