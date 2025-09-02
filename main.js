// JavaScript extraído de index.html
document.addEventListener('DOMContentLoaded', () => {
    // API base config: allows running UI on GitHub Pages and hitting Vercel serverless
    const inferredApiBase = (() => {
        const env = (typeof window !== 'undefined' && window.ENV_API_BASE) || '';
        if (env) return env.replace(/\/$/, '');
        // If hosted on GitHub Pages, default to your Vercel deployment (set your URL below if needed)
        const isPages = /github\.io$/i.test(window.location.host);
        if (isPages) {
            // Change this to your Production or Preview URL if different
            return 'https://<TU-PROYECTO>.vercel.app';
        }
        return '';
    })();
    const apiBase = inferredApiBase;
    // writingChallenges (constructor manual eliminado)
    const writingChallenges = [
        'Intenta describir cómo huele el lugar.',
        "Usa la palabra 'centelleante' en tu historia.",
        'Describe un sonido que escuche tu personaje.',
        'Escribe sobre algo que haga reír a tu personaje.'
    ];
    // Definición única de appState
    let appState = {
        currentView: 'creator',
        currentStep: 1,
        maxStepReached: 1,
        editingCharIndex: 0,
        storyData: {
            characters: [],
            scenario: {},
            cover: { imageUrl: null, prompt: '' },
            introduction: [{ text: '', imageUrl: null }],
            development: [{ text: '', imageUrl: null }],
            conclusion: [{ text: '', imageUrl: null }]
        },
        library: [],
    pageSelection: { introduction: 0, development: 0, conclusion: 0 },
    previewOptions: { showPageNumbers: false }
    };
    const totalSteps = 8;
    const creatorView = document.getElementById('creator-view');
    const libraryView = document.getElementById('library-view');
    const steps = document.querySelectorAll('.main-content');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const bookshelf = document.getElementById('bookshelf');
    const charNameInput = document.getElementById('char-name');
    const charRoleSelect = document.getElementById('char-role');
    const charSpecies = document.getElementById('char-species');
    const charAge = document.getElementById('char-age');
    const charPersonality = document.getElementById('char-personality');
    const charLikes = document.getElementById('char-likes');
    const charStrengths = document.getElementById('char-strengths');
    const charWeaknesses = document.getElementById('char-weaknesses');
    const charGoal = document.getElementById('char-goal');
    const charBackstory = document.getElementById('char-backstory');
    const charStyle = document.getElementById('char-style');
    const characterTabsContainer = document.getElementById('character-tabs');
    const rhymeModal = document.getElementById('rhyme-modal');
    const rhymeInput = document.getElementById('rhyme-input');
    const rhymeResults = document.getElementById('rhyme-results');
    const manualBuilder = null;
    const aiBuilder = document.getElementById('ai-builder');
    const aiCharacterModal = document.getElementById('ai-character-modal');
    const generateAiAvatarBtn = document.getElementById('generate-ai-avatar-btn');
    const aiScenarioModal = document.getElementById('ai-scenario-modal');
    const aiScenarioCard = document.getElementById('ai-scenario-card');
    const aiSceneModal = document.getElementById('ai-scene-modal');
    let currentPageToIllustrate = '';
    const quillEditors = {}; // key: uniqueId, value: Quill instance

    const saveState = () => localStorage.setItem('storybookState', JSON.stringify(appState));
    const loadState = () => {
        const savedState = localStorage.getItem('storybookState');
        if (savedState) appState = JSON.parse(savedState);
    };

    const generateImage = async (prompt, type) => {
            try {
        const response = await fetch(`${apiBase || ''}/api/ai/generate-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, type })
                });
                let result = null;
                try {
                    result = await response.json();
                } catch (_) {
                    // Respuesta sin JSON (p.ej. 404/405 en servidor estático)
                }
                if (!response.ok) {
                    const msg = result?.error || `HTTP ${response.status}`;
                    console.warn(`generate-image no OK: ${msg}`);
                    return null;
                }
                if (result?.imageBase64) {
                    return `data:image/png;base64,${result.imageBase64}`;
                }
                return null;
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
        const age = document.getElementById('ai-char-age')?.value || '';
        const personality = document.getElementById('ai-char-personality')?.value || '';
        const likes = document.getElementById('ai-char-likes')?.value || '';
        const strengths = document.getElementById('ai-char-strengths')?.value || '';
        const weaknesses = document.getElementById('ai-char-weaknesses')?.value || '';
        const goal = document.getElementById('ai-char-goal')?.value || '';
        const backstory = document.getElementById('ai-char-backstory')?.value || '';
        const style = document.getElementById('ai-char-style')?.value || '';
        let prompt = `${type} con ${hair}`.trim();
        if (age) prompt += `, ${age}`;
        if (clothing) prompt += `, que lleva ${clothing}`;
        if (feature) prompt += `, ${feature}`;
        if (personality) prompt += `. Personalidad: ${personality}`;
        if (likes) prompt += `. Le gusta: ${likes}`;
        if (strengths) prompt += `. Fortalezas: ${strengths}`;
        if (weaknesses) prompt += `. Retos: ${weaknesses}`;
        if (goal) prompt += `. Objetivo: ${goal}`;
        if (backstory) prompt += `. Contexto: ${backstory}`;
        if (style) prompt += `. Estilo al hablar: ${style}`;

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
                // Guardar imagen IA y detalles desde el modal
                char.avatar.aiAvatarUrl = imageUrl;
                char.avatar.builderMode = 'ai';
                char.details = char.details || {};
                char.details.species = type || '';
                char.details.age = age || '';
                char.details.personality = personality || '';
                char.details.likes = likes || '';
                char.details.strengths = strengths || '';
                char.details.weaknesses = weaknesses || '';
                char.details.goal = goal || '';
                char.details.backstory = backstory || '';
                char.details.style = style || '';
                // Volcar los inputs de la ficha visible
                const setIf = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
                setIf('char-species', char.details.species);
                setIf('char-age', char.details.age);
                setIf('char-personality', char.details.personality);
                setIf('char-likes', char.details.likes);
                setIf('char-strengths', char.details.strengths);
                setIf('char-weaknesses', char.details.weaknesses);
                setIf('char-goal', char.details.goal);
                const bs2 = document.getElementById('char-backstory'); if (bs2) bs2.value = char.details.backstory || '';
                setIf('char-style', char.details.style);
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

            const apiUrl = `${apiBase || ''}/api/ai/generate-text`;
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
        const promptBase = document.getElementById('ai-scene-prompt')?.value?.trim() || '';
        // Build character context from selected checkboxes
        const selectedIdxs = Array.from(document.querySelectorAll('#scene-characters-list input[type="checkbox"]:checked'))
            .map((el) => parseInt(el.getAttribute('data-index') || '0', 10));
        const selectedChars = selectedIdxs
            .map((idx) => appState.storyData.characters[idx])
            .filter(Boolean);
        let charSnippet = '';
        if (selectedChars.length > 0) {
            const parts = selectedChars.map((c) => {
                const d = c.details || {};
                const role = (c.type || 'personaje');
                const name = c.name ? `${c.name}, ` : '';
                const species = d.species || '';
                const personality = d.personality ? `, ${d.personality}` : '';
                return `${name}${role} (${species}${personality})`;
            });
            charSnippet = ` Personajes: ${parts.join('; ')}.`;
        }
        const prompt = `${promptBase}${charSnippet}`.trim();
        if (!currentPageToIllustrate || !prompt) {
            aiSceneModal?.classList.remove('visible');
            return;
        }
        let preview = null;
        if (typeof currentPageToIllustrate === 'string') {
            // Compatibilidad con UI antigua
            const previewMap = { introduction: 'preview-intro', development: 'preview-dev', conclusion: 'preview-end' };
            const previewId = previewMap[currentPageToIllustrate];
            preview = previewId ? document.getElementById(previewId) : null;
        } else if (currentPageToIllustrate && typeof currentPageToIllustrate === 'object') {
            const { section, index } = currentPageToIllustrate;
            preview = document.getElementById(`${section}-preview-${index}`);
        }
        if (preview) preview.innerHTML = '<div class="loader"></div>';

    const imageUrl = await generateImage(prompt, 'scenario');
        if (imageUrl) {
            if (typeof currentPageToIllustrate === 'string') {
                const sectionKey = currentPageToIllustrate;
                const sectionVal = appState.storyData[sectionKey];
                if (Array.isArray(sectionVal)) {
                    if (sectionVal.length === 0) sectionVal.push({ text: '', imageUrl: null });
                    sectionVal[0].imageUrl = imageUrl;
                    sectionVal[0].charactersIncluded = selectedIdxs;
                } else {
                    appState.storyData[sectionKey] = {
                        ...(sectionVal && !Array.isArray(sectionVal) ? sectionVal : {}),
                        imageUrl,
                        charactersIncluded: selectedIdxs
                    };
                }
            } else if (currentPageToIllustrate && typeof currentPageToIllustrate === 'object') {
                const { section, index } = currentPageToIllustrate;
                const arr = appState.storyData[section];
                if (Array.isArray(arr)) {
                    if (!arr[index]) arr[index] = { text: '', imageUrl: null };
                    arr[index].imageUrl = imageUrl;
                    arr[index].charactersIncluded = selectedIdxs;
                }
            }
            populateForm();
            saveData();
            // If we're on the final preview step, refresh it so new images/text appear immediately
            if (appState.currentStep === totalSteps) {
                generatePreview(appState.storyData);
            }
        } else if (preview) {
            preview.innerHTML = 'Error al crear la imagen.';
        }
        aiSceneModal?.classList.remove('visible');
    };

    const createOptionButtons = () => {};

    // Exponer funciones clave al ámbito global para evitar problemas de alcance en listeners
    window.handleAISceneSubmit = handleAISceneSubmit;

    const populateSceneCharacters = () => {
        const list = document.getElementById('scene-characters-list');
        if (!list) return;
        list.innerHTML = '';
        // Determinar qué página está activa para preseleccionar
        let included = [];
        if (currentPageToIllustrate && typeof currentPageToIllustrate === 'object') {
            const { section, index } = currentPageToIllustrate;
            const arr = appState.storyData[section];
            if (Array.isArray(arr) && arr[index] && Array.isArray(arr[index].charactersIncluded)) {
                included = arr[index].charactersIncluded;
            }
        } else if (typeof currentPageToIllustrate === 'string') {
            const sectionKey = currentPageToIllustrate;
            const sectionVal = appState.storyData[sectionKey];
            const pageObj = Array.isArray(sectionVal) ? sectionVal[0] : sectionVal;
            if (pageObj && Array.isArray(pageObj.charactersIncluded)) {
                included = pageObj.charactersIncluded;
            }
        }
        const includedSet = new Set((included || []).map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n)));
        appState.storyData.characters.forEach((c, idx) => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.setAttribute('data-index', String(idx));
            if (includedSet.has(idx)) cb.checked = true;
            label.appendChild(cb);
            const span = document.createElement('span');
            const role = c.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : 'Personaje';
            span.textContent = `${role}${c.name ? ': ' + c.name : ''}`;
            label.appendChild(span);
            list.appendChild(label);
        });
    };

    // Render dinámico de páginas por sección
    const renderSectionPages = (sectionKey, editorId, thumbsId) => {
        const editor = document.getElementById(editorId);
        const thumbs = document.getElementById(thumbsId);
        if (!editor || !thumbs) return;
        const arr = Array.isArray(appState.storyData[sectionKey]) ? appState.storyData[sectionKey] : [];
        const selected = appState.pageSelection?.[sectionKey] ?? 0;

        // Thumbnails
        thumbs.innerHTML = '';
        arr.forEach((p, idx) => {
            const t = document.createElement('div');
            t.className = 'page-thumb';
            if (idx === selected) t.classList.add('active');
            t.setAttribute('draggable', 'true');
            t.dataset.index = String(idx);
            t.innerHTML = `
                <div class="thumb-num">${idx + 1}</div>
                ${p?.imageUrl ? `<img src="${p.imageUrl}" alt="miniatura"/>` : '<div class="thumb-placeholder"></div>'}
            `;
            t.addEventListener('click', () => {
                appState.pageSelection[sectionKey] = idx;
                renderSectionPages(sectionKey, editorId, thumbsId);
                saveState();
            });
            t.addEventListener('dragstart', (e) => {
                if (e.dataTransfer) {
                    e.dataTransfer.setData('text/plain', String(idx));
                    e.dataTransfer.setDragImage(t, 10, 10);
                    e.dataTransfer.effectAllowed = 'move';
                }
            });
            thumbs.appendChild(t);
        });

        // DnD handlers en el contenedor
        thumbs.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        });
        thumbs.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromStr = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
            const from = fromStr ? parseInt(fromStr, 10) : NaN;
            const targetEl = e.target instanceof Element ? e.target : null;
            const targetThumb = targetEl ? targetEl.closest('.page-thumb') : null;
            const to = targetThumb ? parseInt(targetThumb.getAttribute('data-index') || '0', 10) : NaN;
            if (Number.isNaN(from) || Number.isNaN(to) || from === to) return;
            const a = appState.storyData[sectionKey];
            if (!Array.isArray(a)) return;
            const [moved] = a.splice(from, 1);
            a.splice(to, 0, moved);
            appState.pageSelection[sectionKey] = to;
            renderSectionPages(sectionKey, editorId, thumbsId);
            saveState();
            if (appState.currentStep === totalSteps) {
                generatePreview(appState.storyData);
            }
        });

        // Editor de página seleccionada
        editor.innerHTML = '';
        if (!arr[selected]) return;
        const page = arr[selected];
                const uniqueId = `${sectionKey}-page-${selected}`;
                const wrapper = document.createElement('div');
        wrapper.className = 'writing-page dynamic';
                        wrapper.innerHTML = `
                                <div class="writing-row">
                                        <div class="writing-area">
                                            <div class="form-group" style="flex-grow:1; display:flex; flex-direction:column;">
                                                <div class="writing-tools">
                                                    <label for="${uniqueId}">Escribe aquí...</label>
                                                    <button class="tool-btn idea-btn" data-target="${uniqueId}" title="Dame una idea"><i data-lucide="lightbulb"></i></button>
                                                </div>
                                                <div id="editor-${uniqueId}" class="rich-editor"></div>
                                                <div class="writing-challenge" data-target="${uniqueId}"></div>
                                            </div>
                                        </div>
                                        <div class="illustration-area">
                                            <div class="illustration-preview" id="${sectionKey}-preview-${selected}">${page.imageUrl ? `<img src="${page.imageUrl}"/>` : ''}</div>
                                        </div>
                                </div>
                        `;
        editor.appendChild(wrapper);

        // Bind idea and illustrate for this page
        const ideaBtn = wrapper.querySelector('.idea-btn');
        if (ideaBtn) {
            ideaBtn.addEventListener('click', () => getWritingIdea(uniqueId));
        }
        // Initialize Quill editor and sync content/state
        const editorEl = wrapper.querySelector(`#editor-${uniqueId}`);
        if (editorEl) {
            const q = new Quill(editorEl, {
                theme: 'snow',
                placeholder: 'Escribe aquí...',
                modules: {
                    toolbar: [
                        [{ header: [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['link', 'clean']
                    ]
                }
            });
            quillEditors[uniqueId] = q;
            // Set initial content (supports plain text or HTML)
            if (page.text) {
                // Heurística simple: si contiene etiquetas HTML, insertar como HTML, si no, como texto
                const looksHTML = /<[^>]+>/g.test(page.text);
                if (looksHTML) {
                    q.root.innerHTML = page.text;
                } else {
                    q.setText(page.text);
                }
            }
            q.on('text-change', () => {
                const content = q.root.innerHTML;
                const arrRef = appState.storyData[sectionKey];
                if (Array.isArray(arrRef) && arrRef[selected]) {
                    arrRef[selected].text = content;
                    saveState();
                    if (appState.currentStep === totalSteps) {
                        generatePreview(appState.storyData);
                    }
                }
            });
        }
    // Ilustrar ahora se gestiona desde la barra inferior
    lucide.createIcons();
    // Asegurar que la barra inferior refleje la página seleccionada
    updateNavButtons();
    };

    const renderAvatar = () => {
        const preview = document.getElementById('avatar-preview');
        if (!preview) return;
        const char = appState.storyData.characters[appState.editingCharIndex];
        if (!char) {
            preview.innerHTML = '';
            return;
        }
    if (char.avatar.builderMode !== 'ai') char.avatar.builderMode = 'ai';
    if (char.avatar.aiAvatarUrl) {
            const d = char.details || {};
            const line2 = [d.species, d.age].filter(Boolean).join(' · ');
            const caption = `<div style="margin-top:8px; font-size:12px; color:#4a5568; text-align:center;">
                <strong>${char.name || 'Personaje'}</strong>${line2 ? `<br/>${line2}` : ''}
            </div>`;
            preview.innerHTML = `<img src="${char.avatar.aiAvatarUrl}" alt="Avatar generado por IA" />${caption}`;
            return;
        }
    preview.innerHTML = `<div style="color:#a0aec0; text-align:center;">Crea el personaje con IA para ver su imagen aquí</div>`;
    };

    const switchBuilderMode = (mode) => {
        const char = appState.storyData.characters[appState.editingCharIndex];
        if (!char) return;
    // Forzar siempre modo IA
    if (!char) return;
    char.avatar.builderMode = 'ai';
    if (aiBuilder) aiBuilder.style.display = 'block';
    renderAvatar();
    saveState();
    };

    const updateSelectedButtons = () => {
        const char = appState.storyData.characters[appState.editingCharIndex];
        if (!char) return;
    // No hay opciones manuales que marcar
    };

    const switchCharacterTab = (index) => {
        if (index < 0 || index >= appState.storyData.characters.length) return;
        appState.editingCharIndex = index;
        const char = appState.storyData.characters[index];
        if (!char) return;
        if (charNameInput) charNameInput.value = char.name;
        switchBuilderMode('ai');
        renderCharacterTabs();
        renderAvatar();
        // Prefill role and details fields
        const d = char.details || {};
        if (charRoleSelect) charRoleSelect.value = char.type || 'protagonist';
        if (charSpecies) charSpecies.value = d.species || '';
        if (charAge) charAge.value = d.age || '';
        if (charPersonality) charPersonality.value = d.personality || '';
        if (charLikes) charLikes.value = d.likes || '';
        if (charStrengths) charStrengths.value = d.strengths || '';
        if (charWeaknesses) charWeaknesses.value = d.weaknesses || '';
        if (charGoal) charGoal.value = d.goal || '';
        if (charBackstory) charBackstory.value = d.backstory || '';
        if (charStyle) charStyle.value = d.style || '';
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
    }

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
    }

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

    window.switchView = switchView;

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

    window.showStep = showStep;

    const updateNavButtons = () => {
        const nav = document.querySelector('.navigation');
        if (nav && prevBtn && nextBtn) {
            prevBtn.disabled = appState.currentStep === 1;
            nav.style.display = appState.currentStep === totalSteps ? 'none' : 'flex';
            nextBtn.innerHTML =
                appState.currentStep === totalSteps - 1
                    ? '¡Ver mi cuento! <i data-lucide="book-open-check"></i>'
                    : 'Siguiente <i data-lucide="arrow-right"></i>';
            // Render nav-level page controls between Prev/Next for steps 4–6
            const navPC = document.getElementById('nav-page-controls');
            if (navPC) {
                if ([4, 5, 6].includes(appState.currentStep)) {
                    const sectionKey = appState.currentStep === 4 ? 'introduction' : appState.currentStep === 5 ? 'development' : 'conclusion';
                    const arr = Array.isArray(appState.storyData[sectionKey]) ? appState.storyData[sectionKey] : [];
                    const selected = appState.pageSelection?.[sectionKey] ?? 0;
                    navPC.innerHTML = `
                        <button class="btn-compact nav-page-illustrate" title="Ilustrar escena" style="background-color: var(--ai-color);"><i data-lucide="image-plus"></i></button>
                        <button class="btn-compact nav-page-move-up" ${selected === 0 ? 'disabled' : ''} title="Mover arriba"><i data-lucide="arrow-up"></i></button>
                        <button class="btn-compact nav-page-move-down" ${selected >= arr.length - 1 ? 'disabled' : ''} title="Mover abajo"><i data-lucide="arrow-down"></i></button>
                        <button class="btn-compact nav-page-duplicate" title="Duplicar página"><i data-lucide="copy"></i></button>
                        <button class="btn-compact nav-page-delete" ${arr.length <= 1 ? 'disabled' : ''} title="Eliminar página"><i data-lucide="trash-2"></i></button>
                    `;
                    navPC.style.display = 'inline-flex';
                    // Bind handlers using same logic as editor controls
                    const illustrate = navPC.querySelector('.nav-page-illustrate');
                    const moveUp = navPC.querySelector('.nav-page-move-up');
                    const moveDown = navPC.querySelector('.nav-page-move-down');
                    const duplicate = navPC.querySelector('.nav-page-duplicate');
                    const del = navPC.querySelector('.nav-page-delete');
                    illustrate?.addEventListener('click', () => {
                        currentPageToIllustrate = { section: sectionKey, index: selected };
                        const promptEl = document.getElementById('ai-scene-prompt');
                        if (promptEl) promptEl.value = '';
                        populateSceneCharacters();
                        aiSceneModal?.classList.add('visible');
                    });
                    const rerender = () => {
                        const edId = sectionKey === 'introduction' ? 'intro-editor' : sectionKey === 'development' ? 'dev-editor' : 'end-editor';
                        const thId = sectionKey === 'introduction' ? 'intro-thumbs' : sectionKey === 'development' ? 'dev-thumbs' : 'end-thumbs';
                        renderSectionPages(sectionKey, edId, thId);
                        updateNavButtons();
                        saveState();
                        if (appState.currentStep === totalSteps) {
                            generatePreview(appState.storyData);
                        }
                    };
                    moveUp?.addEventListener('click', () => {
                        if (selected <= 0) return;
                        const a = appState.storyData[sectionKey];
                        const tmp = a[selected - 1];
                        a[selected - 1] = a[selected];
                        a[selected] = tmp;
                        appState.pageSelection[sectionKey] = selected - 1;
                        rerender();
                    });
                    moveDown?.addEventListener('click', () => {
                        const a = appState.storyData[sectionKey];
                        if (selected >= a.length - 1) return;
                        const tmp = a[selected + 1];
                        a[selected + 1] = a[selected];
                        a[selected] = tmp;
                        appState.pageSelection[sectionKey] = selected + 1;
                        rerender();
                    });
                    duplicate?.addEventListener('click', () => {
                        const a = appState.storyData[sectionKey];
                        if (!Array.isArray(a)) return;
                        const src = a[selected] || { text: '', imageUrl: null, charactersIncluded: [] };
                        const copy = {
                            text: src.text || '',
                            imageUrl: src.imageUrl || null,
                            charactersIncluded: Array.isArray(src.charactersIncluded) ? [...src.charactersIncluded] : []
                        };
                        a.splice(selected + 1, 0, copy);
                        appState.pageSelection[sectionKey] = selected + 1;
                        rerender();
                    });
                    del?.addEventListener('click', () => {
                        const a = appState.storyData[sectionKey];
                        if (!Array.isArray(a) || a.length <= 1) return;
                        if (!window.confirm('¿Seguro que quieres eliminar esta página?')) return;
                        a.splice(selected, 1);
                        const newIdx = Math.max(0, Math.min(selected, a.length - 1));
                        appState.pageSelection[sectionKey] = newIdx;
                        rerender();
                    });
                } else {
                    navPC.innerHTML = '';
                    navPC.style.display = 'none';
                }
            }
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
                if (char) {
                    if (charNameInput) char.name = charNameInput.value;
                    if (charRoleSelect) char.type = charRoleSelect.value || 'protagonist';
                    char.details = char.details || {};
                    char.details.species = charSpecies?.value || '';
                    char.details.age = charAge?.value || '';
                    char.details.personality = charPersonality?.value || '';
                    char.details.likes = charLikes?.value || '';
                    char.details.strengths = charStrengths?.value || '';
                    char.details.weaknesses = charWeaknesses?.value || '';
                    char.details.goal = charGoal?.value || '';
                    char.details.backstory = charBackstory?.value || '';
                    char.details.style = charStyle?.value || '';
                }
                break;
            }
            case 3: {
                const selectedScenarioCard = document.querySelector('#scenario-selector .selected');
                if (selectedScenarioCard) {
                    const el = selectedScenarioCard;
                    if (el.id === 'ai-scenario-card') {
                        // Escenario guardado vía IA en otro flujo
                    } else {
                        data.scenario = { builderMode: 'manual', description: el.dataset.value };
                    }
                }
                break;
            }
            case 4: {
                // En modo dinámico (intro-editor presente), ya guardamos texto por Quill; no sobrescribir arrays
                if (!document.getElementById('intro-editor')) {
                    // Fallback legado
                    const introPages = document.querySelectorAll('.plot-start-page');
                    if (introPages.length > 0) {
                        data.introduction = Array.from(introPages).map((el, idx) => ({
                            text: el.value || '',
                            imageUrl: (Array.isArray(data.introduction) ? data.introduction[idx]?.imageUrl : data.introduction?.imageUrl) || null
                        }));
                    } else {
                        const el = document.getElementById('plot-start');
                        const prev = data.introduction;
                        data.introduction = {
                            text: el?.value || '',
                            imageUrl: (Array.isArray(prev) ? prev[0]?.imageUrl : prev?.imageUrl) || null
                        };
                    }
                }
                break;
            }
            case 5: {
                if (!document.getElementById('dev-editor')) {
                    const devPages = document.querySelectorAll('.plot-middle-page');
                    if (devPages.length > 0) {
                        data.development = Array.from(devPages).map((el, idx) => ({
                            text: el.value || '',
                            imageUrl: (Array.isArray(data.development) ? data.development[idx]?.imageUrl : data.development?.imageUrl) || null
                        }));
                    } else {
                        const el = document.getElementById('plot-middle');
                        const prev = data.development;
                        data.development = {
                            text: el?.value || '',
                            imageUrl: (Array.isArray(prev) ? prev[0]?.imageUrl : prev?.imageUrl) || null
                        };
                    }
                }
                break;
            }
            case 6: {
                if (!document.getElementById('end-editor')) {
                    const endPages = document.querySelectorAll('.plot-end-page');
                    if (endPages.length > 0) {
                        data.conclusion = Array.from(endPages).map((el, idx) => ({
                            text: el.value || '',
                            imageUrl: (Array.isArray(data.conclusion) ? data.conclusion[idx]?.imageUrl : data.conclusion?.imageUrl) || null
                        }));
                    } else {
                        const el = document.getElementById('plot-end');
                        const prev = data.conclusion;
                        data.conclusion = {
                            text: el?.value || '',
                            imageUrl: (Array.isArray(prev) ? prev[0]?.imageUrl : prev?.imageUrl) || null
                        };
                    }
                }
                break;
            }
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
        const introData = Array.isArray(data.introduction)
            ? (data.introduction[0] || { text: '', imageUrl: null })
            : (data.introduction || { text: '', imageUrl: null });
        const devData = Array.isArray(data.development)
            ? (data.development[0] || { text: '', imageUrl: null })
            : (data.development || { text: '', imageUrl: null });
        const endData = Array.isArray(data.conclusion)
            ? (data.conclusion[0] || { text: '', imageUrl: null })
            : (data.conclusion || { text: '', imageUrl: null });
        if (start) start.value = introData.text || '';
        if (middle) middle.value = devData.text || '';
        if (end) end.value = endData.text || '';

        const introPreview = document.getElementById('preview-intro');
        if (introPreview)
            introPreview.innerHTML = introData.imageUrl ? `<img src="${introData.imageUrl}">` : '';
        const devPreview = document.getElementById('preview-dev');
        if (devPreview)
            devPreview.innerHTML = devData.imageUrl ? `<img src="${devData.imageUrl}">` : '';
        const endPreview = document.getElementById('preview-end');
        if (endPreview)
            endPreview.innerHTML = endData.imageUrl ? `<img src="${endData.imageUrl}">` : '';

    const title = document.getElementById('story-title');
        const author = document.getElementById('author-name');
        if (title) title.value = data.title || '';
        if (author) author.value = data.author || '';
    const showNum = document.getElementById('show-page-numbers');
    if (showNum) showNum.checked = !!appState.previewOptions?.showPageNumbers;

        // Render dinámico si existen los contenedores
        if (document.getElementById('intro-editor')) {
            if (!Array.isArray(data.introduction) || data.introduction.length === 0) data.introduction = [{ text: '', imageUrl: null }];
            if (!Array.isArray(data.development) || data.development.length === 0) data.development = [{ text: '', imageUrl: null }];
            if (!Array.isArray(data.conclusion) || data.conclusion.length === 0) data.conclusion = [{ text: '', imageUrl: null }];
            if (!data.cover) data.cover = { imageUrl: null, prompt: '' };

            renderSectionPages('introduction', 'intro-editor', 'intro-thumbs');
            renderSectionPages('development', 'dev-editor', 'dev-thumbs');
            renderSectionPages('conclusion', 'end-editor', 'end-thumbs');

            const coverPrev = document.getElementById('cover-preview');
            if (coverPrev) coverPrev.innerHTML = data.cover?.imageUrl ? `<img src="${data.cover.imageUrl}" alt="Portada"/>` : '';
        }

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
    let content = '';
        if (story.cover?.imageUrl) {
            content += `<div class="preview-cover"><div class="cover-image"><img src="${story.cover.imageUrl}"></div><div class="cover-text"><h1>${story.title || ''}</h1><p>${story.author ? `por ${story.author}` : ''}</p></div></div>`;
        } else {
            content += `<p>Esta es la historia de ${charactersIntro} en ${scenarioIntro}.</p>`;
        }
        const buildPages = (section) => {
            const val = story[section];
            const pages = Array.isArray(val) ? val : (val ? [val] : []);
            return pages
        .map((p, idx) => {
            const numberBadge = appState.previewOptions?.showPageNumbers ? `<div class="page-badge">${idx + 1}</div>` : '';
            let block = `<div class="preview-page">${numberBadge}`;
                    if (p?.imageUrl)
                        block += `<div class="preview-page-image"><img src="${p.imageUrl}"></div>`;
                    if (p?.text)
                        block += `<div class="preview-page-text">${p.text}</div>`;
                    block += `</div>`;
                    return block;
                })
                .join('');
        };
        content += buildPages('introduction');
        content += buildPages('development');
        content += buildPages('conclusion');
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
            introduction: [{ text: '', imageUrl: null }],
            development: [{ text: '', imageUrl: null }],
            conclusion: [{ text: '', imageUrl: null }]
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
    charRoleSelect?.addEventListener('change', saveData);
    [charSpecies, charAge, charPersonality, charLikes, charStrengths, charWeaknesses, charGoal, charBackstory, charStyle]
        .forEach((el) => el?.addEventListener('input', saveData));
    // Ya no hay opciones manuales ni conmutador de modo

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

    document.getElementById('open-ai-assistant-btn')?.addEventListener('click', () => {
        // Prefill modal from current ficha
        const char = appState.storyData.characters[appState.editingCharIndex] || {};
        const d = char.details || {};
        const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
        setVal('ai-char-type', d.species || '');
        setVal('ai-char-age', d.age || '');
        setVal('ai-char-personality', d.personality || '');
        setVal('ai-char-likes', d.likes || '');
        setVal('ai-char-strengths', d.strengths || '');
        setVal('ai-char-weaknesses', d.weaknesses || '');
        setVal('ai-char-goal', d.goal || '');
        const bs = document.getElementById('ai-char-backstory'); if (bs) bs.value = d.backstory || '';
        setVal('ai-char-style', d.style || '');
        // No hay campos de rol en el modal; el rol se edita en la ficha
        aiCharacterModal?.classList.add('visible');
    });
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
            populateSceneCharacters();
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

    // Nuevos handlers para páginas dinámicas y portada
    const addPage = (sectionKey) => {
        if (!appState.storyData) appState.storyData = {};
        if (!appState.storyData[sectionKey] || !Array.isArray(appState.storyData[sectionKey])) {
            appState.storyData[sectionKey] = [];
        }
        if (!appState.pageSelection) appState.pageSelection = { introduction: 0, development: 0, conclusion: 0 };
    appState.storyData[sectionKey].push({ text: '', imageUrl: null, charactersIncluded: [] });
        appState.pageSelection[sectionKey] = appState.storyData[sectionKey].length - 1;
        if (sectionKey === 'introduction') renderSectionPages('introduction', 'intro-editor', 'intro-thumbs');
        if (sectionKey === 'development') renderSectionPages('development', 'dev-editor', 'dev-thumbs');
        if (sectionKey === 'conclusion') renderSectionPages('conclusion', 'end-editor', 'end-thumbs');
        saveState();
    };

    document.getElementById('add-intro-page-btn')?.addEventListener('click', () => addPage('introduction'));
    document.getElementById('add-dev-page-btn')?.addEventListener('click', () => addPage('development'));
    document.getElementById('add-end-page-btn')?.addEventListener('click', () => addPage('conclusion'));

    // Toggle mostrar numeración en preview final
    document.getElementById('show-page-numbers')?.addEventListener('change', (e) => {
        appState.previewOptions = appState.previewOptions || { showPageNumbers: false };
        appState.previewOptions.showPageNumbers = !!e.target.checked;
        saveState();
        if (appState.currentStep === totalSteps) {
            generatePreview(appState.storyData);
        }
    });

    // Delegate input save for dynamic page textareas
    document.addEventListener('input', (e) => {
        const ta = e.target;
        if (ta && ta.classList && ta.classList.contains('page-text')) {
            const sectionKey = ta.getAttribute('data-section');
            const index = parseInt(ta.getAttribute('data-index')) || 0;
            const arr = appState.storyData[sectionKey];
            if (Array.isArray(arr) && arr[index]) {
                arr[index].text = ta.value || '';
                saveState();
            }
        }
    });

    // Generar portada con IA
    document.getElementById('generate-cover-btn')?.addEventListener('click', async () => {
        const prompt = document.getElementById('cover-prompt')?.value?.trim() || '';
        const prev = document.getElementById('cover-preview');
        if (prev) prev.innerHTML = '<div class="loader"></div>';
        if (!prompt) {
            if (prev) prev.innerHTML = '<small>Escribe una descripción para la portada.</small>';
            return;
        }
        const imageUrl = await generateImage(prompt, 'cover');
        if (imageUrl) {
            appState.storyData.cover = { imageUrl, prompt };
            populateForm();
            saveData();
            if (appState.currentStep === totalSteps) {
                generatePreview(appState.storyData);
            }
        } else if (prev) {
            prev.innerHTML = '<small>No se pudo generar la portada en este entorno.</small>';
        }
    });

    // Live preview on title/author edits while on final step
    document.getElementById('story-title')?.addEventListener('input', (e) => {
        const val = e.target?.value || '';
        appState.storyData.title = val;
        saveState();
        if (appState.currentStep === totalSteps) generatePreview(appState.storyData);
    });
    document.getElementById('author-name')?.addEventListener('input', (e) => {
        const val = e.target?.value || '';
        appState.storyData.author = val;
        saveState();
        if (appState.currentStep === totalSteps) generatePreview(appState.storyData);
    });

    // Inicialización
    loadState();
    createOptionButtons();

    switchView(appState.currentView);
});
