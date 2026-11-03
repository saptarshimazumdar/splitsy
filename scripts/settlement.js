const SETTLEMENT_LIST = 'settlement-list';

const settlementList = document.getElementById(SETTLEMENT_LIST);

const describeShares = (store, personId, key) => {
    const items = store.expenses.filter(expense => !isEstimate(expense)).flatMap(expense =>
        expense[key].filter(it => it.p === personId).map(it => `${escapeHtml(expense.item)} (&#8377;${formatPaise(it.amt)})`));
    return validEmpty(items.join(', ')) ?? 'nothing as of now';
}

const renderBudgetCard = (store) => {
    const budget = getBudget(store);
    if (!budget.hasBudget) return '';
    return `
        <div class="budget-summary budget-card${budget.left < 0 ? ' over' : ''}">
            <strong>${describeBudget(budget)}</strong>
        </div>
    `;
}

const fillSettlementList = () => {
    const store = getStore();
    if (!store.people.length) {
        settlementList.innerHTML = `<div class="no-expenses">No members found.</div>`;
    } else {
        const balances = getBalances(store);
        settlementList.innerHTML = renderBudgetCard(store) + store.people.map(({ id, name }) => {
            const [balance, indicator] = balances[id] > 0 ? [balances[id], 'needs to collect'] : [-balances[id], 'needs to pay'];
            return `
                <div class="settlement-list-item">
                    <button type="button" class="individual-settlement">${escapeHtml(name)} ${indicator} &#8377; ${formatPaise(balance)}</button>
                    <div class="collapsible-settlement-content">
                        <small>
                            <p>You have paid for: ${describeShares(store, id, 'paid')}</p>
                            <p>You have spent on: ${describeShares(store, id, 'owed')}</p>
                        </small>
                    </div>
                </div>
            `;
        }).join('\n');
    }
}

const editExpenses = () => {
    location.href = 'expenses.html';
}

const showMessage = (message) => {
    document.getElementById('message-text').textContent = message;
    document.getElementById('message-modal').style.display = 'block';
}

const closeMessage = () => {
    document.getElementById('message-modal').style.display = 'none';
}

const buildReport = () => {
    const store = getStore();
    const money = (paise) => `₹${formatPaise(paise)}`;
    const actuals = store.expenses.filter(it => !isEstimate(it));
    const total = actuals.reduce((acc, it) => acc + getExpenseTotal(it), 0);
    const balances = getBalances(store);
    const budget = getBudget(store);

    const expenseLines = actuals.map(it =>
        `- ${it.item}: ${money(getExpenseTotal(it))} (paid by ${it.paid.map(x => getPersonName(store, x.p)).join(', ')})${it.advance ? ' [advance]' : ''}`);
    const settlementLines = store.people.map(({ id, name }) => balances[id] > 0
        ? `- ${name} needs to collect ${money(balances[id])}`
        : `- ${name} needs to pay ${money(-balances[id])}`);

    return [
        `Splitsy report - ${new Date().toLocaleDateString()}`,
        `${getStoreTitle(store)}`,
        ...(store.name?.trim() ? [`Members: ${store.people.map(it => it.name).join(', ')}`] : []),
        `Total spent: ${money(total)}`,
        '',
        'Expenses',
        ...(expenseLines.length ? expenseLines : ['- none']),
        ...(budget.hasBudget ? ['', describeBudget(budget)] : []),
        '',
        'Settlement',
        ...settlementLines
    ].join('\n');
}

const shareReport = async () => {
    if (!getPeople().length) {
        showMessage('Nothing to share yet.');
        return;
    }
    const text = buildReport();
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Splitsy report', text });
        } catch (e) {
            if (e.name !== 'AbortError') showMessage('Could not share the report.');
        }
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
        showMessage('Report copied to clipboard.');
    } catch (e) {
        showMessage('Could not copy the report.');
    }
}

const archiveExpense = () => {
    archiveStore();
    resetStore();
    location.href = 'index.html';
}

fillSettlementList();
enableSettlements();
