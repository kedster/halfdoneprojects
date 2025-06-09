        // API Configuration - Replace with your Cloudflare Workers endpoints
        const API_BASE = '/api'; // This would be your Cloudflare Workers domain
        
        // App State
        let currentUser = null;
        let currentNoteId = null;
        let notes = [];

        // DOM Elements
        const els = {
            authSection: document.getElementById('authSection'),
            notesSection: document.getElementById('notesSection'),
            authForm: document.getElementById('authForm'),
            notesList: document.getElementById('notesList'),
            noteModal: document.getElementById('noteModal'),
            noteForm: document.getElementById('noteForm'),
            addNoteBtn: document.getElementById('addNoteBtn'),
            logoutBtn: document.getElementById('logoutBtn'),
            closeModal: document.getElementById('closeModal'),
            cancelBtn: document.getElementById('cancelBtn'),
            modalTitle: document.getElementById('modalTitle'),
            noteTitle: document.getElementById('noteTitle'),
            noteContent: document.getElementById('noteContent')
        };

        // Utility Functions
        function generateSessionId() {
            return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        }

        function getSessionId() {
            let sessionId = localStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = generateSessionId();
                localStorage.setItem('sessionId', sessionId);
            }
            return sessionId;
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        // API Functions (simulated - replace with actual Cloudflare Workers API calls)
        async function apiCall(endpoint, options = {}) {
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const sessionId = getSessionId();
            
            // Simulate different endpoints
            switch(endpoint) {
                case '/auth/login':
                    const { username, password } = options.body;
                    // Simple auth simulation - in real app, this would validate against your backend
                    if (username && password) {
                        const userData = { id: username, username, sessionId };
                        localStorage.setItem('currentUser', JSON.stringify(userData));
                        return { success: true, user: userData };
                    }
                    throw new Error('Invalid credentials');

                case '/auth/validate':
                    const storedUser = localStorage.getItem('currentUser');
                    if (storedUser) {
                        return { success: true, user: JSON.parse(storedUser) };
                    }
                    throw new Error('No valid session');

                case '/notes':
                    if (options.method === 'POST') {
                        // Create note
                        const newNote = {
                            id: 'note_' + Date.now(),
                            ...options.body,
                            userId: currentUser.id,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        };
                        const userNotes = JSON.parse(localStorage.getItem(`notes_${currentUser.id}`) || '[]');
                        userNotes.push(newNote);
                        localStorage.setItem(`notes_${currentUser.id}`, JSON.stringify(userNotes));
                        return { success: true, note: newNote };
                    } else {
                        // Get notes
                        const userNotes = JSON.parse(localStorage.getItem(`notes_${currentUser.id}`) || '[]');
                        return { success: true, notes: userNotes };
                    }

                case `/notes/${options.noteId}`:
                    const userNotes = JSON.parse(localStorage.getItem(`notes_${currentUser.id}`) || '[]');
                    if (options.method === 'PUT') {
                        // Update note
                        const noteIndex = userNotes.findIndex(n => n.id === options.noteId);
                        if (noteIndex >= 0) {
                            userNotes[noteIndex] = { ...userNotes[noteIndex], ...options.body, updatedAt: new Date().toISOString() };
                            localStorage.setItem(`notes_${currentUser.id}`, JSON.stringify(userNotes));
                            return { success: true, note: userNotes[noteIndex] };
                        }
                    } else if (options.method === 'DELETE') {
                        // Delete note
                        const filteredNotes = userNotes.filter(n => n.id !== options.noteId);
                        localStorage.setItem(`notes_${currentUser.id}`, JSON.stringify(filteredNotes));
                        return { success: true };
                    }
                    throw new Error('Note not found');

                default:
                    throw new Error('Endpoint not found');
            }
        }

        // Auth Functions
        async function login(username, password) {
            try {
                const response = await apiCall('/auth/login', {
                    method: 'POST',
                    body: { username, password }
                });
                currentUser = response.user;
                showNotesSection();
                await loadNotes();
            } catch (error) {
                alert('Login failed: ' + error.message);
            }
        }

        async function validateSession() {
            try {
                const response = await apiCall('/auth/validate');
                currentUser = response.user;
                showNotesSection();
                await loadNotes();
            } catch (error) {
                showAuthSection();
            }
        }

        function logout() {
            currentUser = null;
            localStorage.removeItem('currentUser');
            notes = [];
            showAuthSection();
        }

        // UI Functions
        function showAuthSection() {
            els.authSection.classList.remove('hidden');
            els.notesSection.classList.add('hidden');
        }

        function showNotesSection() {
            els.authSection.classList.add('hidden');
            els.notesSection.classList.remove('hidden');
        }

        function showModal(title = 'Add Note', note = null) {
            els.modalTitle.textContent = title;
            if (note) {
                els.noteTitle.value = note.title;
                els.noteContent.value = note.content;
                currentNoteId = note.id;
            } else {
                els.noteTitle.value = '';
                els.noteContent.value = '';
                currentNoteId = null;
            }
            els.noteModal.classList.add('show');
        }

        function hideModal() {
            els.noteModal.classList.remove('show');
            currentNoteId = null;
        }

        // Notes Functions
        async function loadNotes() {
            try {
                const response = await apiCall('/notes');
                notes = response.notes;
                renderNotes();
            } catch (error) {
                console.error('Failed to load notes:', error);
            }
        }

        function renderNotes() {
            if (notes.length === 0) {
                els.notesList.innerHTML = '<div class="empty-state">No notes yet. Click "Add Note" to get started!</div>';
                return;
            }

            els.notesList.innerHTML = notes.map(note => `
                <div class="note-item">
                    <div class="note-content">
                        <h3>${escapeHtml(note.title)}</h3>
                        <p>${escapeHtml(note.content.substring(0, 100))}${note.content.length > 100 ? '...' : ''}</p>
                        <div class="note-meta">
                            Created: ${formatDate(note.createdAt)}
                            ${note.updatedAt !== note.createdAt ? ` • Updated: ${formatDate(note.updatedAt)}` : ''}
                        </div>
                    </div>
                    <div class="note-actions">
                        <button class="btn btn-sm" onclick="editNote('${note.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteNote('${note.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        async function saveNote(title, content) {
            try {
                if (currentNoteId) {
                    // Update existing note
                    await apiCall(`/notes/${currentNoteId}`, {
                        method: 'PUT',
                        noteId: currentNoteId,
                        body: { title, content }
                    });
                } else {
                    // Create new note
                    await apiCall('/notes', {
                        method: 'POST',
                        body: { title, content }
                    });
                }
                hideModal();
                await loadNotes();
            } catch (error) {
                alert('Failed to save note: ' + error.message);
            }
        }

        async function editNote(noteId) {
            const note = notes.find(n => n.id === noteId);
            if (note) {
                showModal('Edit Note', note);
            }
        }

        async function deleteNote(noteId) {
            if (confirm('Are you sure you want to delete this note?')) {
                try {
                    await apiCall(`/notes/${noteId}`, {
                        method: 'DELETE',
                        noteId
                    });
                    await loadNotes();
                } catch (error) {
                    alert('Failed to delete note: ' + error.message);
                }
            }
        }

        // Utility function to escape HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Event Listeners
        els.authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await login(formData.get('username'), formData.get('password'));
        });

        els.noteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await saveNote(formData.get('title'), formData.get('content'));
        });

        els.addNoteBtn.addEventListener('click', () => showModal());
        els.logoutBtn.addEventListener('click', logout);
        els.closeModal.addEventListener('click', hideModal);
        els.cancelBtn.addEventListener('click', hideModal);

        // Close modal when clicking outside
        els.noteModal.addEventListener('click', (e) => {
            if (e.target === els.noteModal) {
                hideModal();
            }
        });

        // Initialize App
        window.addEventListener('DOMContentLoaded', () => {
            validateSession();
        });

        // Make functions globally available for inline onclick handlers
        window.editNote = editNote;
        window.deleteNote = deleteNote;