// SmileAgent - Gmail Integration Fixed
let currentConversation = null;
let aiEnabled = false;
let gmailEmails = [];

async function toggleAI(enabled) {
  aiEnabled = enabled;
  const statusEl = document.getElementById('aiStatus');
  statusEl.textContent = enabled ? 'ON' : 'OFF';
  statusEl.className = enabled ? 'text-xs font-semibold text-green-600' : 'text-xs font-semibold text-gray-500';

  try {
    await fetch('/api/messaggi/ai/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    if (enabled) alert('AI Auto-Risposta ATTIVATA');
  } catch (error) {
    console.error('Error toggling AI:', error);
  }
}

async function connectGmail() {
  try {
    const res = await fetch('/api/messaggi/gmail/auth-url');
    const data = await res.json();
    if (data.success) window.location.href = data.authUrl;
    else alert('Errore: ' + data.error);
  } catch (error) {
    alert('Errore connessione Gmail');
  }
}

function filterMessages(channel) {
  const allBtns = document.querySelectorAll('.filter-btn');
  allBtns.forEach(btn => {
    btn.classList.remove('active', 'bg-primary', 'text-white');
    btn.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
  });

  event.target.classList.add('active', 'bg-primary', 'text-white');
  event.target.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');

  const messages = document.querySelectorAll('.message-item');
  messages.forEach(msg => {
    if (channel === 'all') {
      msg.style.display = 'block';
    } else {
      msg.style.display = msg.classList.contains(channel + '-msg') ? 'block' : 'none';
    }
  });
}

function openConversation(channel, threadId) {
  const email = gmailEmails.find(e => e.thread_id === threadId);
  if (!email) {
    console.error('Email not found:', threadId);
    return;
  }

  currentConversation = {
    channel: channel,
    id: threadId,
    threadId: threadId,
    email: email.from_email,
    subject: email.subject,
    fullEmail: email
  };

  document.getElementById('conversationPlaceholder').classList.add('hidden');
  document.getElementById('conversationView').classList.remove('hidden');

  const convAvatar = document.getElementById('convAvatar');
  const convName = document.getElementById('convName');
  const convChannel = document.getElementById('convChannel');

  convAvatar.className = 'w-12 h-12 bg-red-600 rounded-full flex items-center justify-center';
  convAvatar.innerHTML = '<span class="text-white font-bold">@</span>';
  convName.textContent = email.from_name || email.from_email;
  convChannel.textContent = '📧 Gmail';

  const messagesHTML = `
    <div class="flex justify-start">
      <div class="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 max-w-xs">
        <p class="text-xs text-gray-600 font-semibold mb-1">${escapeHtml(email.from_name || email.from_email)}</p>
        <p class="text-xs font-medium mb-1">📧 ${escapeHtml(email.subject || '(Nessun oggetto)')}</p>
        <p class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">${escapeHtml(email.snippet || email.body || '')}</p>
        <p class="text-xs text-gray-500 mt-1">${new Date(email.last_message_date).toLocaleString('it-IT')}</p>
      </div>
    </div>
  `;

  document.getElementById('convMessages').innerHTML = messagesHTML;
  document.getElementById('replyText').value = '';
}

async function generateAIReply() {
  if (!currentConversation) {
    alert('Seleziona prima una email');
    return;
  }

  const replyBox = document.getElementById('replyText');
  replyBox.value = '⏳ Gemini AI sta generando...';
  replyBox.disabled = true;

  try {
    const res = await fetch('/api/messaggi/gmail/auto-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: currentConversation.threadId,
        emailId: currentConversation.threadId
      })
    });

    const data = await res.json();

    if (data.success && data.replyBody) {
      replyBox.value = data.replyBody;
      alert('✅ Risposta AI generata e inviata!');
      setTimeout(() => loadGmailEmails(), 1000);
    } else {
      replyBox.value = '';
      alert('❌ Errore: ' + (data.error || 'Impossibile generare risposta'));
    }
  } catch (error) {
    console.error('Error generating AI reply:', error);
    replyBox.value = '';
    alert('❌ Errore connessione Gemini AI');
  } finally {
    replyBox.disabled = false;
  }
}

async function sendReply() {
  if (!currentConversation) {
    alert('Seleziona prima una email');
    return;
  }

  const text = document.getElementById('replyText').value;
  if (!text.trim()) {
    alert('⚠️ Scrivi un messaggio');
    return;
  }

  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  try {
    const res = await fetch('/api/messaggi/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: currentConversation.email,
        subject: 'Re: ' + (currentConversation.subject || ''),
        body: text,
        threadId: currentConversation.threadId
      })
    });

    const data = await res.json();

    if (data.success) {
      alert('✅ Email inviata con successo!');
      document.getElementById('replyText').value = '';
    } else {
      alert('❌ Errore: ' + (data.error || 'Errore invio'));
    }
  } catch (error) {
    console.error('Error sending reply:', error);
    alert('❌ Errore connessione');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

async function loadGmailEmails() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  if (loadingSpinner) loadingSpinner.classList.remove('hidden');

  try {
    const res = await fetch('/api/messaggi/gmail/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxResults: 50 })
    });

    const data = await res.json();

    if (data.success && data.emails && data.emails.length > 0) {
      gmailEmails = data.emails;

      const gmailConnect = document.getElementById('gmailConnect');
      if (gmailConnect) gmailConnect.style.display = 'none';

      const messagesList = document.getElementById('messagesList');
      messagesList.querySelectorAll('.message-item').forEach(el => el.remove());

      data.emails.forEach(email => {
        const emailDiv = document.createElement('div');
        emailDiv.className = 'message-item gmail-msg bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer';
        emailDiv.onclick = () => openConversation('gmail', email.thread_id);

        const date = new Date(email.last_message_date).toLocaleString('it-IT', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        emailDiv.innerHTML = `
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-white font-bold">@</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-semibold text-gray-900 dark:text-white">${escapeHtml(email.from_name || email.from_email)}</span>
                  <span class="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">📧 Gmail</span>
                  ${email.ai_replied ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ AI</span>' : ''}
                </div>
                <span class="text-xs text-gray-500">${date}</span>
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">${escapeHtml(email.subject || '(Nessun oggetto)')}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400 truncate">${escapeHtml(email.snippet || '')}</p>
            </div>
          </div>
        `;

        messagesList.appendChild(emailDiv);
      });

      console.log('✅ Caricate ' + data.emails.length + ' email Gmail');
    }
  } catch (error) {
    console.error('Error loading Gmail emails:', error);
  } finally {
    if (loadingSpinner) loadingSpinner.classList.add('hidden');
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const firstBtn = document.querySelector('.filter-btn.active');
  if (firstBtn) {
    firstBtn.classList.add('bg-primary', 'text-white');
  }

  document.querySelectorAll('.filter-btn:not(.active)').forEach(btn => {
    btn.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('success') === 'gmail_connected') {
    alert('✅ Gmail connesso con successo!');
    setTimeout(() => loadGmailEmails(), 1000);
  }

  loadGmailEmails();
});
