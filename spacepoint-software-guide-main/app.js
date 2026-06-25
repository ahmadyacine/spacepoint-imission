/**
 * SpacePoint Software Guide Platform
 * app.js - Core Logic
 * 
 * Note: Data is now loaded from:
 * - js/init.js
 * - js/practice.js
 * - js/data/*.js
 */

const App = {
    state: {
        currentRoute: '/',
        categories: [], // Will be populated from window.spacePointData
        settings: JSON.parse(localStorage.getItem('spacePointSettings')) || {}
    },

    async init() {
        // Unified Access Check
        try {
            const res = await fetch('/api/page-access/check/software-guide');
            const data = await res.json();
            if (!data.is_unlocked) {
                window.location.href = '/?error=access_denied';
                return;
            }
        } catch (e) {
            console.warn("Unified access check failed, assuming local dev or missing API.");
        }

        // Load data from global scope (populated by separate files)
        if (window.spacePointData) {
            this.state.categories = window.spacePointData.categories;
        } else {
            console.error("Critical: spacePointData not found!");
        }

        if (!this.checkOnboarding()) return; // Stop if onboarding needed

        this.updateSidebar();
        this.handleRoute();
        window.addEventListener('hashchange', () => this.handleRoute());
        this.updateGlobalProgress();
    },

    // ============================================
    // ROUTING & NAVIGATION
    // ============================================

    handleRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const parts = hash.split('/').filter(Boolean);
        
        // Router Logic
        const contentArea = document.getElementById('content-area');
        const breadcrumbs = document.getElementById('breadcrumbs');
        
        // simple scroll to top
        window.scrollTo(0, 0);

        if (parts.length === 0) {
            this.renderHome(contentArea);
            breadcrumbs.innerHTML = `<span>Home</span>`;
        } 
        else if (parts[0] === 'category') {
            const catId = parts[1];
            const category = this.state.categories.find(c => c.id === catId);
            
            if (parts.length === 2 && category) {
                this.renderCategory(contentArea, category);
                breadcrumbs.innerHTML = `
                    <a href="#/" class="hover:text-purple-400">Home</a> 
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    <span>${category.title}</span>`;
            } 
            else if (parts.length === 4 && parts[2] === 'lesson' && category) {
                const lessonId = parts[3];
                const lesson = category.lessons.find(l => l.id === lessonId);
                if (lesson) {
                    this.renderLesson(contentArea, category, lesson);
                    breadcrumbs.innerHTML = `
                        <a href="#/" class="hover:text-purple-400">Home</a> 
                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        <a href="#/category/${catId}" class="hover:text-purple-400">${category.title}</a>
                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        <span>${lesson.title}</span>`;
                }
            }
        }

        // Re-init icons after render
        this.updateSidebar();
        lucide.createIcons();
    },

    updateSidebar() {
        const nav = document.getElementById('sidebar-nav');
        if(!nav) return;

        nav.innerHTML = this.state.categories.map(cat => {
            // calculate progress per category
            const total = cat.lessons.length;
            const completed = cat.lessons.filter(l => this.isLessonComplete(l.id)).length;
            const percent = (completed / total) * 100;

            return `
            <a href="#/category/${cat.id}" class="block group">
                <div class="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors ${window.location.hash.includes(cat.id) ? 'bg-white/10 border-r-2 border-purple-500' : ''}">
                    <div class="p-2 rounded-md bg-gradient-to-br ${cat.color} opacity-80 group-hover:opacity-100">
                        <i data-lucide="${cat.icon}" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-200 group-hover:text-white">${cat.title}</h4>
                        <div class="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden w-24">
                            <div class="bg-purple-500 h-full" style="width: ${percent}%"></div>
                        </div>
                    </div>
                </div>
            </a>
            `;
        }).join('');
    },

    // ============================================
    // VIEWS
    // ============================================

    renderHome(container) {
        container.innerHTML = `
            <header class="mb-12 text-center animate-in fade-in">
                <h1 class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-4">
                    SpacePoint Software Guide
                </h1>
                <p class="text-gray-400 max-w-2xl mx-auto text-lg">
                    Master the ESP32, CDHS, and ADCS systems for your satellite mission.
                </p>
                <div class="mt-8 flex justify-center gap-4 text-sm text-gray-500">
                    <span class="flex items-center gap-1"><i data-lucide="clock" class="w-4 h-4"></i> ~8 Hours Total</span>
                    <span class="flex items-center gap-1"><i data-lucide="award" class="w-4 h-4"></i> 4 Certifications</span>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${this.state.categories.map(cat => this.createCategoryCard(cat)).join('')}
            </div>
        `;
    },

    createCategoryCard(cat) {
        const total = cat.lessons.length;
        const completed = cat.lessons.filter(l => this.isLessonComplete(l.id)).length;
        const percent = Math.round((completed / total) * 100);

        return `
        <a href="#/category/${cat.id}" class="glass p-6 rounded-2xl hover:bg-white/5 transition-all transform hover:-translate-y-1 border border-purple-500/20 group animate-in slide-in-from-bottom-4">
            <div class="flex justify-between items-start mb-4">
                <div class="p-3 rounded-xl bg-gradient-to-br ${cat.color} shadow-lg shadow-purple-900/40">
                    <i data-lucide="${cat.icon}" class="w-8 h-8 text-white"></i>
                </div>
                <span class="text-xs font-bold px-2 py-1 rounded bg-black/40 text-gray-400 border border-white/10">
                    ${cat.timeEstimate}
                </span>
            </div>
            
            <h2 class="text-2xl font-bold mb-2 group-hover:text-purple-300 transition-colors">${cat.title}</h2>
            <p class="text-gray-400 text-sm mb-6 line-clamp-2">${cat.description}</p>
            
            <div class="flex items-center justify-between text-sm">
                <span class="text-gray-500">${completed}/${total} Lessons</span>
                <span class="text-purple-400 font-bold">${percent}%</span>
            </div>
            <div class="w-full bg-gray-800 h-2 mt-2 rounded-full overflow-hidden">
                <div class="progress-bar h-full transition-all duration-1000" style="width: ${percent}%"></div>
            </div>
        </a>
        `;
    },

    renderCategory(container, category) {
        container.innerHTML = `
            <div class="mb-8 animate-in fade-in">
                <h1 class="text-3xl font-bold bg-gradient-to-r ${category.color} bg-clip-text text-transparent mb-2">${category.title}</h1>
                <p class="text-gray-300">${category.description}</p>
            </div>

            <div class="grid gap-4">
                ${category.lessons.map(lesson => {
                    const isCompleted = this.isLessonComplete(lesson.id);
                    return `
                    <a href="#/category/${category.id}/lesson/${lesson.id}" 
                       class="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all group">
                        <div class="w-10 h-10 rounded-full flex items-center justify-center 
                            ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-black/40 text-gray-500'}">
                            <i data-lucide="${isCompleted ? 'check' : 'play'}" class="w-5 h-5"></i>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-bold group-hover:text-purple-300">${lesson.title}</h3>
                            <span class="text-xs text-gray-500">${lesson.time}</span>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 text-gray-600 group-hover:text-white"></i>
                    </a>
                    `;
                }).join('')}
            </div>
        `;
    },

    renderLesson(container, category, lesson) {
        const isCompleted = this.isLessonComplete(lesson.id);
        const attempts = this.getAttempts(lesson.id);
        
        // Track that user visited this lesson
        if(!this.getLessonProgress(lesson.id)) {
            this.updateLessonProgress(lesson.id, 'started');
        }

        // Get resources from global object
        const resources = window.spacePointData.resources[lesson.id] || [];
        const resourcesHtml = resources.map(r => `
            <a href="${r.url}" target="_blank" class="block p-3 rounded bg-black/40 hover:bg-purple-900/20 border border-transparent hover:border-purple-500/30 transition-all">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-bold text-pink-400 uppercase">${r.type}</span>
                    <i data-lucide="external-link" class="w-3 h-3 text-gray-500"></i>
                </div>
                <h4 class="font-bold text-sm text-gray-200">${r.title}</h4>
                <p class="text-xs text-gray-500 mt-1">${r.desc}</p>
            </a>
        `).join('');

        // Find practice data if it exists
        const practiceData = window.practiceTemplates ? window.practiceTemplates[lesson.practiceType] : null;

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in">
                <!-- Main Content (Left Col) -->
                <div class="lg:col-span-2 space-y-8">
                    <header>
                        <h1 class="text-3xl font-bold bg-gradient-to-r ${category.color} bg-clip-text text-transparent mb-2">${lesson.title}</h1>
                        <div class="flex items-center gap-4 text-sm text-gray-400">
                             <span class="flex items-center gap-1"><i data-lucide="clock" class="w-4 h-4"></i> ${lesson.time}</span>
                             ${lesson.hasPractice ? '<span class="flex items-center gap-1 text-purple-400"><i data-lucide="code" class="w-4 h-4"></i> Coding Exercise</span>' : ''}
                        </div>
                    </header>
                    
                    <div class="prose prose-invert prose-purple max-w-none text-gray-300 leading-relaxed">
                        ${lesson.content || '<p>Content coming soon...</p>'}
                    </div>

                    ${lesson.hasPractice ? this.renderPracticeWidget(lesson.id, practiceData, attempts, isCompleted) : ''}
                    
                    <!-- Navigation Buttons -->
                    ${(() => {
                        const practiceCompleted = !lesson.hasPractice || localStorage.getItem(`sp_practice_completed_${lesson.id}`) === 'true';
                        const isLocked = !isCompleted && !practiceCompleted;
                        
                        return `
                        <button onclick="App.markComplete('${lesson.id}')" 
                                ${isLocked ? 'disabled' : ''}
                                class="w-full py-4 mt-8 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                                ${isCompleted 
                                    ? 'bg-green-600/20 text-green-400 border border-green-500/50 cursor-default' 
                                    : isLocked
                                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/40'}">
                            ${isCompleted 
                                ? '<i data-lucide="check"></i> Completed' 
                                : isLocked
                                    ? '<i data-lucide="lock"></i> Complete Quiz to Unlock'
                                    : 'Mark as Complete'}
                        </button>
                        `;
                    })()}

                    ${isCompleted ? (() => {
                        const currentIndex = category.lessons.findIndex(l => l.id === lesson.id);
                        const nextLesson = category.lessons[currentIndex + 1];
                        if (nextLesson) {
                            return `
                                <a href="#/category/${category.id}/lesson/${nextLesson.id}" 
                                   class="block w-full text-center py-4 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold shadow-xl shadow-purple-900/40 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-4">
                                    Next Lesson: ${nextLesson.title} <i data-lucide="arrow-right"></i>
                                </a>
                            `;
                        } else {
                             return `
                                <a href="#/category/${category.id}" 
                                   class="block w-full text-center py-4 mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                                    Back to ${category.title} <i data-lucide="list"></i>
                                </a>
                            `;
                        }
                    })() : ''}
                </div>
                
                <!-- Sidebar (Right Col) -->
                <div class="space-y-6">
                    <!-- Library Resources (Conditional) -->
                    ${(attempts >= 3 || isCompleted) ? `
                    <div class="glass p-5 rounded-xl border border-purple-500/20 animate-in fade-in slide-in-from-right-4">
                        <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
                            <i data-lucide="library" class="w-4 h-4 text-purple-400"></i> Library
                        </h3>
                        <div class="space-y-3">
                            ${resourcesHtml || '<p class="text-sm text-gray-500 italic">No specific external resources for this lesson.</p>'}
                        </div>
                    </div>
                    ` : `
                    <div class="glass p-5 rounded-xl border border-white/5 opacity-50">
                        <h3 class="font-bold text-lg mb-2 flex items-center gap-2 text-gray-400">
                            <i data-lucide="lock" class="w-4 h-4"></i> Library Locked
                        </h3>
                        <p class="text-xs text-gray-500">Resources unlock if you get stuck (3 attempts).</p>
                    </div>
                    `}

                    <!-- Progress Card -->
                    <div class="glass p-5 rounded-xl border border-purple-500/20 text-center">
                         <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black/30 mb-3 border ${isCompleted ? 'border-green-500' : 'border-gray-600'}">
                            <i data-lucide="${isCompleted ? 'check' : 'target'}" class="w-8 h-8 ${isCompleted ? 'text-green-500' : 'text-gray-500'}"></i>
                         </div>
                         <h3 class="font-bold">${isCompleted ? 'Lesson Complete!' : 'In Progress'}</h3>
                         <p class="text-xs text-gray-400 mt-1">Keep up the momentum.</p>
                    </div>
                    <div class="mt-8 pt-4 border-t border-purple-500/20">
                        <a href="https://gemini.google.com/gem/1Dg1zYUXIEqhK_kNsciCDQz2bYkleyUdW?usp=sharing" target="_blank" 
                           class="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-200 hover:from-blue-600/40 hover:to-purple-600/40 transition-all border border-blue-500/30 hover:border-blue-400 group">
                            <i data-lucide="sparkles" class="w-5 h-5 text-blue-400 group-hover:text-white transition-colors"></i>
                            <span class="font-bold text-sm">Ask SpacePoint AI</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    renderPracticeWidget(lessonId, template, attempts, isComplete) {
        if (!template) return '';
        
        // Locked state logic (simple implementation)
        const isLocked = attempts >= 3 && !isComplete;
        
        // Address selector
        let addressSelector = '';
        if (template.hasAddressSelector) {
            const savedAddr = this.state.settings[`${lessonId}_addr`] || template.defaultAddress;
            addressSelector = `
                <div class="mb-4 p-3 bg-black/40 rounded border border-purple-500/30">
                    <label class="block text-xs font-bold text-purple-300 mb-2 uppercase">Select Hardware Address:</label>
                    <select id="addr-select-${lessonId}" onchange="App.updateAddress('${lessonId}', this.value)" class="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600">
                        ${template.addresses.map(a => `<option value="${a}" ${a === savedAddr ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                    <p class="text-xs text-gray-500 mt-2">Check your sensor wiring. Common default is ${template.defaultAddress}.</p>
                </div>
            `;
        }

        // Context for answers
        const context = {
            address: this.state.settings[`${lessonId}_addr`] || template.defaultAddress
        };

        // Generate Code Template with Inputs
        let codeHtml = template.template.trim();
        // Replace regex placeholders {{KEY}} with input fields
        codeHtml = codeHtml.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
             // Auto-fill logic
             let value = '';
             let styleClass = '';
             
             if (attempts >= 3 && template.correctAnswers && template.correctAnswers[match]) {
                 const ans = template.correctAnswers[match];
                 value = typeof ans === 'function' ? ans(context) : ans;
                 styleClass = 'border-green-500 text-green-400'; // Show as valid
             }
            
            return `<input type="text" data-key="{{${key}}}" value="${value}" class="code-input text-sm w-32 ${styleClass}" placeholder="...">`;
        });

        return `
            <div class="mt-8 border border-purple-500/40 rounded-xl overflow-hidden bg-[#1e1e1e]">
                <div class="bg-purple-900/20 p-4 border-b border-purple-500/20 flex justify-between items-center">
                    <h3 class="font-bold flex items-center gap-2">
                        <i data-lucide="code" class="w-5 h-5 text-purple-400"></i> Code Practice
                    </h3>
                    <div class="text-xs bg-black/40 px-3 py-1 rounded-full text-gray-400">
                        Attempts: <span id="attempts-count">${attempts}</span>/3
                    </div>
                </div>
                
                <div class="p-6">
                    <p class="text-sm text-gray-400 mb-4">${template.instructions}</p>
                    
                    ${addressSelector}

                    <div class="relative group">
                         <div class="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded opacity-25 group-hover:opacity-10 transition duration-1000 group-hover:duration-200"></div>
                         <pre class="relative font-mono text-sm bg-black/80 p-4 rounded-lg overflow-x-auto text-gray-300 shadow-2xl">${codeHtml}</pre>
                    </div>

                     ${isLocked 
                        ? `<div class="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded text-yellow-200 text-sm animate-in fade-in">
                                <p class="font-bold mb-1"><i data-lucide="unlock"></i> Practice Unlocked</p>
                                <p>You've reached 3 attempts. The correct answers have been filled in for you. Review the code and try to understand it!</p>
                                <p class="mt-2 text-xs text-gray-300">Resources are now unlocked in the sidebar &rarr;</p>
                                <button onclick="App.checkPractice('${lessonId}')" class="mt-3 bg-yellow-600/80 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded text-xs">Verify & Complete</button>
                           </div>`
                        : `<button onclick="App.checkPractice('${lessonId}')" class="mt-6 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg hover:shadow-purple-500/50 flex items-center gap-2">
                                <i data-lucide="play" class="w-4 h-4"></i> Run Code
                           </button>`
                    }

                    <div id="practice-feedback" class="mt-4 hidden"></div>
                </div>
            </div>
        `;
    },

    // ============================================
    // LOGIC & STATE
    // ============================================

    updateAddress(lessonId, addr) {
        this.state.settings[`${lessonId}_addr`] = addr;
        localStorage.setItem('spacePointSettings', JSON.stringify(this.state.settings));
        
        // Handle current logic details
        const currentLesson = this.state.categories.flatMap(c => c.lessons).find(l => l.id === lessonId);
        const currentCat = this.state.categories.find(c => c.lessons.some(l => l.id === lessonId));
        if(currentLesson) {
            this.renderLesson(document.getElementById('content-area'), currentCat, currentLesson);
        }
    },

    checkPractice(lessonId) {
        // 1. SELECT INPUTS FIRST (Before touching DOM)
        const inputs = document.querySelectorAll('.code-input');
        const feedback = document.getElementById('practice-feedback');
        
        // 2. Increment attempts
        let attempts = this.getAttempts(lessonId) + 1;
        localStorage.setItem(`sp_attempts_${lessonId}`, attempts);
        
        // Update attempts UI directly without re-rendering everything (preserves inputs)
        const attemptsEl = document.getElementById('attempts-count');
        if(attemptsEl) attemptsEl.textContent = attempts;

        // 3. Validate
        const currentLesson = this.state.categories.flatMap(c => c.lessons).find(l => l.id === lessonId);
        const practiceData = window.practiceTemplates[currentLesson.practiceType];
        
        let allCorrect = true;
        
        inputs.forEach(input => {
            const key = input.dataset.key;
            const userVal = input.value;
            const validator = practiceData.answers[key];
            const context = {
                address: this.state.settings[`${lessonId}_addr`] || practiceData.defaultAddress
            };

            if (validator && validator(userVal, context)) {
                input.classList.add('border-green-500', 'text-green-400');
                input.classList.remove('border-red-500');
            } else {
                input.classList.add('border-red-500');
                input.classList.remove('border-green-500');
                allCorrect = false;
            }
        });

        // 4. Force re-render ONLY if we hit the attempt limit (to show unlocked state)
        // AND we are not already correct.
        if (attempts >= 3 && !allCorrect) {
             const currentCat = this.state.categories.find(c => c.lessons.some(l => l.id === lessonId));
             this.renderLesson(document.getElementById('content-area'), currentCat, currentLesson);
             return; // Stop here, user gets the "Unlocked" view
        }

        feedback.classList.remove('hidden');
        
        if (allCorrect) {
            // Save practice completion state
            localStorage.setItem(`sp_practice_completed_${lessonId}`, 'true');
            
            feedback.innerHTML = `
                <div class="p-3 bg-green-900/30 border border-green-500/50 rounded text-green-300 flex items-center gap-2">
                    <i data-lucide="check-circle" class="w-5 h-5"></i>
                    <div>
                        <strong>Success!</strong> Code logic is correct.
                        <p class="text-xs opacity-80 mt-1">Lesson unlocked! You can now mark it as complete.</p>
                    </div>
                </div>
            `;
            
            // Re-render to unlock the button (delayed slightly for UX)
            setTimeout(() => {
                const currentCat = this.state.categories.find(c => c.lessons.some(l => l.id === lessonId));
                this.renderLesson(document.getElementById('content-area'), currentCat, currentLesson);
            }, 1000);
            
        } else {
             // Show hints if available
            const hint = practiceData.hints ? practiceData.hints[Math.floor(Math.random() * practiceData.hints.length)] : "Check your syntax.";
            
            feedback.innerHTML = `
                <div class="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 flex items-center gap-2">
                    <i data-lucide="alert-circle" class="w-5 h-5"></i>
                    <div>
                        <strong>Keep trying!</strong> ${hint}
                        ${attempts >= 3 ? '<p class="text-xs mt-1 text-yellow-200">Tip: Refreshing the page will now auto-fill the answer.</p>' : ''}
                    </div>
                </div>
            `;
        }
    },

    markComplete(lessonId) {
        this.updateLessonProgress(lessonId, 'completed');
        this.handleRoute(); // Re-render to show update
    },

    // Progress Helpers
    isLessonComplete(id) {
        return this.getLessonProgress(id) === 'completed';
    },

    getLessonProgress(id) {
        return localStorage.getItem(`sp_progress_${id}`);
    },

    updateLessonProgress(id, status) {
        localStorage.setItem(`sp_progress_${id}`, status);
        this.updateGlobalProgress();
    },

    getAttempts(id) {
        return parseInt(localStorage.getItem(`sp_attempts_${id}`) || '0');
    },

    updateGlobalProgress() {
        // can be used to unlock other features
    },

    // ============================================
    // ONBOARDING
    // ============================================

    checkOnboarding() {
        const user = localStorage.getItem('spacePointUser');
        if (!user) {
            this.renderOnboardingModal();
            return false;
        }
        return true;
    },

    renderOnboardingModal() {
        const modalHtml = `
            <div id="onboarding-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                <div class="bg-[#2B0A3D] border border-purple-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                    <!-- Background decoration -->
                    <div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    
                    <div class="relative z-10 text-center">
                        <div class="inline-flex p-3 rounded-full bg-purple-500/20 text-purple-300 mb-4">
                            <i data-lucide="rocket" class="w-8 h-8"></i>
                        </div>
                        <h2 class="text-2xl font-bold text-white mb-2">Welcome to SpacePoint!</h2>
                        <p class="text-gray-400 text-sm mb-6">Let's set up your profile to personalize your learning experience.</p>
                        
                        <form onsubmit="event.preventDefault(); App.saveOnboarding(this);" class="space-y-4 text-left">
                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Your Name</label>
                                <input type="text" name="name" required class="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none placeholder-gray-600" placeholder="Astronaut Name">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Age</label>
                                <input type="number" name="age" required min="5" max="99" class="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none placeholder-gray-600" placeholder="Years">
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-gray-400 uppercase mb-3">I am a...</label>
                                <div class="grid grid-cols-2 gap-4">
                                    <label class="cursor-pointer group">
                                        <input type="radio" name="type" value="school" required class="peer hidden">
                                        <div class="h-full p-4 rounded-xl border border-purple-500/20 bg-black/20 peer-checked:bg-purple-600 peer-checked:border-purple-500 transition-all hover:bg-white/5 flex flex-col items-center gap-2">
                                            <i data-lucide="backpack" class="w-6 h-6 text-gray-400 group-hover:text-white peer-checked:text-white"></i>
                                            <span class="text-xs font-bold text-gray-300 peer-checked:text-white">School Student</span>
                                        </div>
                                    </label>

                                    <label class="cursor-pointer group">
                                        <input type="radio" name="type" value="uni" required class="peer hidden">
                                        <div class="h-full p-4 rounded-xl border border-purple-500/20 bg-black/20 peer-checked:bg-purple-600 peer-checked:border-purple-500 transition-all hover:bg-white/5 flex flex-col items-center gap-2">
                                            <i data-lucide="graduation-cap" class="w-6 h-6 text-gray-400 group-hover:text-white peer-checked:text-white"></i>
                                            <span class="text-xs font-bold text-gray-300 peer-checked:text-white">Uni Student</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" class="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg shadow-lg shadow-purple-900/50 hover:from-purple-500 hover:to-pink-500 transition-all mt-4 transform hover:scale-[1.02]">
                                Start Mission 🚀
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        lucide.createIcons();
    },

    saveOnboarding(form) {
        const formData = new FormData(form);
        const userData = {
            name: formData.get('name'),
            age: formData.get('age'),
            type: formData.get('type'),
            joined: new Date().toISOString()
        };

        localStorage.setItem('spacePointUser', JSON.stringify(userData));
        
        // Reload to apply content filtering based on user type
        window.location.reload();
    }

};

window.App = App; // Make accessible to inline onclick handlers
App.init();
