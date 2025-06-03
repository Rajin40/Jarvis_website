document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatInput = document.querySelector('.chat-input');
    const messagesContainer = document.querySelector('.messages-container');
    const welcome = document.querySelector('.welcome');
    const toolButtons = document.querySelector('.tool-buttons');
    const clearButton = document.querySelector('.clear-button');
    const sendButton = document.querySelector('.send-button');
    const newChatButton = document.querySelector('.new-chat-button');
    const themeToggle = document.querySelector('.theme-toggle');
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const sidebar = document.querySelector('.sidebar');
    const historyList = document.querySelector('.history-list');
    
    // Session management
    let sessionId = localStorage.getItem('jarvis_session_id');
    if (!sessionId) {
        sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('jarvis_session_id', sessionId);
    }
    
    // Load saved messages and history
    loadSavedMessages();
    loadChatHistory();
    
    // Event listeners
    setupEventListeners();
    
    function setupEventListeners() {
        // Input event for send button visibility and auto-resize
        chatInput.addEventListener('input', function() {
            sendButton.style.display = chatInput.value.trim() ? 'block' : 'none';
            autoResizeTextarea();
        });
        
        // Theme toggle
        themeToggle.addEventListener('click', toggleTheme);
        
        // Mobile menu toggle
        mobileMenuButton.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
        
        // New chat button
        newChatButton.addEventListener('click', startNewChat);
        
        // Send message handlers
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Clear conversation
        clearButton.addEventListener('click', clearConversation);
        
        // Tool buttons
        toolButtons.querySelectorAll('.tool-button').forEach(button => {
            button.addEventListener('click', function() {
                const text = this.textContent.trim().replace(/^[^\w]+/, '');
                chatInput.value = text;
                chatInput.focus();
                sendButton.style.display = 'block';
                autoResizeTextarea();
            });
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768 && 
                !sidebar.contains(e.target) && 
                e.target !== mobileMenuButton) {
                sidebar.classList.remove('open');
            }
        });
    }
    
    function autoResizeTextarea() {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }
    
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('jarvis_dark_mode', isDark);
        themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    
    function loadSavedMessages() {
        const savedMessages = localStorage.getItem(`jarvis_messages_${sessionId}`);
        if (savedMessages) {
            try {
                const messages = JSON.parse(savedMessages);
                if (messages.length > 0) {
                    welcome.style.display = 'none';
                    messagesContainer.style.display = 'block';
                    toolButtons.style.display = 'none';
                    clearButton.style.display = 'block';
                    
                    messages.forEach(msg => {
                        addMessage(msg.role, msg.content, false);
                    });
                    
                    // Update chat history with this session
                    updateChatHistory(messages[messages.length-1].content.substring(0, 50) + '...');
                }
            } catch (e) {
                console.error('Error loading saved messages:', e);
            }
        }
        
        // Load theme preference
        const darkMode = localStorage.getItem('jarvis_dark_mode') === 'true';
        if (darkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    function loadChatHistory() {
        const history = JSON.parse(localStorage.getItem('jarvis_chat_history') || '[]');
        historyList.innerHTML = '';
        
        history.forEach((item, index) => {
            const historyItem = document.createElement('button');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `<i class="fas fa-comment"></i> ${item.title}`;
            
            if (item.id === sessionId) {
                historyItem.classList.add('active');
            }
            
            historyItem.addEventListener('click', function() {
                // Switch to this chat session
                sessionId = item.id;
                localStorage.setItem('jarvis_session_id', sessionId);
                loadSavedMessages();
                
                // Update active state
                document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                
                // Close sidebar on mobile
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                }
            });
            
            historyList.appendChild(historyItem);
        });
    }
    
    function updateChatHistory(title) {
        const history = JSON.parse(localStorage.getItem('jarvis_chat_history') || '[]');
        
        // Remove if this session already exists
        const existingIndex = history.findIndex(item => item.id === sessionId);
        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }
        
        // Add to beginning of array
        history.unshift({
            id: sessionId,
            title: title,
            timestamp: new Date().toISOString()
        });
        
        // Keep only the last 10 chats
        if (history.length > 10) {
            history.pop();
        }
        
        localStorage.setItem('jarvis_chat_history', JSON.stringify(history));
        loadChatHistory();
    }
    
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Save current state in case of errors
        const currentState = {
            messages: messagesContainer.innerHTML,
            welcome: welcome.style.display,
            tools: toolButtons.style.display,
            clearBtn: clearButton.style.display
        };
        
        try {
            // UI updates
            welcome.style.display = 'none';
            messagesContainer.style.display = 'block';
            toolButtons.style.display = 'none';
            clearButton.style.display = 'block';
            
            // Add user message
            addMessage('user', message, true);
            
            // Clear input
            chatInput.value = '';
            sendButton.style.display = 'none';
            chatInput.style.height = 'auto';
            
            // Show typing indicator
            const typingIndicator = addTypingIndicator();
            
            // Send to backend
            const response = await fetch('http://35.223.185.83:5000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    session_id: sessionId
                }),
            });
            
            const data = await response.json();
            
            // Remove typing indicator
            messagesContainer.removeChild(typingIndicator);
            
            if (data.error) {
                addMessage('assistant', `Sorry, there was an error: ${data.error}`, true);
            } else {
                addMessage('assistant', data.response, true);
                
                if (data.type === 'action' && data.commands) {
                    const commandsHtml = data.commands.map(cmd => 
                        `<span class="command-chip">${cmd}</span>`
                    ).join('');
                    addMessage('system', `Actions detected: ${commandsHtml}`, true);
                }
            }
            
            // Update chat history
            updateChatHistory(message.substring(0, 50) + '...');
        } catch (error) {
            console.error('Error in sendMessage:', error);
            // Restore state on error
            messagesContainer.innerHTML = currentState.messages;
            welcome.style.display = currentState.welcome;
            toolButtons.style.display = currentState.tools;
            clearButton.style.display = currentState.clearBtn;
            addMessage('assistant', "Sorry, I couldn't connect to the server. Please try again later.", true);
        }
    }
    
    function addMessage(role, content, saveToStorage) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        let iconHTML = '';
        if (role === 'assistant') {
            iconHTML = `
                <div class="avatar grok-avatar">
                    <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="6" fill="none" />
                        <line x1="15" y1="85" x2="85" y2="15" stroke="currentColor" stroke-width="6" stroke-linecap="round" />
                    </svg>
                </div>
            `;
        } else if (role === 'system') {
            iconHTML = '<div class="avatar system-avatar">S</div>';
        }
        
        const paragraphs = content.split('\n').map(text => `<p>${text}</p>`).join('');
        
        messageDiv.innerHTML = `
            ${iconHTML}
            <div class="message-content">
                ${paragraphs}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (saveToStorage) {
            saveMessagesToStorage();
        }
    }
    
    function addTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message assistant-message';
        
        typingIndicator.innerHTML = `
            <div class="avatar grok-avatar">
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="6" fill="none" />
                    <line x1="15" y1="85" x2="85" y2="15" stroke="currentColor" stroke-width="6" stroke-linecap="round" />
                </svg>
            </div>
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return typingIndicator;
    }
    
    function saveMessagesToStorage() {
        const messages = [];
        document.querySelectorAll('.message').forEach(msg => {
            const role = msg.classList.contains('user-message') ? 'user' : 
                         msg.classList.contains('assistant-message') ? 'assistant' : 'system';
            const content = msg.querySelector('.message-content').innerHTML;
            messages.push({ role, content });
        });
        
        localStorage.setItem(`jarvis_messages_${sessionId}`, JSON.stringify(messages));
    }
    
    function startNewChat() {
        // Clear current conversation UI
        messagesContainer.innerHTML = '';
        welcome.style.display = 'block';
        messagesContainer.style.display = 'none';
        clearButton.style.display = 'none';
        toolButtons.style.display = 'flex';
        
        // Generate new session ID
        sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('jarvis_session_id', sessionId);
        
        // Clear local storage for previous session
        localStorage.removeItem(`jarvis_messages_${sessionId}`);
        
        // Update history
        loadChatHistory();
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
        
        // Focus input
        chatInput.focus();
    }
    
    async function clearConversation() {
        // Clear UI
        messagesContainer.innerHTML = '';
        welcome.style.display = 'block';
        messagesContainer.style.display = 'none';
        clearButton.style.display = 'none';
        toolButtons.style.display = 'flex';
        
        // Clear local storage
        localStorage.removeItem(`jarvis_messages_${sessionId}`);
        
        // Generate new session ID
        sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('jarvis_session_id', sessionId);
        
        // Update history
        loadChatHistory();
        
        try {
            // Clear server-side history
            await fetch('http://localhost:5000/clear_history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId
                }),
            });
        } catch (error) {
            console.error('Error clearing history:', error);
        }
    }
});
