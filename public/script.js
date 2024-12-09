document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const notesList = document.getElementById('notesList');
    const noteEditor = document.getElementById('noteEditor');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const titleInput = document.getElementById('noteTitle');
    const contentInput = document.getElementById('noteContent');
    const searchInput = document.getElementById('searchNotes');
    const mobileFab = document.getElementById('mobileFab');

    // State
    let currentNoteId = null;
    let notes = [];
    let saveTimeout = null;

    // Auto-save functionality
    const autoSave = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveNote, 1000);
    };

    // Fetch existing notes
    const fetchNotes = async () => {
        try {
            const response = await fetch('/api/notes');
            if (!response.ok) throw new Error('Failed to fetch notes');
            notes = await response.json();
            renderNotesList();
        } catch (error) {
            console.error('Error fetching notes:', error);
            alert('Failed to load notes. Please refresh the page.');
        }
    };

    // Render notes list
    const renderNotesList = (searchTerm = '') => {
        const filteredNotes = notes
            .filter(note => {
                const term = searchTerm.toLowerCase();
                return note.title.toLowerCase().includes(term) ||
                       note.content.toLowerCase().includes(term);
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        notesList.innerHTML = filteredNotes
            .map(note => `
                <div class="note-item ${note.id === currentNoteId ? 'active' : ''}" data-id="${note.id}">
                    <h3>${escapeHtml(note.title || 'Untitled')}</h3>
                    <p>${escapeHtml(note.content.substring(0, 100))}${note.content.length > 100 ? '...' : ''}</p>
                </div>
            `)
            .join('');
    };

    // Create new note
    const createNewNote = async () => {
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Untitled',
                    content: ''
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create note');
            }

            const newNote = await response.json();
            console.log('Created note:', newNote);
            notes.unshift(newNote);
            selectNote(newNote.id);
            renderNotesList();
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Failed to create note. Please try again.');
        }
    };

    // Save note
    const saveNote = async () => {
        if (!currentNoteId) return;

        try {
            const noteData = {
                title: titleInput.value.trim() || 'Untitled',
                content: contentInput.value.trim()
            };

            const response = await fetch(`/api/notes/${currentNoteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save note');
            }

            const updatedNote = await response.json();
            const noteIndex = notes.findIndex(n => n.id === currentNoteId);
            notes[noteIndex] = updatedNote;
            renderNotesList();
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Failed to save note. Please try again.');
        }
    };

    // Select note
    const selectNote = (noteId) => {
        currentNoteId = noteId;
        const note = notes.find(n => n.id === noteId);
        
        if (note) {
            welcomeScreen.style.display = 'none';
            noteEditor.style.display = 'flex';
            titleInput.value = note.title || '';
            contentInput.value = note.content || '';
            renderNotesList();
        }
    };

    // Delete note
    const deleteNote = async (noteId) => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete note');
            }

            notes = notes.filter(note => note.id !== noteId);
            if (currentNoteId === noteId) {
                currentNoteId = null;
                welcomeScreen.style.display = 'flex';
                noteEditor.style.display = 'none';
            }
            renderNotesList();
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Failed to delete note. Please try again.');
        }
    };

    // Escape HTML to prevent XSS
    const escapeHtml = (unsafe) => {
        return (unsafe || '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    // Event Listeners
    newNoteBtn.addEventListener('click', createNewNote);
    mobileFab.addEventListener('click', createNewNote);

    titleInput.addEventListener('input', autoSave);
    contentInput.addEventListener('input', autoSave);

    searchInput.addEventListener('input', (e) => {
        renderNotesList(e.target.value);
    });

    notesList.addEventListener('click', (e) => {
        const noteItem = e.target.closest('.note-item');
        if (noteItem) {
            selectNote(noteItem.dataset.id);
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + N for new note
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            createNewNote();
        }
        // Ctrl/Cmd + S for save
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveNote();
        }
    });

    // Add dark mode toggle
    const themeButton = document.createElement('button');
    themeButton.textContent = '';
    themeButton.classList.add('action-button', 'secondary');
    themeButton.style.marginLeft = '10px';
    document.querySelector('.sidebar-header').appendChild(themeButton);

    let isDarkMode = false;
    themeButton.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark-mode');
        themeButton.textContent = isDarkMode ? '' : '';
    });

    // Mobile sidebar toggle
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const isSidebarClick = e.target.closest('.sidebar');
        const isMobileFabClick = e.target.closest('.mobile-fab');
        
        if (!isSidebarClick && !isMobileFabClick && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    });

    // Initialize
    fetchNotes();
});
