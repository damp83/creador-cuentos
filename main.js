// JavaScript extraído de index.html
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    const avatarParts = {
        body: {
            human:
                '<path d="M100 150 Q150 200 100 300 Q50 200 100 150" fill="#f2d5b1"/>',
            monster:
                '<path d="M100 150 Q180 220 100 300 Q20 220 100 150" fill="#a8e6cf"/>'
        },
        eyes: {
            normal:
                '<circle cx="85" cy="200" r="8" fill="black"/><circle cx="115" cy="200" r="8" fill="black"/>',
            happy:
                '<path d="M80 195 C 85 205, 95 205, 100 195" stroke="black" stroke-width="3" fill="none"/><path d="M110 195 C 115 205, 125 205, 130 195" stroke="black" stroke-width="3" fill="none"/>',
            angry:
                '<path d="M80 205 L 100 195" stroke="black" stroke-width="3"/><path d="M130 205 L 110 195" stroke="black" stroke-width="3"/>'
        },
        hair: {
            short:
                '<path d="M70 140 Q100 120 130 140 L120 160 Q100 150 80 160 Z" fill="#7b3f00"/>',
            long:
                '<path d="M70 140 Q100 120 130 140 L140 200 Q100 220 60 200 Z" fill="#ffcc00"/>',
            spiky:
                '<path d="M70 150 L80 130 L90 150 L100 130 L110 150 L120 130 L130 150 Z" fill="#333"/>'
        },
        clothing: {
            tshirt:
                '<path d="M70 250 L130 250 L140 300 L60 300 Z" fill="#e53e3e"/>',
            dress:
                '<path d="M70 250 L130 250 L150 320 L50 320 Z" fill="#38a169"/>',
            armor:
                '<path d="M70 250 L130 250 L130 300 L70 300 Z" fill="#a0aec0"/><rect x="60" y="250" width="80" height="10" fill="#a0aec0"/>'
        }
    };
    const writingChallenges = [
        'Intenta describir cómo huele el lugar.',
        "Usa la palabra 'centelleante' en tu historia.",
        'Describe un sonido que escuche tu personaje.',
        'Escribe sobre algo que haga reír a tu personaje.'
    ];

    let appState = {
        currentView: 'creator',
        currentStep: 1,
        maxStepReached: 1,
        editingCharIndex: 0,
        storyData: {
            characters: [],
            scenario: {},
            introduction: { text: '', imageUrl: null },
            development: { text: '', imageUrl: null },
            conclusion: { text: '', imageUrl: null }
        },
        library: []
    };
    const totalSteps = 8;

    const creatorView = document.getElementById('creator-view');
    const libraryView = document.getElementById('library-view');
    const steps = document.querySelectorAll('.main-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const bookshelf = document.getElementById('bookshelf');
    const charNameInput = document.getElementById('char-name');
    const characterTabsContainer = document.getElementById('character-tabs');
    const rhymeModal = document.getElementById('rhyme-modal');
    const rhymeInput = document.getElementById('rhyme-input');
    const rhymeResults = document.getElementById('rhyme-results');
    const manualBuilder = document.getElementById('manual-builder');
    const aiBuilder = document.getElementById('ai-builder');
    const aiCharacterModal = document.getElementById('ai-character-modal');
    const generateAiAvatarBtn = document.getElementById('generate-ai-avatar-btn');
    const aiScenarioModal = document.getElementById('ai-scenario-modal');
    const aiScenarioCard = document.getElementById('ai-scenario-card');
    const aiSceneModal = document.getElementById('ai-scene-modal');
    let currentPageToIllustrate = '';

    const saveState = () => localStorage.setItem('storybookState', JSON.stringify(appState));
    const loadState = () => {
        const savedState = localStorage.getItem('storybookState');
        if (savedState) appState = JSON.parse(savedState);
    };

        const generateImage = async (prompt, type) => {
            try {
                const response = await fetch('/api/ai/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, type })
                });
                const result = await response.json();
                if (result?.imageBase64) {
                    return `data:image/png;base64,${result.imageBase64}`;
                } else {
                    throw new Error('No se recibió una imagen válida.');
                }
            } catch (error) {
                console.error('Error generando imagen:', error);
                return null;
            }
        };

    const handleAIGenerationSubmit = async () => {
        const type = document.getElementById('ai-char-type')?.value || '';
        const hair = document.getElementById('ai-char-hair')?.value || '';
        const clothing = document.getElementById('ai-char-clothing')?.value || '';
        const feature = document.getElementById('ai-char-feature')?.value || '';
        let prompt = `${type} con ${hair}`.trim();
        if (clothing) prompt += `, que lleva ${clothing}`;
        if (feature) prompt += `, ${feature}`;

        aiCharacterModal?.classList.remove('visible');
        if (generateAiAvatarBtn) {
            generateAiAvatarBtn.innerHTML = '<div class="loader"></div> Creando...';
            generateAiAvatarBtn.disabled = true;
        }
        const avatarPreview = document.getElementById('avatar-preview');
        if (avatarPreview) avatarPreview.innerHTML = '<div class="loader"></div>';

        const imageUrl = await generateImage(prompt, 'character');

        if (generateAiAvatarBtn) {
            generateAiAvatarBtn.innerHTML = 'Crear Personaje';
            generateAiAvatarBtn.disabled = false;
        }

        if (imageUrl) {
            const char = appState.storyData.characters[appState.editingCharIndex];
            if (char) {
                char.avatar.aiAvatarUrl = imageUrl;
                char.avatar.builderMode = 'ai';
                renderAvatar();
                saveState();
            }
        } else if (avatarPreview) {
            avatarPreview.innerHTML = 'Error al crear la imagen.';
        }
    };

    const handleAIScenarioSubmit = async () => {
        const type = document.getElementById('ai-scenario-type')?.value || '';
        const atmosphere = document.getElementById('ai-scenario-atmosphere')?.value || '';
        const element = document.getElementById('ai-scenario-element')?.value || '';
        let prompt = `${type} ${atmosphere}`.trim();
        if (element) prompt += `, ${element}`;

        aiScenarioModal?.classList.remove('visible');
        if (aiScenarioCard) {
            aiScenarioCard.innerHTML = '<div class="loader"></div><span>Generando...</span>';
            aiScenarioCard.classList.add('loading');
        }

        const imageUrl = await generateImage(prompt, 'scenario');

        if (imageUrl) {
            appState.storyData.scenario = {
                builderMode: 'ai',
                aiImageUrl: imageUrl,
                description: `un lugar mágico sobre ${type}`
            };
            populateForm();
            saveData();
        } else if (aiScenarioCard) {
            aiScenarioCard.innerHTML = '<i data-lucide="alert-triangle"></i><span>Error</span>';
        }
        lucide.createIcons();
    };

    const continueStoryWithAI = async (targetId) => {
        const textarea = document.getElementById(targetId);
        const button = document.querySelector(`.idea-btn[data-target="${targetId}"]`);
        const currentText = textarea?.value || '';
        const protagonistName = appState.storyData.characters[0]?.name || 'el protagonista';

        if (button) {
            button.innerHTML = '<div class="loader" style="border-top-color: var(--primary-color);"></div>';
            button.disabled = true;
        }

            const apiUrl = '/api/ai/generate-text';
            const systemPrompt =
            'Eres un asistente de escritura creativa para niños. Escribe de forma sencilla, imaginativa y divertida. Continúa la historia con una o dos frases cortas.';
            const userQuery = `Continúa este cuento infantil sobre ${protagonistName}. El texto actual es: "${currentText}"`;

        try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: userQuery, systemPrompt, model: 'gemini-1.5-flash' })
                });
                const result = await response.json();
                const generatedText = result?.text;
            if (generatedText && textarea) {
                textarea.value += (currentText.length > 0 ? ' ' : '') + generatedText.trim();
                saveData();
            } else {
                throw new Error('No se recibió texto válido.');
            }
        } catch (error) {
            console.error('Error generando texto:', error);
        } finally {
            if (button) {
                button.innerHTML = '<i data-lucide="lightbulb"></i>';
                button.disabled = false;
            }
            lucide.createIcons();
        }
    };

    const handleAISceneSubmit = async () => {
        const prompt = document.getElementById('ai-scene-prompt')?.value?.trim() || '';
        if (!currentPageToIllustrate || !prompt) {
            aiSceneModal?.classList.remove('visible');
            return;
        }
        const previewMap = {
            introduction: 'preview-intro',
            development: 'preview-dev',
            conclusion: 'preview-end'
        };
        const previewId = previewMap[currentPageToIllustrate];
        const preview = previewId ? document.getElementById(previewId) : null;
        if (preview) preview.innerHTML = '<div class="loader"></div>';

        const imageUrl = await generateImage(prompt, 'scenario');
        if (imageUrl) {
            appState.storyData[currentPageToIllustrate].imageUrl = imageUrl;
            populateForm();
            saveData();
        } else if (preview) {
            preview.innerHTML = 'Error al crear la imagen.';
        }
        aiSceneModal?.classList.remove('visible');
    };

    const renderAvatar = () => {
        const char = appState.storyData.characters[appState.editingCharIndex];
        if (!char) return;
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        if (char.avatar.builderMode === 'ai' && char.avatar.aiAvatarUrl) {
            preview.innerHTML = `<img src="${char.avatar.aiAvatarUrl}" alt="Personaje generado por IA">`;
        } else {
            const { body, eyes, hair, clothing } = char.avatar;
            const svgContent = `<svg viewBox="0 0 200 350">${
                avatarParts.body[body] || ''
            }${avatarParts.clothing[clothing] || ''}${avatarParts.hair[hair] || ''}${
                avatarParts.eyes[eyes] || ''
            }</svg>`;
            preview.innerHTML = svgContent;
        }
    };

    const switchBuilderMode = (mode) => {
        const char = appState.storyData.characters[appState.editingCharIndex];
        if (!char) return;
        char.avatar.builderMode = mode;
        if (manualBuilder) manualBuilder.style.display = mode === 'manual' ? 'block' : 'none';
        if (aiBuilder) aiBuilder.style.display = mode === 'ai' ? 'block' : 'none';
        document.querySelectorAll('.mode-btn').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        renderAvatar();
        saveState();
    };

    const createOptionButtons = () => {
        Object.keys(avatarParts).forEach((part) => {
            const container = document.getElementById(`${part}-options`);
            if (!container) return;
            container.innerHTML = '';
            Object.keys(avatarParts[part]).forEach((option) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.dataset.part = part;
                btn.dataset.option = option;
                btn.innerHTML = `<svg viewBox="0 0 100 100"><g transform="translate(-50, -120) scale(0.8)">${
                    avatarParts[part][option]
                }</g></svg>`;
                container.appendChild(btn);
            });
        });
    };

    const updateSelectedButtons = () => {
        const char = appState.storyData.characters[appState.editingCharIndex];
        if (!char) return;
        document.querySelectorAll('.option-btn').forEach((btn) => {
            btn.classList.toggle('selected', char.avatar[btn.dataset.part] === btn.dataset.option);
        });
    };

    const switchCharacterTab = (index) => {
        if (index < 0 || index >= appState.storyData.characters.length) return;
        appState.editingCharIndex = index;
        const char = appState.storyData.characters[index];
        if (!char) return;
        if (charNameInput) charNameInput.value = char.name;
        switchBuilderMode(char.avatar.builderMode || 'manual');
        renderCharacterTabs();
        renderAvatar();
        updateSelectedButtons();
    };

    const renderCharacterTabs = () => {
        if (!characterTabsContainer) return;
        characterTabsContainer.innerHTML = '';
        appState.storyData.characters.forEach((char, index) => {
            const tab = document.createElement('div');
            tab.className = `char-tab ${char.type}`;
            tab.innerHTML = `<span>${char.type.charAt(0).toUpperCase() + char.type.slice(1)}</span>`;
            if (index === appState.editingCharIndex) tab.classList.add('active');

            if (char.type !== 'protagonist') {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-char-btn';
                deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width:16px; height:16px;"></i>';
                deleteBtn.title = 'Eliminar personaje';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteCharacter(index);
                };
                tab.appendChild(deleteBtn);
            }

            tab.addEventListener('click', () => switchCharacterTab(index));
            characterTabsContainer.appendChild(tab);
        });

        if (appState.storyData.characters.length < 3) {
            const addBtn = document.createElement('button');
            addBtn.className = 'add-char-btn';
            addBtn.innerHTML = '<i data-lucide="plus-circle"></i>';
            addBtn.title = 'Añadir personaje';
            addBtn.onclick = addNewCharacter;
            characterTabsContainer.appendChild(addBtn);
        }
        lucide.createIcons();
    };

    const addNewCharacter = () => {
        if (appState.storyData.characters.length >= 3) return;
        const type = appState.storyData.characters.some((c) => c.type === 'friend') ? 'villain' : 'friend';
        const newChar = {
            type,
            name: '',
            avatar: {
                builderMode: 'manual',
                body: 'human',
                eyes: 'normal',
                hair: 'short',
                clothing: 'tshirt',
                aiAvatarUrl: null
            }
        };
        appState.storyData.characters.push(newChar);
        switchCharacterTab(appState.storyData.characters.length - 1);
        saveState();
    };

    const deleteCharacter = (index) => {
        appState.storyData.characters.splice(index, 1);
        const newIndex = Math.min(
            appState.editingCharIndex,
            appState.storyData.characters.length - 1
        );
        switchCharacterTab(newIndex);
        saveState();
    };

    const initializeCharacters = () => {
        if (!appState.storyData.characters || appState.storyData.characters.length === 0) {
            appState.storyData.characters = [
                {
                    type: 'protagonist',
                    name: '',
                    avatar: {
                        builderMode: 'manual',
                        body: 'human',
                        eyes: 'normal',
                        hair: 'short',
                        clothing: 'tshirt',
                        aiAvatarUrl: null
                    }
                }
            ];
        }
        appState.storyData.characters.forEach((char) => {
            if (!char.avatar.builderMode) {
                char.avatar.builderMode = 'manual';
                char.avatar.aiAvatarUrl = null;
            }
        });
        if (appState.editingCharIndex >= appState.storyData.characters.length) {
            appState.editingCharIndex = 0;
        }
        switchCharacterTab(appState.editingCharIndex);
    };

    const switchView = (view) => {
        appState.currentView = view;
        const creatorToggle = document.querySelector('#main-nav [data-view="creator"]');
        const libraryToggle = document.querySelector('#main-nav [data-view="library"]');

        if (view === 'library') {
            if (creatorView) creatorView.style.display = 'none';
            if (libraryView) libraryView.style.display = 'flex';
            const creatorNav = document.getElementById('creator-nav');
            if (creatorNav) creatorNav.style.display = 'none';
            libraryToggle?.classList.add('active');
            creatorToggle?.classList.remove('active');
            renderLibrary();
        } else {
            if (creatorView) creatorView.style.display = 'flex';
            if (libraryView) libraryView.style.display = 'none';
            const creatorNav = document.getElementById('creator-nav');
            if (creatorNav) creatorNav.style.display = 'block';
            creatorToggle?.classList.add('active');
            libraryToggle?.classList.remove('active');
            populateForm();
            showStep(appState.currentStep, 'none');
        }
    };

    const showStep = (stepNumber, direction = 'forward') => {
        const oldStep = appState.currentStep;
        if (stepNumber === oldStep && direction !== 'none') return;
        if ([4, 5, 6].includes(stepNumber)) setWritingChallenges();
        const currentStepEl = document.getElementById(`step${oldStep}`);
        if (direction !== 'none' && currentStepEl) {
            currentStepEl.classList.add(direction === 'forward' ? 'exiting-left' : 'exiting-right');
            currentStepEl.addEventListener(
                'transitionend',
                () => currentStepEl.classList.remove('active', 'exiting-left', 'exiting-right'),
                { once: true }
            );
        } else {
            steps.forEach((s) => s.classList.remove('active'));
        }
        appState.currentStep = stepNumber;
        const newStepEl = document.getElementById(`step${appState.currentStep}`);
        newStepEl?.classList.add('active');
        document.querySelectorAll('#creator-nav .nav-link').forEach((link) => {
            link.classList.toggle('active', link.dataset.step == appState.currentStep);
        });
        updateNavButtons();
    };

    const updateNavButtons = () => {
        const nav = document.querySelector('.navigation');
        if (nav && prevBtn && nextBtn) {
            prevBtn.disabled = appState.currentStep === 1;
            nav.style.display = appState.currentStep === totalSteps ? 'none' : 'flex';
            nextBtn.innerHTML =
                appState.currentStep === totalSteps - 1
                    ? '¡Ver mi cuento! <i data-lucide="book-open-check"></i>'
                    : 'Siguiente <i data-lucide="arrow-right"></i>';
            lucide.createIcons();
        }
    };

    const saveData = () => {
        const data = appState.storyData;
        switch (appState.currentStep) {
            case 1:
                data.ideaChar = document.getElementById('idea-char')?.textContent || '';
                data.ideaPlace = document.getElementById('idea-place')?.textContent || '';
                data.ideaMission = document.getElementById('idea-mission')?.textContent || '';
                break;
            case 2: {
                const char = data.characters[appState.editingCharIndex];
                if (char && charNameInput) char.name = charNameInput.value;
                break;
            }
            case 3: {
                const selectedScenarioCard = document.querySelector('#scenario-selector .selected');
                if (selectedScenarioCard) {
                    const el = selectedScenarioCard;
                    if (el.id === 'ai-scenario-card') {
                        // Already saved via AI
                    } else {
                        data.scenario = { builderMode: 'manual', description: el.dataset.value };
                    }
                }
                break;
            }
            case 4:
                data.introduction.text = document.getElementById('plot-start')?.value || '';
                break;
            case 5:
                data.development.text = document.getElementById('plot-middle')?.value || '';
                break;
            case 6:
                data.conclusion.text = document.getElementById('plot-end')?.value || '';
                break;
            case 7:
                data.title = document.getElementById('story-title')?.value || '';
                data.author = document.getElementById('author-name')?.value || '';
                break;
        }
        saveState();
    };

    const populateForm = () => {
        const data = appState.storyData;
        initializeCharacters();
        const start = document.getElementById('plot-start');
        const middle = document.getElementById('plot-middle');
        const end = document.getElementById('plot-end');
        if (start) start.value = data.introduction?.text || '';
        if (middle) middle.value = data.development?.text || '';
        if (end) end.value = data.conclusion?.text || '';

        const introPreview = document.getElementById('preview-intro');
        if (introPreview)
            introPreview.innerHTML = data.introduction?.imageUrl
                ? `<img src="${data.introduction.imageUrl}">`
                : '';
        const devPreview = document.getElementById('preview-dev');
        if (devPreview)
            devPreview.innerHTML = data.development?.imageUrl
                ? `<img src="${data.development.imageUrl}">`
                : '';
        const endPreview = document.getElementById('preview-end');
        if (endPreview)
            endPreview.innerHTML = data.conclusion?.imageUrl
                ? `<img src="${data.conclusion.imageUrl}">`
                : '';

        const title = document.getElementById('story-title');
        const author = document.getElementById('author-name');
        if (title) title.value = data.title || '';
        if (author) author.value = data.author || '';

        document
            .querySelectorAll('#scenario-selector .selection-card')
            .forEach((c) => c.classList.remove('selected'));
        if (data.scenario?.builderMode === 'ai' && data.scenario.aiImageUrl) {
            if (aiScenarioCard)
                aiScenarioCard.innerHTML = `<img src="${data.scenario.aiImageUrl}" alt="Escenario generado por IA"><span>${data.scenario.description}</span>`;
            aiScenarioCard?.classList.add('selected');
        } else {
            if (aiScenarioCard) {
                aiScenarioCard.innerHTML =
                    '<i data-lucide="sparkles" style="width: 60px; height: 60px; color: var(--ai-color);"></i><span>Crear con IA</span>';
                lucide.createIcons();
            }
            const selectedCard = document.querySelector(
                `#scenario-selector .selection-card[data-value="${data.scenario?.description}"]`
            );
            if (selectedCard) selectedCard.classList.add('selected');
        }
    };

    const generatePreview = (story) => {
        const h = document.getElementById('preview-title');
        const a = document.getElementById('preview-author');
        const container = document.getElementById('preview-content');
        if (!h || !a || !container) return;
        h.textContent = story.title || 'Mi Cuento Sin Título';
        a.textContent = story.author || 'Un autor anónimo';
        let charactersIntro = story.characters
            .map((c) => `<strong>${c.name || c.type}</strong>`)
            .join(', ');
        let scenarioIntro = story.scenario?.description || 'un lugar misterioso';
        let content = `<p>Esta es la historia de ${charactersIntro} en ${scenarioIntro}.</p>`;
        content += `<div class="preview-page">`;
        if (story.introduction?.imageUrl)
            content += `<div class="preview-page-image"><img src="${story.introduction.imageUrl}"></div>`;
        if (story.introduction?.text)
            content += `<div class="preview-page-text"><p>${story.introduction.text}</p></div>`;
        content += `</div>`;
        content += `<div class="preview-page">`;
        if (story.development?.imageUrl)
            content += `<div class="preview-page-image"><img src="${story.development.imageUrl}"></div>`;
        if (story.development?.text)
            content += `<div class="preview-page-text"><p>${story.development.text}</p></div>`;
        content += `</div>`;
        content += `<div class="preview-page">`;
        if (story.conclusion?.imageUrl)
            content += `<div class="preview-page-image"><img src="${story.conclusion.imageUrl}"></div>`;
        if (story.conclusion?.text)
            content += `<div class="preview-page-text"><p>${story.conclusion.text}</p></div>`;
        content += `</div>`;
        container.innerHTML = content;
    };

    const renderLibrary = () => {
        if (!bookshelf) return;
        bookshelf.innerHTML = '';
        if (appState.library.length === 0) {
            bookshelf.innerHTML =
                '<p style="grid-column: 1 / -1; text-align: center; color: #718096;">Tu estantería está vacía. ¡Crea un cuento para empezar tu colección!</p>';
            return;
        }
        appState.library.forEach((story) => {
            const book = document.createElement('div');
            book.className = 'book-cover';
            book.style.backgroundColor = `hsl(${story.id % 360}, 30%, 60%)`;
            book.innerHTML = `<div class="book-title">${story.title || 'Sin Título'}</div><div class="book-author">${story.author || 'Anónimo'}</div>`;
            book.addEventListener('click', () => {
                appState.storyData = story;
                switchView('creator');
                generatePreview(story);
                showStep(totalSteps, 'none');
            });
            bookshelf.appendChild(book);
        });
    };

    const resetCreator = () => {
        appState.storyData = {
            characters: [],
            scenario: {},
            introduction: { text: '', imageUrl: null },
            development: { text: '', imageUrl: null },
            conclusion: { text: '', imageUrl: null }
        };
        appState.currentStep = 1;
        appState.maxStepReached = 1;
        appState.editingCharIndex = 0;
        populateForm();
        generateIdea();
        saveState();
        switchView('creator');
    };

    const setWritingChallenges = () => {
        document.querySelectorAll('.writing-challenge').forEach((el) => {
            el.textContent =
                'Desafío: ' + writingChallenges[Math.floor(Math.random() * writingChallenges.length)];
        });
    };

    const getWritingIdea = (targetId) => {
        continueStoryWithAI(targetId);
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    };

    const findRhymes = async () => {
        const word = rhymeInput?.value?.trim() || '';
        if (word.length < 2) {
            if (rhymeResults) rhymeResults.innerHTML = '';
            return;
        }
        try {
            const response = await fetch(`https://api.datamuse.com/words?rel_rhy=${word}`);
            const data = await response.json();
            if (rhymeResults) {
                if (data.length > 0) {
                    rhymeResults.innerHTML = data
                        .slice(0, 20)
                        .map((item) => `<span>${item.word}</span>`) 
                        .join('');
                } else {
                    rhymeResults.innerHTML = '<span>No se encontraron rimas. ¡Intenta con otra palabra!</span>';
                }
            }
        } catch (error) {
            if (rhymeResults) rhymeResults.innerHTML = '<span>Hubo un error al buscar.</span>';
        }
    };

    // Event listeners
    charNameInput?.addEventListener('input', saveData);
    document.querySelector('.avatar-options')?.addEventListener('click', (e) => {
        const optionBtn = e.target.closest('.option-btn');
        if (optionBtn) {
            const char = appState.storyData.characters[appState.editingCharIndex];
            if (!char) return;
            char.avatar[optionBtn.dataset.part] = optionBtn.dataset.option;
            renderAvatar();
            updateSelectedButtons();
            saveState();
        }
        const modeBtn = e.target.closest('.mode-btn');
        if (modeBtn) switchBuilderMode(modeBtn.dataset.mode);
    });

    nextBtn?.addEventListener('click', () => {
        saveData();
        if (appState.currentStep < totalSteps) {
            if (appState.currentStep + 1 > appState.maxStepReached) {
                appState.maxStepReached = appState.currentStep + 1;
            }
            if (appState.currentStep + 1 === totalSteps) generatePreview(appState.storyData);
            showStep(appState.currentStep + 1, 'forward');
            saveState();
        }
    });
    prevBtn?.addEventListener('click', () => {
        saveData();
        if (appState.currentStep > 1) {
            showStep(appState.currentStep - 1, 'backward');
            saveState();
        }
    });

    document.querySelectorAll('#main-nav .nav-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.getAttribute('data-view');
            if (view) switchView(view);
        });
    });

    document.querySelectorAll('#creator-nav .nav-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const step = parseInt(link.getAttribute('data-step'));
            if (step <= appState.maxStepReached) {
                saveData();
                showStep(step, step > appState.currentStep ? 'forward' : 'backward');
            }
        });
    });

    const ideaBtn = document.getElementById('idea-generator-btn');
    function generateIdea() {
        const data = appState.storyData;
        const ideas = {
            personajes: ['un dragón miedoso', 'una princesa astronauta', 'un robot cocinero'],
            lugares: ['el fondo del mar', 'una nube de algodón de azúcar', 'una biblioteca secreta'],
            mision: ['encontrar un calcetín perdido', 'organizar la mejor fiesta', 'resolver el misterio de la tarta']
        };
        data.ideaChar = ideas.personajes[Math.floor(Math.random() * ideas.personajes.length)];
        data.ideaPlace = ideas.lugares[Math.floor(Math.random() * ideas.lugares.length)];
        data.ideaMission = ideas.mision[Math.floor(Math.random() * ideas.mision.length)];
        const ideaChar = document.getElementById('idea-char');
        const ideaPlace = document.getElementById('idea-place');
        const ideaMission = document.getElementById('idea-mission');
        if (ideaChar) ideaChar.textContent = data.ideaChar;
        if (ideaPlace) ideaPlace.textContent = data.ideaPlace;
        if (ideaMission) ideaMission.textContent = data.ideaMission;
    }
    if (ideaBtn) ideaBtn.addEventListener('click', () => {
        generateIdea();
        saveData();
    });

    document.getElementById('save-to-library-btn')?.addEventListener('click', () => {
        const newStory = { ...appState.storyData, id: Date.now() };
        appState.library.unshift(newStory);
        resetCreator();
        switchView('library');
    });

    document.getElementById('restart-btn')?.addEventListener('click', resetCreator);
    document.getElementById('new-story-from-library-btn')?.addEventListener('click', resetCreator);

    document.querySelectorAll('.idea-btn').forEach((btn) => {
        btn.addEventListener('click', () => getWritingIdea(btn.getAttribute('data-target')));
    });
    document.getElementById('rhyme-tool-btn')?.addEventListener('click', () =>
        rhymeModal?.classList.add('visible')
    );
    document.getElementById('close-rhyme-modal')?.addEventListener('click', () =>
        rhymeModal?.classList.remove('visible')
    );
    rhymeModal?.addEventListener('click', (e) => {
        if (e.target === rhymeModal) rhymeModal.classList.remove('visible');
    });
    rhymeInput?.addEventListener('input', debounce(findRhymes, 500));

    document.getElementById('open-ai-assistant-btn')?.addEventListener('click', () =>
        aiCharacterModal?.classList.add('visible')
    );
    document.getElementById('close-ai-modal')?.addEventListener('click', () =>
        aiCharacterModal?.classList.remove('visible')
    );
    aiCharacterModal?.addEventListener('click', (e) => {
        if (e.target === aiCharacterModal) aiCharacterModal.classList.remove('visible');
    });
    generateAiAvatarBtn?.addEventListener('click', handleAIGenerationSubmit);

    aiScenarioCard?.addEventListener('click', () => {
        if (appState.storyData.scenario?.builderMode !== 'ai') {
            aiScenarioModal?.classList.add('visible');
        }
    });
    document.getElementById('close-ai-scenario-modal')?.addEventListener('click', () =>
        aiScenarioModal?.classList.remove('visible')
    );
    aiScenarioModal?.addEventListener('click', (e) => {
        if (e.target === aiScenarioModal) aiScenarioModal.classList.remove('visible');
    });
    document
        .getElementById('generate-ai-scenario-btn')
        ?.addEventListener('click', handleAIScenarioSubmit);

    document.getElementById('scenario-selector')?.addEventListener('click', (e) => {
        const card = e.target.closest('.selection-card');
        if (card && card.id !== 'ai-scenario-card') {
            document
                .querySelectorAll('#scenario-selector .selection-card')
                .forEach((c) => c.classList.remove('selected'));
            card.classList.add('selected');
            saveData();
        }
    });

    document.querySelectorAll('.illustrate-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            currentPageToIllustrate = btn.getAttribute('data-page');
            const promptEl = document.getElementById('ai-scene-prompt');
            if (promptEl) promptEl.value = '';
            aiSceneModal?.classList.add('visible');
        });
    });
    document.getElementById('close-ai-scene-modal')?.addEventListener('click', () =>
        aiSceneModal?.classList.remove('visible')
    );
    aiSceneModal?.addEventListener('click', (e) => {
        if (e.target === aiSceneModal) aiSceneModal.classList.remove('visible');
    });
    document
        .getElementById('generate-ai-scene-btn')
        ?.addEventListener('click', handleAISceneSubmit);

    // Inicialización
    loadState();
    createOptionButtons();
    switchView(appState.currentView);
});
