const FORM_GROUP_NAMES = 'form-group-names';
const FORM_GROUP_NAMES_PERSONS = 'persons';
const FORM_GROUP_NAMES_DISPLAY = 'added-names';
const NAME_CONTAINER = 'names-container';
const EXPENSES_CONTAINER = 'expenses-container';
const PAID_BY = 'paid-by';
const EXPENSE_FORM = 'form-group-expenses';
const EXPENSE_LIST_TABLE_BODY = 'expense-list-table-body';
const DIVIDED_AMONG = 'divided-among';
const SETTLEMENT_CONTAINER = 'settlement-container';
const SETTLEMENT_LIST = 'settlement-list';


const formGroupName = document.getElementById(FORM_GROUP_NAMES);
const expenseFormGroup = document.getElementById(EXPENSE_FORM);
const expenseListTableBody = document.getElementById(EXPENSE_LIST_TABLE_BODY);
const nameContainer = document.getElementById(NAME_CONTAINER);
const expenseContainer = document.getElementById(EXPENSES_CONTAINER);
const dividedAmong = document.getElementById(DIVIDED_AMONG);
const paidBy = document.getElementById(PAID_BY);
const settlementContainer = document.getElementById(SETTLEMENT_CONTAINER);
const settlementList = document.getElementById(SETTLEMENT_LIST);

// Single storage: store both people and expenses under one key
const STORAGE_KEY = 'split';
const EXPENSE_KEY = 'expenses';
const ARCHIVED_KEY = 'archived';

const getStore = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawExpenses = localStorage.getItem(EXPENSE_KEY);

    // empty default
    if (!raw && !rawExpenses) return { people: {}, expenses: [] };

    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            // already migrated shape
            if (parsed && (parsed.people !== undefined || parsed.expenses !== undefined)) {
                // merge legacy separate 'expenses' if present
                if (rawExpenses) {
                    try {
                        const parsedExp = JSON.parse(rawExpenses);
                        parsed.expenses = (parsed.expenses || []).concat(Array.isArray(parsedExp) ? parsedExp : []);
                    } catch (e) {}
                    localStorage.removeItem(EXPENSE_KEY);
                }
                return { people: parsed.people || {}, expenses: parsed.expenses || [] };
            }

            // old format: parsed is people map or expenses array
            if (Array.isArray(parsed)) {
                const store = { people: {}, expenses: parsed };
                if (rawExpenses) {
                    try {
                        const parsedExp = JSON.parse(rawExpenses);
                        store.expenses = (Array.isArray(parsedExp) ? parsedExp : []).concat(store.expenses);
                    } catch (e) {}
                    localStorage.removeItem(EXPENSE_KEY);
                }
                // persist migrated shape
                localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
                return store;
            }

            // parsed is people mapping
            const store = { people: parsed, expenses: [] };
            if (rawExpenses) {
                try {
                    store.expenses = JSON.parse(rawExpenses) || [];
                } catch (e) {
                    store.expenses = [];
                }
                localStorage.removeItem(EXPENSE_KEY);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
            return store;
        } catch (e) {
            // ignore and fallthrough
        }
    }

    if (rawExpenses) {
        try {
            const parsedExp = JSON.parse(rawExpenses);
            const store = { people: {}, expenses: Array.isArray(parsedExp) ? parsedExp : [] };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
            localStorage.removeItem(EXPENSE_KEY);
            return store;
        } catch (e) {
            return { people: {}, expenses: [] };
        }
    }

    return { people: {}, expenses: [] };
}

const archiveStore = () => {
    const store = getStore();
    const backupSplit = {
        timestamp: new Date().toISOString(),
        id: uuid.v4(),
        title: `Expense of ${replaceLastOccurrence(Object.values(store?.people)?.map(el => el?.name).join(', '), ',', ' and')}`,
        backup: backup(getStore())
    }
    localStorage.getItem(ARCHIVED_KEY);
    const existingArchives = JSON.parse(localStorage.getItem(ARCHIVED_KEY)) || [];
    existingArchives.length >= 5 && existingArchives.pop();
    existingArchives.unshift(backupSplit);
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(existingArchives));
}

const resetStore = () => {
    const emptyStore = { people: {}, expenses: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyStore));
    localStorage.removeItem(EXPENSE_KEY);
}

const archiveExpense = () => {
    archiveStore();
    resetStore();
    editNames();
    setStakeholders();
}

