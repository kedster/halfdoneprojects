        // API Configuration - Replace with your Cloudflare Workers endpoints
        const API_BASE = 'https://halfdoneprojects-worker.sethkeddy.workers.dev'; 
        
        // App State
        let currentUser = null;
        let authToken = null;
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
            noteContent: document.getElementById('noteContent'),
            loginError: document.getElementById('loginError'),
            welcomeMessage: document.getElementById('welcomeMessage')
        };

        // Utility Functions
        function formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showError(message) {
            els.loginError.textContent = message;
            els.loginError.classList.remove('hidden');
        }

        function hideError() {
            els.loginError.classList.add('hidden');
        }

        // API Functions matching your Cloudflare Worker
        async function apiCall(endpoint, options = {}) {
            const url = API_BASE + endpoint;
            const config = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };

            if (authToken) {
                config.headers.Authorization = `Bearer ${authToken}`;
            }

            if (options.body) {
                config.body = JSON.stringify(options.body);
            }

            try {
                const response = await fetch(url, config);
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Request failed');
                }
                
                return data;
            } catch (error) {
                console.error('API Error:', error);
                throw error;
            }
        }

        // Auth Functions
        async function login(username, password) {
            try {
                hideError();
                const response = await apiCall('/auth/login', {
                    method: 'POST',
                    body: { username, password }
                });
                
                authToken = response.token;
                currentUser = username;
                
                // Store token for persistence
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('currentUser', username);
                
                showNotesSection();
                await loadNotes();
            } catch (error) {
                showError('Login failed: ' + error.message);
            }
        }

        async function validateSession() {
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('currentUser');
            
            if (!storedToken || !storedUser) {
                showAuthSection();
                return;
            }

            try {
                authToken = storedToken;
                // Since we don't have a real API, just show auth section for now
                // Uncomment the lines below when you have your Worker deployed
                // const response = await apiCall('/auth/validate');
                // currentUser = response.user;
                // showNotesSection();
                // await loadNotes();
                showAuthSection(); // Show login for now
            } catch (error) {
                // Invalid session, clear storage and show auth
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                showAuthSection();
            }
        }

        function logout() {
            currentUser = null;
            authToken = null;
            notes = [];
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
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
            els.welcomeMessage.textContent = `${currentUser}'s Project Notes`;
        }

        function showModal(title = 'Add Note') {
            els.modalTitle.textContent = title;
            els.noteTitle.value = '';
            els.noteContent.value = '';
            els.noteModal.classList.add('show');
        }

        function hideModal() {
            els.noteModal.classList.remove('show');
        }

        // Notes Functions
        async function loadNotes() {
            try {
                const response = await apiCall('/notes');
                notes = response.notes || [];
                renderNotes();
            } catch (error) {
                console.error('Failed to load notes:', error);
                alert('Failed to load notes: ' + error.message);
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
                            Created: ${formatDate(note.created)}
                        </div>
                    </div>
                    <div class="note-actions">
                        <button class="btn btn-sm btn-danger" onclick="deleteNote('${note.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        async function saveNote(title, content) {
            try {
                await apiCall('/notes', {
                    method: 'POST',
                    body: { title, content }
                });
                hideModal();
                await loadNotes();
            } catch (error) {
                alert('Failed to save note: ' + error.message);
            }
        }

        async function deleteNote(noteId) {
            if (confirm('Are you sure you want to delete this note?')) {
                try {
                    // Note: Your current Worker doesn't have delete endpoint
                    // You'll need to add this to your Worker
                    alert('Delete functionality needs to be added to your Cloudflare Worker');
                } catch (error) {
                    alert('Failed to delete note: ' + error.message);
                }
            }
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
            const title = formData.get('title');
            const content = formData.get('content');
            
            if (!title.trim()) {
                alert('Please enter a title');
                return;
            }
            
            await saveNote(title, content);
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

        // Make functions globally available for inline onclick handlers
        window.deleteNote = deleteNote;

        // Initialize App
        window.addEventListener('DOMContentLoaded', () => {
            validateSession();
        });