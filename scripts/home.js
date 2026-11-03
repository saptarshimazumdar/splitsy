const groupNameInput = document.getElementById('group-name');

groupNameInput.addEventListener('input', () => {
    const store = getStore();
    store.name = groupNameInput.value.trim();
    setStore(store);
});

const renderGroupName = () => {
    groupNameInput.value = getStore().name || '';
}

const addMembers = () => {
    if (!getStore().name) {
        showMessage('Please enter a group name.');
        return;
    }
    location.href = 'members.html';
}

const showMessage = (message) => {
    document.getElementById('message-text').textContent = message;
    document.getElementById('message-modal').style.display = 'block';
}

const closeMessage = () => {
    document.getElementById('message-modal').style.display = 'none';
    groupNameInput.focus();
}

const buildHistoryRow = (title, subtitle, onSelect, onDelete, onArchive) => {
    const row = document.createElement('div');
    row.className = 'history-row';
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'history-item';
    const name = document.createElement('strong');
    name.textContent = title;
    const sub = document.createElement('small');
    sub.textContent = subtitle;
    item.append(name, sub);
    item.onclick = onSelect;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'history-delete';
    remove.title = 'Delete';
    remove.innerHTML = '&times;';
    remove.onclick = () => openConfirm(`Delete "${title}"?`, onDelete);
    if (onArchive) {
        const archive = document.createElement('button');
        archive.type = 'button';
        archive.className = 'history-delete';
        archive.title = 'Archive';
        archive.innerHTML = '&#128193;';
        archive.onclick = onArchive;
        row.append(item, archive, remove);
    } else {
        row.append(item, remove);
    }
    return row;
}

const revealFromArchived = () => {
    const archives = getArchives();
    const current = getStore();
    const hasCurrent = current.people.length > 0 || !!current.name;
    const list = document.getElementById('history-list');
    list.replaceChildren();
    if (!hasCurrent && !archives.length) {
        const empty = document.createElement('div');
        empty.className = 'no-expenses';
        empty.textContent = 'No expenses yet.';
        list.appendChild(empty);
    }
    if (hasCurrent) {
        list.appendChild(buildHistoryRow(getStoreTitle(current), 'In progress', closeHistory, deleteCurrent, archiveCurrent));
    }
    archives.forEach(({ id, title, ts }) => {
        list.appendChild(buildHistoryRow(
            title,
            new Date(ts).toLocaleString(),
            () => restoreFromArchived(id),
            () => deleteFromArchived(id)
        ));
    });
    document.getElementById('history-modal').style.display = 'block';
}

let toastTimer;
const showToast = (message) => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

const archiveCurrent = () => {
    const title = getStoreTitle(getStore());
    archiveStore();
    resetStore();
    renderGroupName();
    closeHistory();
    showToast(`Archived "${title}"`);
}

const deleteCurrent = () => {
    resetStore();
    renderGroupName();
    revealFromArchived();
}

const deleteFromArchived = (id) => {
    setArchives(getArchives().filter(it => it.id !== id));
    revealFromArchived();
}

const openConfirm = (message, onConfirm) => {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-accept').onclick = () => {
        closeConfirm();
        onConfirm();
    };
    document.getElementById('confirm-modal').style.display = 'block';
}

const closeConfirm = () => {
    document.getElementById('confirm-modal').style.display = 'none';
}

const closeHistory = () => {
    document.getElementById('history-modal').style.display = 'none';
}

const restoreFromArchived = (id) => {
    const archives = getArchives();
    const entry = archives.find(it => it.id === id);
    if (!entry) return;
    setStore(entry.data);
    setArchives(archives.filter(it => it.id !== id));
    renderGroupName();
    closeHistory();
}

renderGroupName();
