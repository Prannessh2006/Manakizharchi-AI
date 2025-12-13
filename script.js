
document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const authRadios = document.querySelectorAll('input[name="authMethod"]');
    const sessionAuth = document.getElementById('sessionAuth');
    const loginAuth = document.getElementById('loginAuth');

    VanillaTilt.init(document.querySelectorAll("[data-tilt]"), {
        max: 15,
        speed: 400,
        glare: true,
        "max-glare": 0.2
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    function switchTab(tabName) {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);
        activeBtn.classList.add('active');
        activeContent.classList.add('active');
    }

    authRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'session') {
                sessionAuth.style.display = 'block';
                loginAuth.style.display = 'none';
            } else {
                sessionAuth.style.display = 'none';
                loginAuth.style.display = 'block';
            }
        });
    });

    document.getElementById('analyzeTextBtn').addEventListener('click', analyzeText);
    document.getElementById('analyzeInstaBtn').addEventListener('click', analyzeInsta);
});

async function analyzeText() {
    const text = document.getElementById('textInput').value;
    if (!text) {
        showNotification('Please enter some text to analyze.', 'warning');
        return;
    }

    const btn = document.getElementById('analyzeTextBtn');
    setButtonState(btn, true);

    try {
        const response = await fetch('/api/text-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await response.json();

        if (response.ok) {
            displayTextResults(data);
        } else {
            showNotification(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification(`An unexpected error occurred: ${error.message}`, 'error');
    } finally {
        setButtonState(btn, false);
    }
}

function displayTextResults(data) {
    const resultsContainer = document.getElementById('textResults');
    resultsContainer.style.display = 'block';

    const posScore = parseFloat(data.scores.positive);
    const neuScore = parseFloat(data.scores.neutral);
    const negScore = parseFloat(data.scores.negative);
    const compoundScore = data.scores.compound;

    document.getElementById('textPos').textContent = `${posScore.toFixed(2)}%`;
    document.getElementById('textNeu').textContent = `${neuScore.toFixed(2)}%`;
    document.getElementById('textNeg').textContent = `${negScore.toFixed(2)}%`;
    
    const overallScoreEl = document.getElementById('textOverallScore').querySelector('.score-value');
    overallScoreEl.textContent = compoundScore.toFixed(4);
    overallScoreEl.style.color = getScoreColor(compoundScore);

    animateProgressBars('text', posScore, neuScore, negScore);
    document.getElementById('textPlot').src = `data:image/png;base64,${data.plot}`;
}

async function analyzeInsta() {
    const authMethod = document.querySelector('input[name="authMethod"]:checked').value;
    const sessionId = document.getElementById('sessionId').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const postUrl = document.getElementById('postUrl').value;

    if (!postUrl || !postUrl.includes('instagram.com/p/')) {
        showNotification('Please enter a valid Instagram post URL.', 'warning');
        return;
    }
    if (authMethod === 'session' && !sessionId) {
        showNotification('Please enter your Session ID.', 'warning');
        return;
    }
    if (authMethod === 'login' && (!username || !password)) {
        showNotification('Please enter your username and password.', 'warning');
        return;
    }

    const btn = document.getElementById('analyzeInstaBtn');
    setButtonState(btn, true);

    try {
        const body = { postUrl };
        if (authMethod === 'session') {
            body.sessionId = sessionId;
        } else {
            body.username = username;
            body.password = password;
        }

        const response = await fetch('/api/insta-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();

        if (response.ok) {
            displayInstaResults(data);
        } else {
            showNotification(`Error: ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification(`An unexpected error occurred: ${error.message}`, 'error');
    } finally {
        setButtonState(btn, false);
    }
}

function displayInstaResults(data) {
    const resultsContainer = document.getElementById('instaResults');
    resultsContainer.style.display = 'block';

    document.getElementById('postCaption').textContent = data.caption;
    const avgScoreEl = document.getElementById('avgScore');
    avgScoreEl.textContent = data.avg_compound_score.toFixed(4);
    avgScoreEl.style.color = getScoreColor(data.avg_compound_score);
    document.getElementById('interpretation').textContent = data.interpretation;
    document.getElementById('instaPlot').src = `data:image/png;base64,${data.plot}`;
}

function setButtonState(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    } else {
        button.disabled = false;
        const originalText = button.querySelector('.btn-text').textContent;
        button.innerHTML = `<span class="btn-text">${originalText}</span><i class="fas fa-arrow-right"></i>`;
    }
}

function animateProgressBars(prefix, pos, neu, neg) {
    const posBar = document.querySelector(`#${prefix}Pos`).closest('.score-card').querySelector('.progress');
    const neuBar = document.querySelector(`#${prefix}Neu`).closest('.score-card').querySelector('.progress');
    const negBar = document.querySelector(`#${prefix}Neg`).closest('.score-card').querySelector('.progress');

    setTimeout(() => {
        posBar.style.width = `${pos}%`;
        neuBar.style.width = `${neu}%`;
        negBar.style.width = `${neg}%`;
    }, 100);
}

function getScoreColor(score) {
    if (score >= 0.05) return 'var(--success-color)';
    if (score <= -0.05) return 'var(--danger-color)';
    return 'var(--warning-color)';
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
