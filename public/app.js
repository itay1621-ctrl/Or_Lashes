document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const uploadContent = document.getElementById('uploadContent');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const loadingState = document.getElementById('loadingState');
    const resultSection = document.getElementById('resultSection');
    const tabBtns = document.querySelectorAll('.tab-btn');

    let currentMode = 'eye';
    let selectedFile = null;

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
            
            // Reset state if we switch modes
            if (resultSection) {
                resultSection.classList.add('hidden');
                resultSection.innerHTML = '';
            }
        });
    });

    // Upload area click
    uploadArea.addEventListener('click', (e) => {
        if (e.target === removeBtn || removeBtn.contains(e.target)) return;
        imageInput.click();
    });

    // Handle file selection
    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop support
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#fcf6f5';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.backgroundColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.backgroundColor = '';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('אנא העלה קובץ תמונה בלבד.');
            return;
        }

        selectedFile = file;
        const reader = new FileReader();
        
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            uploadContent.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
            resultSection.classList.add('hidden');
        };
        
        reader.readAsDataURL(file);
    }

    // Remove image
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFile = null;
        imageInput.value = '';
        imagePreview.src = '';
        uploadContent.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        analyzeBtn.disabled = true;
        resultSection.classList.add('hidden');
    });

    // Analyze button
    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        // UI Update
        analyzeBtn.disabled = true;
        loadingState.classList.remove('hidden');
        resultSection.classList.add('hidden');
        
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('mode', currentMode);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'שגיאה בניתוח התמונה');
            }

            renderResults(data);
            
        } catch (error) {
            console.error('Error:', error);
            renderError(error.message);
        } finally {
            loadingState.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    });

    function renderResults(data) {
        resultSection.classList.remove('hidden');
        let html = '<div class="result-card">';
        
        if (currentMode === 'eye' && data.type === 'eye_analysis' && data.data) {
            const d = data.data;
            html += `
                <h3 class="result-title"><i class="fa-solid fa-clipboard-check"></i> תוצאות אבחון עין</h3>
                
                <div class="data-group">
                    <h4><i class="fa-solid fa-star"></i> המלצה מקצועית</h4>
                    <div class="data-item">
                        <span class="data-label">סוג שתל מומלץ:</span>
                        <span class="data-value">${d.recommendation.shield_type || 'לא זוהה'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">מידה:</span>
                        <span class="data-value">${d.recommendation.shield_size || 'לא זוהה'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">הסבר והחלטה:</span>
                        <span class="data-value">${d.recommendation.reasoning || 'אין הסבר'}</span>
                    </div>
                </div>

                <div class="data-group">
                    <h4><i class="fa-solid fa-eye"></i> נתוני הלקוחה שזוהו</h4>
                    <div class="data-item">
                        <span class="data-label">מבנה עפעף:</span>
                        <span class="data-value">${d.eye_analysis.eyelid_structure || 'לא זוהה'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">כיוון צמיחה:</span>
                        <span class="data-value">${d.eye_analysis.growth_direction || 'לא זוהה'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">אורך ריס:</span>
                        <span class="data-value">${d.eye_analysis.lash_length || 'לא זוהה'}</span>
                    </div>
                </div>
                
                <div class="data-group">
                    <h4><i class="fa-regular fa-clock"></i> הערות תהליך</h4>
                    <div class="data-item">
                        <span class="data-value">${d.processing_notes || 'אין הערות נוספות.'}</span>
                    </div>
                </div>
            `;
        } else if (currentMode === 'shield' && data.type === 'shield_identification' && data.data) {
            const d = data.data;
            html += `
                <h3 class="result-title"><i class="fa-solid fa-magnifying-glass"></i> זיהוי שתל סיליקון</h3>
                
                <div class="data-group">
                    <h4><i class="fa-solid fa-tag"></i> זיהוי השתל</h4>
                    <div class="data-item">
                        <span class="data-label">סוג שתל שזוהה:</span>
                        <span class="data-value">${d.shield_identification.identified_type || 'לא זוהה'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">סימנים ויזואליים:</span>
                        <span class="data-value">${d.shield_identification.visual_clues || 'לא זוהה'}</span>
                    </div>
                </div>

                <div class="data-group">
                    <h4><i class="fa-solid fa-bullseye"></i> התאמה מומלצת</h4>
                    <div class="data-item">
                        <span class="data-label">אידיאלי למבנה עין:</span>
                        <span class="data-value">${d.suitability.best_for_eyes || 'לא צוין'}</span>
                    </div>
                    <div class="data-item">
                        <span class="data-label">אידיאלי לסוג ריס:</span>
                        <span class="data-value">${d.suitability.best_for_lashes || 'לא צוין'}</span>
                    </div>
                </div>
            `;
        } else {
             html += `
                <div class="data-group" style="background-color: #fee; border-color: #fcc;">
                    <h4 style="color: #d32f2f;"><i class="fa-solid fa-triangle-exclamation"></i> שגיאה בפענוח</h4>
                    <p style="color: #d32f2f;">ה-AI לא החזיר את התשובה בפורמט התקין. אנא נסי שוב.</p>
                </div>
            `;
        }
        
        html += '</div>';
        resultSection.innerHTML = html;
        
        // Scroll to results
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderError(message) {
        resultSection.classList.remove('hidden');
        resultSection.innerHTML = `
            <div class="result-card">
                <div class="data-group" style="background-color: #fee; border-color: #fcc;">
                    <h4 style="color: #d32f2f;"><i class="fa-solid fa-triangle-exclamation"></i> שגיאה</h4>
                    <p style="color: #d32f2f;">${message}</p>
                </div>
            </div>
        `;
    }
});
