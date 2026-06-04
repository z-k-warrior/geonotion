let db = null;
const DB_NAME = 'GeonotionDB';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const store = database.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('text', 'text', { unique: false });
            }
        };
    });
}

function loadAllNotes() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function saveNoteToStorage(content) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add({ text: content });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteNoteFromStorage(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function createNoteElement(note) {
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    noteElement.dataset.id = note.id;

    const noteText = document.createElement('div');
    noteText.textContent = note.text;
    noteText.classList.add('note-text');

    const noteDeleteButton = document.createElement('button');
    noteDeleteButton.classList.add('note-delete-button');
    noteDeleteButton.textContent = 'Delete Note';

    noteElement.appendChild(noteText);
    noteElement.appendChild(noteDeleteButton);

    noteDeleteButton.addEventListener('click', async () => {
        try {
            await deleteNoteFromStorage(note.id);
            noteElement.remove();
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    });

    return noteElement;
}

async function populatePage() {
    const notesContainer = document.getElementById('notes-container');
    notesContainer.innerHTML = '';

    try {
        const notes = await loadAllNotes();
        notes.forEach((note) => {
            const noteElement = createNoteElement(note);
            notesContainer.appendChild(noteElement);
        });
    } catch (error) {
        console.error('Failed to load notes:', error);
    }
}

async function createNote() {
    const noteTextArea = document.getElementById('add-note-textarea');
    const content = noteTextArea.value.trim();

    if (content === '') return;

    try {
        const newId = await saveNoteToStorage(content);
        
        const notesContainer = document.getElementById('notes-container');
        const noteElement = createNoteElement({ id: newId, text: content });
        notesContainer.appendChild(noteElement);

        noteTextArea.value = '';
    } catch (error) {
        console.error('Failed to create note:', error);
    }
}

async function init() {
    try {
        await openDB();
        await populatePage();

        const submitNoteButton = document.getElementById('add-note-submit-button');
        submitNoteButton.addEventListener('click', () => {
            createNote();
        });
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}


window.addEventListener('load', init);