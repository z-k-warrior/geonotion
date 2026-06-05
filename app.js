let db = null;
const DB_NAME = "GeonotionDB";
const DB_VERSION = 1;
const OBJECT_STORE_NAME = "notes";

function openDB() {
    /* 
    Opens async connection to IndexedDB.   
    */
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        // IDBOpenDBRequest

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            /* Event 'onupgradeneeded' fires if object store is not found.
               In that case we create it from scratch.
               Indexes are useless for now.
             */
            const database = event.target.result;
            if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
                const store = database.createObjectStore(OBJECT_STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
            }
        };
    });
}

function loadAllNotes() {
    /* 
    Makes transaction to IndexedDB to get all notes from object store. 
    */ 
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }

        const transaction = db.transaction(OBJECT_STORE_NAME, 'readonly');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function saveNoteToStorage(content, latitude, longitude) {
    /*
    Makes transaction to IndexedDB to save note to object store. 
    */
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error("Database not initialized"));
            return;
        }

        const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const request = store.add({ text: content, lat: latitude, lng: longitude });
        // stores key:value pairs, 'id' is a key that gets returned in request.result

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function deleteNoteFromStorage(id) {
    /*
    Makes transaction to IndexedDB to delete note from object store by id. 
    */
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }

        const transaction = db.transaction(OBJECT_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(OBJECT_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getGeolocationData() {
    /*
    Receives geolocation from Geolocation API.
     */
    return new Promise((resolve, reject) => {
        const geolocationProperties = {
            enableHighAccuracy: false,
            timeout: 10000
        };

        const geolocation = navigator.geolocation;
        if (!geolocation) {
            reject(new Error("Geolocation is not supported"));
            return;
        }

        geolocation.getCurrentPosition(
            // getCurrentPosition() accepts success and error functions, also options
            // doesn't work if https is not enabled (?)
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                reject(error)
            },
            geolocationProperties
        );
    });
}

function createNoteElement(note) {
    /*
    Creates note's DOM element and returns it. 
    */
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    noteElement.dataset.id = note.id;

    const noteText = document.createElement('div');
    noteText.classList.add('note-text');
    noteText.textContent = note.text;

    const noteLocation = document.createElement('div');
    noteLocation.classList.add('note-location');
    if (note.lat && note.lng) {
        noteLocation.textContent = `Location: ${note.lat.toFixed(3)}, ${note.lng.toFixed(3)}`;
    }
    else {
        noteLocation.textContent = "Location not available";
    }

    const noteDeleteButton = document.createElement('button');
    noteDeleteButton.classList.add('note-delete-button');
    noteDeleteButton.textContent = 'Delete Note';

    noteElement.appendChild(noteText);
    noteElement.appendChild(noteLocation);
    noteElement.appendChild(noteDeleteButton);

    noteDeleteButton.addEventListener('click', async () => {
        try {
            await deleteNoteFromStorage(note.id);
            noteElement.remove();
        } catch (error) {
            console.error("Failed to delete note:", error);
        }
    });

    return noteElement;
}

async function createNote() {
    /*
    Gets text from textarea and creates a note, then saves it into IndexedDB and draws it. 
    */
    const noteTextArea = document.getElementById('add-note-textarea');
    const content = noteTextArea.value.trim();

    if (content == "") {
        alert("Enter note's text please.")
        return;
    }

    try {
        const geolocation = await getGeolocationData();

        const latitude = geolocation.latitude;
        const longitude = geolocation.longitude;

        const newId = await saveNoteToStorage(content, latitude, longitude);

        const note = { id: newId, text:content, lat: latitude, lng: longitude};
        
        const notesContainer = document.getElementById('notes-container');
        const noteElement = createNoteElement(note);
        notesContainer.appendChild(noteElement);

        noteTextArea.value = "";
    } catch (error) {
        console.warn("Failed to create note with geolocation:", error);

        const newId = await saveNoteToStorage(content, null, null);
        const note = { id: newId, text: content, lat: null, lng: null};

        const notesContainer = document.getElementById('notes-container');
        const noteElement = createNoteElement(note);
        notesContainer.appendChild(noteElement);

        noteTextArea.value = "";
        alert("Geolocation failed: saving note without coordinates.");
    }
}

async function populatePage() {
    /*
    On startup loads all notes from IndexedDB and draws its DOM. 
    */
    const notesContainer = document.getElementById('notes-container');
    notesContainer.innerHTML = "";

    try {
        const notes = await loadAllNotes();
        notes.forEach((note) => {
            const noteElement = createNoteElement(note);
            notesContainer.appendChild(noteElement);
        });
    } catch (error) {
        console.error("Failed to load notes:", error);
    }
}

async function init() {
    /*
    Runs on startup. 
    */
    try {
        await openDB();
        await populatePage();

        const submitNoteButton = document.getElementById('add-note-submit-button');
        submitNoteButton.addEventListener('click', async () => {
            await createNote();
        });
    } catch (error) {
        console.error("Failed to initialize:", error);
    }
}


window.addEventListener('load', init);