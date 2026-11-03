// Guard against opening this page directly without a group name
if (!getStore().name) {
    location.replace('index.html');
}

const FORM_GROUP_NAMES = 'form-group-names';
const FORM_GROUP_NAMES_PERSONS = 'persons';
const FORM_GROUP_NAMES_DISPLAY = 'added-names';

const formGroupName = document.getElementById(FORM_GROUP_NAMES);

const showMessage = (message) => {
    document.getElementById('message-text').textContent = message;
    document.getElementById('message-modal').style.display = 'block';
}

const closeMessage = () => {
    document.getElementById('message-modal').style.display = 'none';
}

formGroupName.addEventListener('submit', function (event$) {
    event$.preventDefault();
    const input = event$.target.elements[FORM_GROUP_NAMES_PERSONS];
    const name = input.value.trim();
    const store = getStore();

    if (!name) {
        showMessage('Please enter a member name.');
    } else if (store.people.some(person => person.name.toLowerCase() === name.toLowerCase())) {
        showMessage('That name is already added.');
    } else {
        store.people.push({ id: newId(), name });
        setStore(store);
        input.value = '';
    }
    input.focus();
    setMembers();
});

const setMembers = () => {
    const store = getStore();
    document.getElementById(FORM_GROUP_NAMES_DISPLAY)
        .getElementsByTagName('tbody')[0].innerHTML = store.people
            .map(({ id, name }) => `
            <tr>
                <td>${escapeHtml(name)}</td>
                ${hasExpenses(store, id)
                    ? '<td class="column-action"></td>'
                    : `<td class="column-action" onclick="removeMember('${id}')">&#x2717;</td>`}
            </tr>
        `).join('\n');
}

const removeMember = (id) => {
    const store = getStore();
    if (!hasExpenses(store, id) && store.people.some(person => person.id === id)) {
        store.people = store.people.filter(person => person.id !== id);
        setStore(store);
        setMembers();
    } else {
        showMessage('No members found to remove.');
    }
}

const addExpenses = () => {
    if (!getPeople().length) {
        showMessage('Please add at least one member before adding expenses.');
        return;
    }
    location.href = 'expenses.html';
}

const goHome = () => {
    location.href = 'index.html';
}

setMembers();
