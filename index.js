document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const chatInput = document.querySelector('.chat-input');
    const chatContainer = document.querySelector('.chat-container');
    const welcome = document.querySelector('.welcome');
    const toolButtons = document.querySelector('.tool-buttons');
    
    // Create message container
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    chatContainer.insertBefore(messagesContainer, chatContainer.firstChild);
    messagesContainer.style.display = 'none';
    
    // Generate or retrieve session ID from localStorage
    let sessionId = localStorage.getItem('jarvis_session_id');
    if (!sessionId) {
        sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('jarvis_session_id', sessionId);
    }
    
    // Create and style send button
    const sendButton = createSendButton();
    const inputContainer = document.querySelector('.chat-input-container');
    const inputWrapper = createInputWrapper(chatInput, sendButton);
    inputContainer.insertBefore(inputWrapper, inputContainer.firstChild);
    
    // Create clear button
    const clearButton = createClearButton();
    chatContainer.insertBefore(clearButton, messagesContainer.nextSibling);
    
    // Load any saved messages
    loadSavedMessages();
    
    // Event listeners
    setupEventListeners();
    
    // Helper functions
    function createSendButton() {
        const button = document.createElement('button');
        button.className = 'send-button';
        button.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m5 12 14 0"></path><path d="m12 5 7 7-7 7"></path>
            </svg>
        `;
        button.style.position = 'absolute';
        button.style.right = '20px';
        button.style.top = '50%';
        button.style.transform = 'translateY(-50%)';
        button.style.display = 'none';
        button.style.background = '#000';
        button.style.color = '#fff';
        button.style.width = '36px';
        button.style.height = '36px';
        button.style.borderRadius = '50%';
        button.style.cursor = 'pointer';
        button.style.border = 'none';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        return button;
    }
    
    function createInputWrapper(inputElement, buttonElement) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.appendChild(inputElement);
        wrapper.appendChild(buttonElement);
        return wrapper;
    }
    
    function createClearButton() {
        const button = document.createElement('button');
        button.className = 'clear-button';
        button.textContent = 'Clear Conversation';
        button.style.display = 'none';
        button.style.margin = '10px auto';
        button.style.padding = '8px 16px';
        button.style.background = 'var(--button-bg)';
        button.style.color = 'var(--foreground)';
        button.style.border = '1px solid var(--border-color)';
        button.style.borderRadius = '20px';
        button.style.cursor = 'pointer';
        button.style.fontSize = '14px';
        return button;
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
                }
            } catch (e) {
                console.error('Error loading saved messages:', e);
            }
        }
    }
    
    function setupEventListeners() {
        // Input event for send button visibility
        chatInput.addEventListener('input', function() {
            sendButton.style.display = chatInput.value.trim() ? 'flex' : 'none';
        });
        
        // Dark mode toggle
        const darkModeButton = document.querySelector('.button-icon');
        let isDarkMode = false;
        
        darkModeButton.addEventListener('click', function() {
            isDarkMode = !isDarkMode;
            const root = document.documentElement;
            
            if (isDarkMode) {
                root.style.setProperty('--background', '#121212');
                root.style.setProperty('--foreground', '#e0e0e0');
                root.style.setProperty('--secondary-text', '#a0a0a0');
                root.style.setProperty('--border-color', '#333');
                root.style.setProperty('--button-bg', '#2a2a2a');
                root.style.setProperty('--button-hover', '#3a3a3a');
                root.style.setProperty('--primary-button-bg', '#fff');
                root.style.setProperty('--primary-button-color', '#000');
                root.style.setProperty('--card-bg', '#1e1e1e');
            } else {
                root.style.setProperty('--background', '#f9f9f9');
                root.style.setProperty('--foreground', '#333');
                root.style.setProperty('--secondary-text', '#888');
                root.style.setProperty('--border-color', '#eaeaea');
                root.style.setProperty('--button-bg', '#f2f2f2');
                root.style.setProperty('--button-hover', '#e8e8e8');
                root.style.setProperty('--primary-button-bg', '#000');
                root.style.setProperty('--primary-button-color', '#fff');
                root.style.setProperty('--card-bg', '#fff');
            }
        });
        
        // Send message handlers
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Clear conversation handler
        clearButton.addEventListener('click', async function() {
            // Clear local messages
            messagesContainer.innerHTML = '';
            welcome.style.display = 'block';
            messagesContainer.style.display = 'none';
            clearButton.style.display = 'none';
            toolButtons.style.display = 'flex';
            
            // Clear local storage
            localStorage.removeItem(`jarvis_messages_${sessionId}`);
            
            // Generate a new session ID
            sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('jarvis_session_id', sessionId);
            
            // Clear server-side history
            try {
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
        });
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
            
            // Show typing indicator
            const typingIndicator = addTypingIndicator();
            
            // Send to backend
            const response = await fetch('http://localhost:5000/chat', {
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
                    addMessage('system', `Action commands detected: ${data.commands.join(', ')}`, true);
                }
            }
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
        } else if (role === 'user') {
            iconHTML = '<div class="avatar user-avatar">U</div>';
        } else {
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
        typingIndicator.className = 'message assistant-message typing-indicator';
        typingIndicator.innerHTML = `
            <div class="avatar grok-avatar">
                <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="6" fill="none" />
                    <line x1="15" y1="85" x2="85" y2="15" stroke="currentColor" stroke-width="6" stroke-linecap="round" />
                </svg>
            </div>
            <div class="message-content">
                <div class="typing-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
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
            const content = msg.querySelector('.message-content').innerText;
            messages.push({ role, content });
        });
        
        localStorage.setItem(`jarvis_messages_${sessionId}`, JSON.stringify(messages));
    }
    
    // Add CSS styles
    addStyles();
    
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* [Keep all your existing CSS styles] */
            /* Add any additional styles you need */
        `;
        document.head.appendChild(style);
    }
});