document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginView = document.getElementById('login-view');
    const setupView = document.getElementById('setup-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    
    const setupForm = document.getElementById('setup-form');
    const textbookNameInput = document.getElementById('textbook-name');
    
    const displayTextbookName = document.getElementById('display-textbook-name');
    const userGreeting = document.getElementById('user-greeting');
    const studentPointsBadge = document.getElementById('student-points-badge');
    const resetBtn = document.getElementById('reset-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadDocBtn = document.getElementById('upload-doc-btn');
    const documentUpload = document.getElementById('document-upload');
    const quizModal = document.getElementById('quiz-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const loadedDocName = document.getElementById('loaded-doc-name');
    const quizSetupSection = document.getElementById('quiz-setup-section');
    const quizTopic = document.getElementById('quiz-topic');
    const generateQuizBtn = document.getElementById('generate-quiz-btn');
    const quizLoadingSection = document.getElementById('quiz-loading-section');
    const quizResultsSection = document.getElementById('quiz-results-section');
    const generatedQuizContainer = document.getElementById('generated-quiz-container');
    const submitQuizBtn = document.getElementById('submit-quiz-btn');
    const finishQuizBtn = document.getElementById('finish-quiz-btn');
    const quizScoreContainer = document.getElementById('quiz-score-container');
    const quizScoreText = document.getElementById('quiz-score-text');
    const quizPointsText = document.getElementById('quiz-points-text');
    const currentDateDisplay = document.getElementById('current-date-display');
    
    const dailyLogForm = document.getElementById('daily-log-form');
    const hadWorkToggle = document.getElementById('had-work-toggle');
    const pagesInputGroup = document.getElementById('pages-input-group');
    const pagesDoneInput = document.getElementById('pages-done');
    const notesInput = document.getElementById('notes');
    const historyContainer = document.getElementById('history-container');
    const leaderboardContainer = document.getElementById('leaderboard-container');

    // App State
    let appData = {
        users: {},       // username -> { role: 'teacher' | 'student' }
        currentUser: null, // username string
        textbookName: '',
        history: [], // [{ date: '...', hadWork: true/false, pages: '...', notes: '...' }]
        currentDocText: '' // Temporary storage for uploaded document text
    };

    // Document Extraction via PDF.js
    async function extractTextFromPDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        // Only parse first 10 pages for demo purposes
        const maxPages = Math.min(pdf.numPages, 10);
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            text += textContent.items.map(s => s.str).join(' ') + ' ';
        }
        return text;
    }

    // AI Generation Function using Local Backend (Secure Node Server)
    async function generateRealQuiz(text, topic, difficulty) {
        
        // Truncate text context to avoid passing massive PDFs, focus on first ~20k chars
        const contextText = text.substring(0, 20000);
        
        const count = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 5;
        
        const prompt = `You are an expert teacher creating a quiz based *strictly* on the provided text.
Topic: ${topic}
Difficulty: ${difficulty}
Text from uploaded document:
---
${contextText}
---
Create a multiple choice quiz with exactly ${count} questions. 
Respond ONLY with a valid JSON array of objects. Do not use markdown blocks (\`\`\`json). Just the raw JSON array.
Each object must match this schema:
{
  "question": "The question text",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "answer": 0 // The zero-based index of the correct option
}
Ensure the questions accurately reflect the provided text.`;

        // Send request to our secure local node backend
        const response = await fetch('http://localhost:3000/api/generate-quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: contextText,
                topic: topic,
                difficulty: difficulty
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Server Error: ${response.status}`);
        }

        const quizData = await response.json();
        
        let html = `<h3 style="margin-bottom: 1rem; color: #111827;">Generated Quiz on ${topic} (${difficulty})</h3>`;
        
        quizData.forEach((q, index) => {
            let optionsHtml = '';
            q.options.forEach((opt, optIndex) => {
                optionsHtml += `<li><label style="cursor:pointer; display:flex; align-items:center;">
                    <input type="radio" name="q${index}" value="${optIndex}" data-correct="${q.answer === optIndex}"> 
                    ${opt}
                </label></li>`;
            });

            html += `
            <div class="quiz-question" id="question-${index}">
                <h4>Question ${index + 1}</h4>
                <p>${q.question}</p>
                <ul class="quiz-options">
                    ${optionsHtml}
                </ul>
                <div class="feedback" id="feedback-${index}" style="margin-top:0.5rem; font-weight:500; display:none;"></div>
            </div>`;
        });
        
        return html;
    }

    // Initialize App
    function init() {
        const storedData = localStorage.getItem('textbookTrackerData');
        if (storedData) {
            // merge stored data to ensure new properties exist if upgrading from older version
            appData = { ...appData, ...JSON.parse(storedData) };
        }
        
        if (appData.currentUser) {
            routeUser();
        } else {
            showLogin();
        }
    }

    function routeUser() {
        const user = appData.users[appData.currentUser];
        if (!user) {
            showLogin();
            return;
        }

        if (user.role === 'teacher') {
            if (appData.textbookName) {
                showDashboard();
            } else {
                showSetup();
            }
        } else if (user.role === 'student') {
            showDashboard();
        }
    }

    // View Management
    function showLogin() {
        loginView.classList.remove('hidden');
        setupView.classList.add('hidden');
        dashboardView.classList.add('hidden');
        
        // Clear login form
        usernameInput.value = '';
    }

    function showSetup() {
        loginView.classList.add('hidden');
        setupView.classList.remove('hidden');
        dashboardView.classList.add('hidden');
    }

    function showDashboard() {
        loginView.classList.add('hidden');
        setupView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        
        const user = appData.users[appData.currentUser];
        
        // Set greetings and headers
        userGreeting.textContent = `Hello, ${appData.currentUser}`;
        displayTextbookName.textContent = appData.textbookName || 'No textbook set yet';
        
        // Apply role classes
        if (user.role === 'student') {
            document.body.classList.add('student-view');
            studentPointsBadge.style.display = 'inline-block';
            studentPointsBadge.textContent = `${user.points || 0} pts`;
        } else {
            document.body.classList.remove('student-view');
            studentPointsBadge.style.display = 'none';
        }

        updateDateDisplay();
        renderHistory();
        renderLeaderboard();
        
        // Only run teacher setup if not a student
        if (user.role === 'teacher') {
            // Setup toggle listener
            hadWorkToggle.addEventListener('change', handleToggleChange);
            // Trigger initial state
            hadWorkToggle.dispatchEvent(new Event('change'));
        } else {
            // cleanup listener so it doesn't double trigger if re-logged in
            hadWorkToggle.removeEventListener('change', handleToggleChange);
        }
    }

    function handleToggleChange(e) {
        if (e.target.checked) {
            pagesInputGroup.classList.remove('hidden');
            pagesDoneInput.required = true;
        } else {
            pagesInputGroup.classList.add('hidden');
            pagesDoneInput.required = false;
            pagesDoneInput.value = ''; // clear if changing to no work
        }
    }

    // Save to LocalStorage
    function saveData() {
        localStorage.setItem('textbookTrackerData', JSON.stringify(appData));
    }

    function updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        currentDateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // Formatting date for history
    function formatDate(dateString) {
        const d = new Date(dateString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Render History List
    function renderHistory() {
        historyContainer.innerHTML = '';
        
        if (appData.history.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-state">
                    <p>No entries yet. Add your first log today!</p>
                </div>
            `;
            return;
        }

        // Sort history newest first
        const sortedHistory = [...appData.history].sort((a, b) => new Date(b.date) - new Date(a.date));

        sortedHistory.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const statusClass = entry.hadWork ? 'status-work' : 'status-no-work';
            const statusText = entry.hadWork ? 'Work Done' : 'No Work';
            
            let pagesHtml = entry.hadWork && entry.pages ? `<p class="history-pages">Pages: ${entry.pages}</p>` : '';
            let notesHtml = entry.notes ? `<p class="history-notes">${entry.notes}</p>` : '';
            
            // Mark as reviewed and AI logic for students
            let reviewHtml = '';
            let aiHtml = '';
            let challengeHtml = '';

            const user = appData.users[appData.currentUser];
            if (user && user.role === 'student' && entry.hadWork) {
                // Reviewed Button
                const reviewed = user.reviewedEntries && user.reviewedEntries.includes(entry.id);
                if (reviewed) {
                    reviewHtml = `<button class="btn-reviewed" disabled>✓ Reviewed</button>`;
                } else {
                    reviewHtml = `<button class="btn-reviewed" onclick="window.markAsReviewed('${entry.id}')">Mark as Reviewed (+10 pts)</button>`;
                }
                
                // AI Revision Button
                const generated = user.aiRevisions && user.aiRevisions[entry.id];
                if (generated) {
                    if (generated.type === 'worksheet') {
                        aiHtml = `<button class="btn-worksheet" disabled>📄 Worksheet Generated</button>`;
                        
                        let qList = generated.questions.map((q, i) => `
                            <div class="worksheet-q">${i+1}. ${q}</div>
                            <div class="worksheet-empty-space"></div>
                        `).join('');
                        
                        challengeHtml = `
                            <div class="worksheet-container">
                                <div class="worksheet-header">
                                    <h3>${appData.textbookName}</h3>
                                    <p>Pages ${entry.pages || 'N/A'}</p>
                                </div>
                                ${qList}
                            </div>
                        `;
                    } else {
                        aiHtml = `<button class="btn-ai" disabled>✨ Revision Generated</button>`;
                        let qList = generated.questions.map(q => `<li>${q}</li>`).join('');
                        challengeHtml = `
                            <div class="ai-challenge">
                                <h4>✨ AI Revision Challenge</h4>
                                <ul>${qList}</ul>
                            </div>
                        `;
                    }
                } else {
                    aiHtml = `
                    <button class="btn-ai" id="ai-btn-${entry.id}" onclick="window.generateRevision('${entry.id}', 'quick')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M21 12c-2.4 0-4.6-1.1-6-2.9-1.4 1.8-3.6 2.9-6 2.9"></path>
                            <path d="M9 12v9"></path>
                            <path d="M15 12v9"></path>
                        </svg> Quick Revision
                    </button>
                    <button class="btn-worksheet" id="ws-btn-${entry.id}" onclick="window.generateRevision('${entry.id}', 'worksheet')">
                        📄 Worksheet
                    </button>`;
                }
            }

            item.innerHTML = `
                <div class="history-date">${formatDate(entry.date)}</div>
                <div class="history-status ${statusClass}">${statusText}</div>
                ${pagesHtml}
                ${notesHtml}
                <div>
                    ${reviewHtml}
                    ${aiHtml}
                </div>
                <div id="ai-challenge-container-${entry.id}">
                    ${challengeHtml}
                </div>
            `;
            
            historyContainer.appendChild(item);
        });
    }

    // Leaderboard Renderer
    function renderLeaderboard() {
        leaderboardContainer.innerHTML = '';
        
        // Extract students and sort by points descending
        const students = Object.entries(appData.users)
            .filter(([_, data]) => data.role === 'student')
            .map(([username, data]) => ({ username, points: data.points || 0 }))
            .sort((a, b) => b.points - a.points);
            
        if (students.length === 0) {
            leaderboardContainer.innerHTML = `<p class="empty-state" style="padding: 1rem;">No students registered yet.</p>`;
            return;
        }
        
        students.forEach((student, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            let rank = `#${index + 1}`;
            if (index === 0) rank = '🥇 ' + rank;
            else if (index === 1) rank = '🥈 ' + rank;
            else if (index === 2) rank = '🥉 ' + rank;
            
            item.innerHTML = `
                <span>${rank} <strong>${student.username}</strong></span>
                <span>${student.points} pts</span>
            `;
            leaderboardContainer.appendChild(item);
        });
    }

    // Global function for the inline onclick handler
    window.markAsReviewed = function(entryId) {
        const user = appData.users[appData.currentUser];
        if (!user || user.role !== 'student') return;
        
        if (!user.reviewedEntries) {
            user.reviewedEntries = [];
        }
        
        if (!user.reviewedEntries.includes(entryId)) {
            user.reviewedEntries.push(entryId);
            user.points = (user.points || 0) + 10;
            saveData();
            
            // Update UI
            studentPointsBadge.textContent = `${user.points} pts`;
            renderHistory();
            renderLeaderboard();
        }
    };

    window.generateRevision = function(entryId, type = 'quick') {
        const user = appData.users[appData.currentUser];
        if (!user || user.role !== 'student') return;

        const btn = type === 'quick' ? document.getElementById(`ai-btn-${entryId}`) : document.getElementById(`ws-btn-${entryId}`);
        const otherBtn = type === 'quick' ? document.getElementById(`ws-btn-${entryId}`) : document.getElementById(`ai-btn-${entryId}`);
        const container = document.getElementById(`ai-challenge-container-${entryId}`);
        if (!btn || !container) return;

        // Visual loading state
        btn.disabled = true;
        if (otherBtn) otherBtn.style.display = 'none';
        
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" class="spinning">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                        </svg> Generating...`;

        // Mock AI Delay
        setTimeout(() => {
            const entry = appData.history.find(e => e.id === entryId);
            const notes = entry && entry.notes ? entry.notes.toLowerCase() : '';
            const pages = entry && entry.pages ? entry.pages : '';
            const textbook = appData.textbookName || 'the textbook';
            
            const questions = [];
            
            if (type === 'quick') {
                if (notes.includes('biology') || notes.includes('cell')) {
                    questions.push(`What is the primary function of the components mentioned in the notes?`);
                } else if (notes.includes('math') || notes.includes('algebra')) {
                    questions.push(`Can you explain the main formula introduced in pages ${pages}?`);
                } else {
                    questions.push(`Write a 2-sentence summary of the main concept in pages ${pages}.`);
                }
            } else {
                // Worksheet generation
                questions.push(`Define the three most important vocabulary terms found across pages ${pages} in ${textbook}.`);
                questions.push(`Write a paragraph summarizing the core narrative or argument presented in these pages.`);
                questions.push(`Critically analyze the notes left by the teacher: "${entry.notes || 'N/A'}". How does this apply to what you read?`);
                questions.push(`Create a visual map or diagram that connects the concepts from ${textbook} pages ${pages}.`);
            }

            // Save to state
            if (!user.aiRevisions) {
                user.aiRevisions = {};
            }
            user.aiRevisions[entryId] = { type, questions };
            saveData();

            // Re-render to show the saved state
            renderHistory();

        }, 1800); 
    };

    // Event Listeners
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const role = document.querySelector('input[name="role"]:checked').value;
        
        if (username) {
            // Register user if they don't exist
            if (!appData.users[username]) {
                appData.users[username] = { role };
            }
            
            // Log them in
            appData.currentUser = username;
            saveData();
            routeUser();
        }
    });

    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = textbookNameInput.value.trim();
        if (name) {
            appData.textbookName = name;
            saveData();
            showDashboard();
        }
    });

    dailyLogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const hadWork = hadWorkToggle.checked;
        const pages = pagesDoneInput.value.trim();
        const notes = notesInput.value.trim();
        
        // Create new entry
        const entry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            hadWork,
            pages: hadWork ? pages : null,
            notes
        };
        
        appData.history.push(entry);
        saveData();
        
        // Reset form
        pagesDoneInput.value = '';
        notesInput.value = '';
        hadWorkToggle.checked = true;
        hadWorkToggle.dispatchEvent(new Event('change'));
        
        // Update UI
        renderHistory();
        
        // Optional visual feedback
        const btn = dailyLogForm.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Saved!';
        btn.style.backgroundColor = '#10b981';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }, 2000);
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to start over? This will erase the current textbook name and history, but keep user accounts.')) {
            appData.textbookName = '';
            appData.history = [];
            saveData();
            textbookNameInput.value = '';
            showSetup();
        }
    });

    logoutBtn.addEventListener('click', () => {
        appData.currentUser = null;
        saveData();
        showLogin();
    });

    if (uploadDocBtn && documentUpload) {
        uploadDocBtn.addEventListener('click', () => {
            documentUpload.click();
        });

        documentUpload.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                appData.currentDocText = '';
                
                const originalText = uploadDocBtn.textContent;
                uploadDocBtn.textContent = 'Processing...';
                uploadDocBtn.disabled = true;

                try {
                    if (file.type === 'application/pdf') {
                        appData.currentDocText = await extractTextFromPDF(file);
                    } else if (file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                        const arrayBuffer = await file.arrayBuffer();
                        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                        appData.currentDocText = result.value;
                    } else {
                        appData.currentDocText = await file.text();
                    }
                    
                    // Open Modal
                    if (quizModal && loadedDocName) {
                        loadedDocName.textContent = file.name;
                        quizSetupSection.classList.remove('hidden');
                        quizLoadingSection.classList.add('hidden');
                        quizResultsSection.classList.add('hidden');
                        quizModal.classList.remove('hidden');
                        quizTopic.value = '';
                    }
                } catch (err) {
                    console.error('Error processing document:', err);
                    alert("Failed to process the document. Please ensure it's a valid PDF or text file.");
                } finally {
                    uploadDocBtn.textContent = originalText;
                    uploadDocBtn.disabled = false;
                    documentUpload.value = '';
                }
            }
        });
    }

    // Modal Event Listeners
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            quizModal.classList.add('hidden');
        });
    }

    if (submitQuizBtn) {
        submitQuizBtn.addEventListener('click', () => {
            const questions = document.querySelectorAll('.quiz-question');
            let correctCount = 0;
            let totalQuestions = questions.length;

            if (totalQuestions === 0) return;

            questions.forEach((qDiv, index) => {
                const selected = qDiv.querySelector(`input[name="q${index}"]:checked`);
                const feedbackDiv = document.getElementById(`feedback-${index}`);
                feedbackDiv.style.display = 'block';

                if (!selected) {
                    feedbackDiv.textContent = 'No answer selected.';
                    feedbackDiv.style.color = '#ef4444';
                } else if (selected.dataset.correct === 'true') {
                    feedbackDiv.textContent = 'Correct!';
                    feedbackDiv.style.color = '#10b981';
                    correctCount++;
                } else {
                    feedbackDiv.textContent = 'Incorrect.';
                    feedbackDiv.style.color = '#ef4444';
                    
                    // Highlight the correct answer
                    const correctInput = qDiv.querySelector(`input[name="q${index}"][data-correct="true"]`);
                    if (correctInput) {
                        correctInput.parentElement.style.color = '#10b981';
                        correctInput.parentElement.style.fontWeight = 'bold';
                    }
                }
                
                // Disable inputs
                const inputs = qDiv.querySelectorAll('input[type="radio"]');
                inputs.forEach(input => input.disabled = true);
            });

            const percentage = Math.round((correctCount / totalQuestions) * 100);
            
            if (quizScoreContainer) {
                quizScoreContainer.classList.remove('hidden');
                quizScoreText.textContent = `Score: ${percentage}% (${correctCount}/${totalQuestions})`;
            }

            const user = appData.users[appData.currentUser];
            if (user && user.role === 'student' && correctCount > 0) {
                user.points = (user.points || 0) + correctCount;
                saveData();
                quizPointsText.textContent = `+${correctCount} points earned!`;
                
                // Update Badge UI directly safely
                if (studentPointsBadge) {
                    studentPointsBadge.textContent = `${user.points} pts`;
                }
                renderLeaderboard();
            } else if (quizPointsText) {
                quizPointsText.textContent = '';
            }

            submitQuizBtn.classList.add('hidden');
            finishQuizBtn.classList.remove('hidden');
        });
    }

    if (finishQuizBtn) {
        finishQuizBtn.addEventListener('click', () => {
            quizModal.classList.add('hidden');
        });
    }

    if (generateQuizBtn) {
        generateQuizBtn.addEventListener('click', async () => {
            const topic = quizTopic.value.trim();

            if (!topic) {
                alert('Please enter a topic or focus area!');
                return;
            }
            
            const difficultyRadio = document.querySelector('input[name="difficulty"]:checked');
            const difficulty = difficultyRadio ? difficultyRadio.value : 'Easy';
            
            quizSetupSection.classList.add('hidden');
            quizLoadingSection.classList.remove('hidden');

            try {
                const generatedQuizHTML = await generateRealQuiz(appData.currentDocText, topic, difficulty);
                
                generatedQuizContainer.innerHTML = generatedQuizHTML;
                
                if (submitQuizBtn) {
                    submitQuizBtn.classList.remove('hidden');
                    finishQuizBtn.classList.add('hidden');
                }
                if (quizScoreContainer) {
                    quizScoreContainer.classList.add('hidden');
                }

                quizLoadingSection.classList.add('hidden');
                quizResultsSection.classList.remove('hidden');
            } catch (err) {
                console.error('AI Generation failed', err);
                alert('An error occurred while generating the quiz. Check your API key and try again.\n' + err.message);
                quizSetupSection.classList.remove('hidden');
                quizLoadingSection.classList.add('hidden');
            }
        });
    }

    // Run initialization
    init();
});