const setStore = (store) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ people: store.people || {}, expenses: store.expenses || [] }));
    localStorage.removeItem(EXPENSE_KEY);
}


formGroupName.addEventListener('submit', function (event$) {
    event$.preventDefault();
    const stakeholders = event$.target.elements[FORM_GROUP_NAMES_PERSONS].value?.split(',')
        .filter(name => !!name).map(name => name.trim());

    const store = getStore();
    const existingPeople = store.people || {};

    if (stakeholders && stakeholders.length) {
        stakeholders.reduce((acc, name) => {
            acc[name] = { name, spend: [], expense: [] };
            return acc;
        }, existingPeople);
        store.people = existingPeople;
        setStore(store);
    } else {
        alert('Please enter at least one stakeholder name.');
    }
    event$.target.elements[FORM_GROUP_NAMES_PERSONS].value = '';
    setStakeholders();
});

expenseFormGroup.addEventListener('submit', function (event$) {
    event$.preventDefault();
    const response = [...event$.target.elements].reduce((acc, el) => {
        if (el.type === 'checkbox') {
            if (el.checked) {
                acc.individual.push(el.value);
            }
        } else if (el.name === 'contribution') {
            acc['equal'] = Boolean(Number(el.value));
        } else {
            acc[el.name] = el.value;
        }
        return acc;
    }, ({
        individual: []
    }))
    processExpense(response);
    closeExpenseForm();
});

expenseFormGroup.addEventListener('reset', function () {
    closeExpenseForm();
});


const getAvailableStakeholders = () => {
    const store = getStore();
    return Object.values(store.people || {}).map(item => item.name);
}

const setStakeholders = () => {
    document.getElementById(FORM_GROUP_NAMES_DISPLAY)
        .getElementsByTagName('tbody')[0].innerHTML = getAvailableStakeholders()
            .map(name => `
            <tr>
                <td>${name}</td>
                <td class="column-action" onclick="removeStakeholders('${name}')">&#x2717;</td>
            </tr>
        `).join('\n');
}

const setPaidBy = () => {
    paidBy.innerHTML = getAvailableStakeholders().map(name => `
            <option value="${name}">${name}</option>
        `).join('\n');
}

const setDividedAmong = () => {
    dividedAmong.innerHTML = getAvailableStakeholders().map(name => `
            <span class="stakeholder">
                <input type="checkbox" id="${name.toLowerCase()}-payee-id" name="${name.toLowerCase()}-payee" value="${name}">
                <label for="${name.toLowerCase()}-payee-id">${name}</label>
            </span>
        `).join('\n');
}

const fillExpenseTable = () => {
    const store = getStore();
    const expenses = store.expenses || [];
    var template = `
            <tr>
                <div class="no-expenses">No expenses recorded yet.</div>
            </tr>
        `;
    if (expenses && expenses.length > 0) {
        template = expenses.map(expense => `
            <div class="expense-list-table-item">
                <div class="line">
                    <span class="expense-list-table-item-name">
                        <strong>${expense.item}</strong>
                    </span>
                    <span class="expense-list-table-item-amount">
                        <small>&#8377;${expense.price}</small>
                    </span>
                </div>
                <div class="line">
                    <span class="expense-list-table-item-paid-by">
                        <small>${expense.payer}</small>
                    </span>
                    <span class="expense-list-table-item-remove-expense" onclick="removeExpense('${expense.id}')">
                        <strong>&minus;</strong>
                    </span>
                </div>
            </div>
        `).join('\n');
    }

    expenseListTableBody.innerHTML = template;
}

const fillSettlementList = () => {
    const store = getStore();
    if (!store || !store.people || Object.keys(store.people).length === 0) {
        settlementList.innerHTML = `<div class="no-expenses">No stakeholders found.</div>`;
    } else {
        const splitData = JSON.parse(JSON.stringify(store.people));
        Object.entries(splitData).forEach(([name, data]) => {
            const spend = data.spend.reduce((acc, item) => acc + item.price, 0);
            const expense = data.expense.reduce((acc, item) => acc + item.price, 0);
            splitData[name].balance = round(spend - expense);
        });

        settlementList.innerHTML = getAvailableStakeholders().map(name => {
            const data = splitData[name];
            const [balance, indicator] = data.balance > 0 ? [data.balance, 'needs to collect'] : [-1 * data.balance, 'needs to pay'];
            return `
                <div class="settlement-list-item">
                    <button type="button" class="individual-settlement">${name} ${indicator} &#8377; ${balance}</button>
                    <div class="collapsible-settlement-content">
                        <small>
                            <p>You have paid for: ${validEmpty(data.spend.map(it => it.item + ' (&#8377;' + it.price + ')').join(', ')) ?? 'nothing as of now'}</p>
                            <p>You have spent on: ${validEmpty(data.expense.map(it => it.item + ' (&#8377;' + it.price + ')').join(', ')) ?? 'nothing as of now'}</p>
                        </small>
                    </div>
                </div>
            `;
        }).join('\n');
    }
}

