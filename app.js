// Data will be loaded from external JSON files
let questionsData = [];
let descriptionData = [];

async function loadData() {
    try {
        // Load questions
        const questionsResponse = await fetch('data/questions.json');
        questionsData = await questionsResponse.json();
        
        // Shuffle questions while preserving IDs and types
        questionsData = shuffleArray(questionsData);
        
        // Load descriptions
        const descResponse = await fetch('data/description.json');
        descriptionData = await descResponse.json();
        
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        return false;
    }
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Main app logic
document.addEventListener('DOMContentLoaded', async function() {
    // Load data first
    const dataLoaded = await loadData();
    
    if (!dataLoaded) {
        alert('Veriler yüklenirken hata oluştu. Lütfen sayfayı yenileyin.');
        return;
    }

    // Check if we're on the test page or result page
    if (document.getElementById('options-container')) {
        initTestPage();
    } else if (document.getElementById('result-container')) {
        initResultPage();
    }
});

// Test Page Logic
function initTestPage() {
    let currentPage = 0;
    const questionsPerPage = 9;
    let questions = questionsData;
    const answers = {}; // { question_id: weight }

    function showPage() {
        const container = document.getElementById('options-container');
        container.innerHTML = '';

        const start = currentPage * questionsPerPage;
        const end = Math.min(start + questionsPerPage, questions.length);

        document.getElementById('question-text').textContent = `Sayfa ${currentPage + 1}`;

        for (let i = start; i < end; i++) {
            const q = questions[i];

            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question-item');

            const questionTitle = document.createElement('p');
            questionTitle.textContent = `${i + 1}. ${q.question}`;
            questionDiv.appendChild(questionTitle);

            const options = [
                { value: 2, label: 'Kesinlikle Katılıyorum' },
                { value: 1, label: 'Katılıyorum' },
                { value: 0, label: 'Kararsızım' },
                { value: -1, label: 'Katılmıyorum' },
                { value: -2, label: 'Hiç Katılmıyorum' }
            ];

            options.forEach(opt => {
                const label = document.createElement('label');
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `answer_${q.question_id}`;
                input.value = opt.value;

                if (answers[q.question_id] !== undefined && parseInt(answers[q.question_id]) === opt.value) {
                    input.checked = true;
                }

                label.appendChild(input);
                label.appendChild(document.createTextNode(' ' + opt.label));
                questionDiv.appendChild(label);
            });

            container.appendChild(questionDiv);
        }

        document.getElementById('prev-page').style.display = currentPage === 0 ? 'none' : 'inline-block';
        document.getElementById('next-page').style.display = (end === questions.length) ? 'none' : 'inline-block';
        document.getElementById('show-result').style.display = (end === questions.length) ? 'inline-block' : 'none';
    }

    function saveAnswersOnPage() {
        const start = currentPage * questionsPerPage;
        const end = Math.min(start + questionsPerPage, questions.length);

        for (let i = start; i < end; i++) {
            const q = questions[i];
            const selected = document.querySelector(`input[name="answer_${q.question_id}"]:checked`);
            if (!selected) {
                alert(`Lütfen ${i + 1}. soru için bir seçenek seçiniz!`);
                return false;
            }

            answers[q.question_id] = selected.value;
        }
        
        // Save to localStorage
        localStorage.setItem('enneagramAnswers', JSON.stringify(answers));
        return true;
    }

    document.getElementById('next-page').addEventListener('click', () => {
        if (saveAnswersOnPage()) {
            currentPage++;
            showPage();
        }
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        currentPage--;
        showPage();
    });

    document.getElementById('show-result').addEventListener('click', () => {
        if (saveAnswersOnPage()) {
            window.location.href = 'result.html';
        }
    });

    // Load any existing answers from localStorage
    const savedAnswers = localStorage.getItem('enneagramAnswers');
    if (savedAnswers) {
        Object.assign(answers, JSON.parse(savedAnswers));
    }

    showPage();
}

// Result Page Logic
function initResultPage() {
    const resultContainer = document.getElementById('result-container');
    const loadingMsg = document.getElementById('loading-msg');

    // Get answers from localStorage
    const savedAnswers = localStorage.getItem('enneagramAnswers');
    
    if (!savedAnswers) {
        loadingMsg.style.display = 'none';
        resultContainer.innerHTML = `
            <p>Henüz cevap bulunamadı. Lütfen testi tamamlayın.</p>
            <button id="go-test">Teste Git</button>
        `;
        document.getElementById('go-test').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        return;
    }

    const answers = JSON.parse(savedAnswers);
    
    // Calculate results
    setTimeout(() => {
        loadingMsg.style.display = 'none';
        showResult(answers);
    }, 500);
}

function showResult(answers) {
    const resultContainer = document.getElementById('result-container');
    
    // 1) Calculate scores for each type
    const typeScores = {};
    
    // First, map question_id to type
    const questionTypeMap = {};
    questionsData.forEach(q => {
        questionTypeMap[q.question_id] = q.type;
    });
    
    // Then calculate scores
    Object.entries(answers).forEach(([q_id, weight]) => {
        const qType = questionTypeMap[q_id];
        const weightNum = parseInt(weight);
        
        if (!qType || isNaN(weightNum)) return;
        
        if (!typeScores[qType]) typeScores[qType] = 0;
        typeScores[qType] += weightNum;
    });
    
    if (Object.keys(typeScores).length === 0) {
        resultContainer.innerHTML = `
            <p>Geçerli cevap bulunamadı. Lütfen testi tekrar tamamlayın.</p>
            <button id="go-test">Teste Git</button>
        `;
        document.getElementById('go-test').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        return;
    }
    
    // 2) Find main type (highest score)
    const sortedTypes = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
    const mainType = sortedTypes[0][0];
    
    // 3) Define wing pairs
    const wingPairs = {
        '1': ['2', '9'],
        '2': ['1', '3'],
        '3': ['2', '4'],
        '4': ['3', '5'],
        '5': ['4', '6'],
        '6': ['5', '7'],
        '7': ['6', '8'],
        '8': ['7', '9'],
        '9': ['8', '1']
    };
    
    // 4) Calculate wing scores
    const [wing1, wing2] = wingPairs[mainType];
    const wing1Score = typeScores[wing1] || 0;
    const wing2Score = typeScores[wing2] || 0;
    
    // 5) Determine winning wing
    const winningWing = wing1Score > wing2Score ? wing1 : wing2;
    
    // 6) Find description and type name
    let description = "Açıklama bulunamadı";
    let typeName = "";
    
    const wingDesc = descriptionData.find(d => 
        d.type.toString() === mainType.toString() && 
        d.wing.toString() === winningWing.toString()
    );
    
    if (wingDesc) {
        description = wingDesc.description;
        // Extract type name from the description
        const nameMatch = wingDesc.description.match(/Tip \d[w]\d '([^']+)'/);
        typeName = nameMatch ? nameMatch[1] : `Tip ${mainType}w${winningWing}`;
    }
    
    // 7) Show result
    resultContainer.innerHTML = `
        <h2>Enneagram Tipiniz: <span class="type">${mainType}w${winningWing} - ${typeName}</span></h2>
        <div class="description">${formatDescription(description)}</div>
        <button id="reset-test">Testi Sıfırla</button>
    `;
    
    document.getElementById('reset-test').addEventListener('click', () => {
        localStorage.removeItem('enneagramAnswers');
        alert('Test sıfırlandı!');
        window.location.href = 'index.html';
    });
}

// Format description with proper HTML tags
function formatDescription(desc) {
    // Split by semicolons and create paragraphs
    const parts = desc.split(';');
    let formatted = '';
    
    parts.forEach((part, index) => {
        if (part.trim()) {
            // Add heading for the first part
            if (index === 0) {
                formatted += `<h3>${part.trim()}</h3>`;
            } else {
                // Split by colon for sub-sections
                const subParts = part.split(':');
                if (subParts.length > 1) {
                    formatted += `<p><strong>${subParts[0].trim()}:</strong> ${subParts.slice(1).join(':').trim()}</p>`;
                } else {
                    formatted += `<p>${part.trim()}</p>`;
                }
            }
        }
    });
    
    return formatted;
}