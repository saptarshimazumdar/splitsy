// People + expenses in integer paise. An actual expense has { paid, owed }; an estimate has { amt }.
// Balances and budget are derived, never stored.
const STORAGE_KEY = 'split';
const ARCHIVED_KEY = 'archived';
const MAX_ARCHIVES = 5;
const STORE_VERSION = 3;
const KIND_ACTUAL = 'actual';
const KIND_ESTIMATE = 'estimate';

let cache = null;
window.addEventListener('storage', (event$) => {
    if (event$.key === STORAGE_KEY || event$.key === null) cache = null;
});

const emptyStore = () => ({ v: STORE_VERSION, name: '', people: [], expenses: [] });

const getStore = () => {
    if (cache) return cache;
    let parsed = null;
    try {
        parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {}
    if (parsed?.v === STORE_VERSION) {
        cache = parsed;
        return cache;
    }
    setStore(emptyStore());
    return cache;
}

const setStore = (store) => {
    cache = store;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

const resetStore = () => setStore(emptyStore());

const getPeople = () => getStore().people;

const getPersonName = (store, id) => store.people.find(person => person.id === id)?.name ?? '?';

const getExpenseTotal = (expense) => expense.paid.reduce((acc, it) => acc + it.amt, 0);

const isEstimate = (expense) => expense.kind === KIND_ESTIMATE;

const hasExpenses = (store, id) => store.expenses.some(expense =>
    !isEstimate(expense) && (expense.paid.some(it => it.p === id) || expense.owed.some(it => it.p === id)));

// Net paise per person: paid minus owed, actual expenses only
const getBalances = (store) => {
    const balances = Object.fromEntries(store.people.map(person => [person.id, 0]));
    store.expenses.filter(expense => !isEstimate(expense)).forEach(({ paid, owed }) => {
        paid.forEach(({ p, amt }) => { balances[p] = (balances[p] || 0) + amt; });
        owed.forEach(({ p, amt }) => { balances[p] = (balances[p] || 0) - amt; });
    });
    return balances;
}

// Budget: estimates plus any actual or advance not tied to an estimate. Spent: every actual and advance.
const getBudget = (store) => {
    const estimates = store.expenses.filter(isEstimate);
    const actuals = store.expenses.filter(it => !isEstimate(it));
    const unbudgeted = actuals.filter(it => !it.estimateId).reduce((acc, it) => acc + getExpenseTotal(it), 0);
    const budget = estimates.reduce((acc, it) => acc + it.amt, 0) + unbudgeted;
    const spent = actuals.reduce((acc, it) => acc + getExpenseTotal(it), 0);
    return { hasBudget: estimates.length > 0, budget, spent, left: budget - spent };
}

const getLinkedExpenses = (store, estimate) => store.expenses.filter(it => it.estimateId === estimate.id);

const getPaidSoFar = (store, estimate) =>
    getLinkedExpenses(store, estimate).reduce((acc, it) => acc + getExpenseTotal(it), 0);

// Final amount of a budget item: the agreed total, else what its single actual cost
const getItemActual = (store, estimate) => {
    if (estimate.agreedAmt) return estimate.agreedAmt;
    return getLinkedExpenses(store, estimate).length ? getPaidSoFar(store, estimate) : null;
}

// Positive: spent more than estimated
const getVariance = (store, estimate) => {
    const actual = getItemActual(store, estimate);
    return actual === null ? null : actual - estimate.amt;
}

const describeVariance = (paise) => paise === 0
    ? 'on budget'
    : `${paise > 0 ? 'over' : 'under'} by ₹${formatPaise(Math.abs(paise))}`;

const describeBudget = ({ budget, spent, left }) =>
    `Budget ₹${formatPaise(budget)} · Spent ₹${formatPaise(spent)} · ${left >= 0 ? `₹${formatPaise(left)} left` : `₹${formatPaise(-left)} over budget`}`;

const getStoreTitle = (store) => store.name?.trim()
    || `Expense of ${replaceLastOccurrence(store.people.map(person => person.name).join(', '), ',', ' and')}`;

const setArchives = (archives) => {
    localStorage.setItem(ARCHIVED_KEY, JSON.stringify(archives.slice(0, MAX_ARCHIVES)));
}

const getArchives = () => {
    let archives = [];
    try {
        archives = JSON.parse(localStorage.getItem(ARCHIVED_KEY)) || [];
    } catch (e) {}
    return archives.filter(entry => entry.data?.v === STORE_VERSION);
}

const archiveStore = () => {
    const store = getStore();
    setArchives([{ id: newId(), ts: Date.now(), title: getStoreTitle(store), data: store }, ...getArchives()]);
}