const removeStakeholders = (name) => {
    const store = getStore();
    if (store && store.people) {
        delete store.people[name];
        setStore(store);
        setStakeholders();
    } else {
        alert('No stakeholders found to remove.');
    }
}

const addExpenses = () => {
    nameContainer.classList.add('hide');
    expenseContainer.classList.remove('hide');
    setTimeout(() => {
        nameContainer.style.display = 'none';
        expenseContainer.style.display = 'inherit';
    }, 25);
    fillExpenseTable();
}

const removeExpense = (id) => {
    const store = getStore();
    if (store && store.expenses) {
        const expenseToRemove = store.expenses.find(exp => exp.id === id);
        if (expenseToRemove) {
            const { payer, item, price, individual, equal } = expenseToRemove;
            const everyone = equal ? Object.keys(store.people) : individual;
            const amount = divideMoney(price, everyone.length);

            // Remove from payer's spend
            store.people[payer].spend = store.people[payer].spend.filter(spendItem => !(spendItem.item === item && spendItem.price === price));

            // Remove from each individual's expense
            everyone.forEach(name => {
                store.people[name].expense = store.people[name].expense.filter(expenseItem => !(expenseItem.item === item && expenseItem.price === Number(amount)));
            });

            // Remove from expenses list
            store.expenses = store.expenses.filter(exp => exp.id !== id);

            setStore(store);
            fillExpenseTable();
            fillSettlementList();
        } else {
            alert('Expense not found.');
        }
    } else {
        alert('No expenses found to remove.');
    }
}

const toggleDividedAmong = (event$) => {
    dividedAmong.classList.toggle('remove-from-screen', !!Number(event$.value));
}

const editNames = () => {
    nameContainer.classList.remove('hide');
    expenseContainer.classList.add('hide');
    setTimeout(() => {
        nameContainer.style.display = 'inherit';
        expenseContainer.style.display = 'none';
    }, 25);
}

const editExpenses = () => {
    expenseContainer.classList.remove('hide');
    settlementContainer.classList.add('hide');
    setTimeout(() => {
        expenseContainer.style.display = 'inherit';
        settlementContainer.style.display = 'none';
    }, 25);
    fillExpenseTable();
}

const closeExpenseForm = () => {
    expenseFormGroup.reset();
    closeModal();
}

const processExpense = (response) => {
    const store = getStore();
    if (store && store.people) {
        const splitData = store.people;
        const { payer, item, price, individual, equal } = response;
        const everyone = equal ? Object.keys(splitData) : individual;
        const amount = divideMoney(price, everyone.length);
        splitData[payer].spend.push({
            id: uuid.v4(),
            item,
            price: Number(price)
        });
        everyone.forEach(name => {
            splitData[name].expense.push({
                id: uuid.v4(),
                item,
                price: Number(amount)
            });
        });

        store.people = splitData;
        setStore(store);
        populateExpense(response, everyone);
    } else {
        alert('No stakeholders found to process the expense.');
    }
    fillExpenseTable();
}

const populateExpense = (response, everyone) => {
    const store = getStore();
    const { payer, item, price, equal } = response;
    store.expenses = store.expenses || [];
    store.expenses.unshift({
        id: uuid.v4(),
        payer,
        item,
        price: Number(price),
        individual: everyone,
        equal: Boolean(Number(equal)),
        lastChanges: new Date().getTime()
    });
    setStore(store);
}

const settleExpenses = () => {
    expenseContainer.classList.add('hide');
    settlementContainer.classList.remove('hide');
    setTimeout(() => {
        expenseContainer.style.display = 'none';
        settlementContainer.style.display = 'inherit';
    }, 25);
    fillSettlementList();
    enableSettlements();
}

setStakeholders();
setPaidBy();
setDividedAmong();