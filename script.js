// ======================== State Management ========================

window.plans = [];
window.currentPlanId = null;
window.currentPlan = null;
window.newSegments = [];
window.editingBlockIndex = null;
window.currentSegmentId = null;
window.confettiActive = false;
window.lastSaveTime = null;
window.autoSaveInterval = null;
window.folders = ['Allgemein', 'Mathematik', 'Deutsch', 'Englisch', 'Naturwissenschaften', 'Geschichte'];
window.currentFolder = 'Allgemein';

// ======================== Initialization ========================

window.init = function() {
  loadPlans();
  setupNavigation();
  renderDashboard();
  setupEventListeners();
  renderLastSaveTime();
  setupFolders();
}

window.setupEventListeners = function() {
  const topic = document.getElementById('kiTopic');
  const level = document.getElementById('kiLevel');
  const units = document.getElementById('kiUnits');
  
  if (topic) topic.addEventListener('input', generateKIPrompt);
  if (level) level.addEventListener('change', generateKIPrompt);
  if (units) units.addEventListener('change', generateKIPrompt);
  
  // Folder select event
  const folderSelect = document.getElementById('folderSelect');
  if (folderSelect) {
    folderSelect.addEventListener('change', function() {
      window.currentFolder = this.value;
      renderDashboard();
    });
  }
}

window.setupFolders = function() {
  const folderSelect = document.getElementById('folderSelect');
  const planFolder = document.getElementById('planFolder');
  
  if (!folderSelect || !planFolder) return;
  
  // Load saved folders from localStorage
  const savedFolders = localStorage.getItem('lernplan_folders');
  if (savedFolders) {
    window.folders = JSON.parse(savedFolders);
  }
  
  // Clear and repopulate
  folderSelect.innerHTML = '<option value="Alle">Alle Ordner</option>';
  planFolder.innerHTML = '';
  
  window.folders.forEach(folder => {
    folderSelect.innerHTML += `<option value="${folder}">${folder}</option>`;
    planFolder.innerHTML += `<option value="${folder}">${folder}</option>`;
  });
  
  if (window.currentFolder) {
    folderSelect.value = window.currentFolder;
    planFolder.value = window.currentFolder;
  }
}

// ======================== Navigation ========================

window.setupNavigation = function() {
  // Simple navigation setup
  console.log('Navigation setup');
}

window.showPage = function(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  const pageElement = document.getElementById(pageId);
  if (pageElement) {
    pageElement.classList.add('active');
  }
}

window.goToDashboard = function() {
  window.showPage('dashboard-page');
  window.renderDashboard();
}

window.goToEditor = function() {
  window.currentPlanId = null;
  window.currentPlan = null;
  window.newSegments = [];
  window.editingBlockIndex = null;
  window.currentSegmentId = null;
  
  const planTitle = document.getElementById('planTitle');
  const planDescription = document.getElementById('planDescription');
  const planSubject = document.getElementById('planSubject');
  const planDeadline = document.getElementById('planDeadline');
  const planFolder = document.getElementById('planFolder');
  const editorTitle = document.getElementById('editorTitle');
  const editorSubtitle = document.getElementById('editorSubtitle');
  const contentBlocks = document.getElementById('segmentsContainer');
  
  if (planTitle) planTitle.value = '';
  if (planDescription) planDescription.value = '';
  if (planSubject) planSubject.value = '';
  if (planDeadline) planDeadline.value = '';
  if (planFolder) planFolder.value = window.currentFolder;
  if (editorTitle) editorTitle.textContent = 'Neuer Lernplan';
  if (editorSubtitle) editorSubtitle.textContent = 'Erstelle einen strukturierten Lernplan';
  if (contentBlocks) contentBlocks.innerHTML = '';
  
  window.showPage('editor-page');
}

// ======================== Dashboard ========================

window.renderDashboard = function() {
  const container = document.getElementById('plansContainer');
  const emptyState = document.getElementById('emptyState');
  
  if (!container || !emptyState) return;
  
  // Filter plans by current folder
  const filteredPlans = window.currentFolder === 'Alle' 
    ? window.plans 
    : window.plans.filter(plan => plan.folder === window.currentFolder);
  
  if (filteredPlans.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  
  let html = '';

// Show filtered plans
html = filteredPlans.map(plan => {
  const { total, completed } = calculatePlanProgress(plan);
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const deadline = new Date(plan.deadline);
  const today = new Date();
  const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  const overdue = daysLeft < 0;

  return `
    <div class="plan-card">
      <div class="plan-header">
        <div>
          <span class="plan-folder">${plan.folder || 'Allgemein'}</span>
          <h3 class="plan-title">${escapeHtml(plan.title)}</h3>
          <p class="plan-subject">${escapeHtml(plan.subject)}</p>
        </div>
      </div>

      <p class="plan-description">${escapeHtml(plan.description)}</p>

      <div class="plan-meta">
        <span>📚 ${plan.segments?.length || 0} Themen</span>
        <span>✅ ${completed}/${total} Aufgaben</span>
        <span>📅 ${overdue ? 'Überfällig' : `${daysLeft} Tage`}</span>
      </div>

      <div class="plan-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <span>${progress}%</span>
      </div>

      <div class="plan-actions">
        <button class="btn btn-primary" onclick="window.goToLearning('${plan.id}')">
          ${completed > 0 ? 'Weiter lernen →' : 'Start'}
        </button>

        <div>
          <button class="btn btn-icon" onclick="window.editPlan('${plan.id}')" title="Bearbeiten">✏️</button>
          <button class="btn btn-icon" onclick="window.duplicatePlan('${plan.id}')" title="Duplizieren">📋</button>
          <button class="btn btn-icon" onclick="window.deletePlan('${plan.id}')" title="Löschen">🗑️</button>
        </div>
      </div>
    </div>
  `;
}).join('');

container.innerHTML = html;
}

window.calculatePlanProgress = function(plan) {
  let total = 0;
  let completed = 0;
  
  if (!plan || !plan.segments) return { total, completed };
  
  plan.segments.forEach(segment => {
    if (!segment.blocks) return;
    const segmentTasks = segment.blocks.filter(block => block.type === 'task');
    total += segmentTasks.length;
    completed += segmentTasks.filter(task => task.completed).length;
  });
  
  return { total, completed };
}

window.duplicatePlan = function(planId) {
  const originalPlan = window.plans.find(p => p.id === planId);
  if (!originalPlan) return;
  
  const duplicatedPlan = {
    ...JSON.parse(JSON.stringify(originalPlan)),
    id: Date.now().toString(),
    title: `${originalPlan.title} (Kopie)`,
    createdAt: new Date().toISOString()
  };
  
  window.plans.push(duplicatedPlan);
  window.savePlans();
  window.renderDashboard();
  window.showNotification('Lernplan dupliziert', 'success');
}

window.editPlan = function(planId) {
  const plan = window.plans.find(p => p.id === planId);
  if (!plan) return;
  
  window.currentPlanId = planId;
  window.currentPlan = plan;
  window.newSegments = JSON.parse(JSON.stringify(plan.segments || []));
  
  // Fill form with plan data
  const planTitle = document.getElementById('planTitle');
  const planDescription = document.getElementById('planDescription');
  const planSubject = document.getElementById('planSubject');
  const planDeadline = document.getElementById('planDeadline');
  const planFolder = document.getElementById('planFolder');
  const editorTitle = document.getElementById('editorTitle');
  const editorSubtitle = document.getElementById('editorSubtitle');
  
  if (planTitle) planTitle.value = plan.title;
  if (planDescription) planDescription.value = plan.description;
  if (planSubject) planSubject.value = plan.subject;
  if (planDeadline) planDeadline.value = plan.deadline;
  if (planFolder) planFolder.value = plan.folder || window.currentFolder;
  if (editorTitle) editorTitle.textContent = 'Lernplan bearbeiten';
  if (editorSubtitle) editorSubtitle.textContent = `Bearbeite: ${plan.title}`;
  
  // Render segments
  renderSegments();
  
  window.showPage('editor-page');
}

window.deletePlan = function(planId) {
  if (!confirm('Möchtest du diesen Lernplan wirklich löschen?')) return;
  
  window.plans = window.plans.filter(p => p.id !== planId);
  window.savePlans();
  window.renderDashboard();
  window.showNotification('Lernplan gelöscht', 'success');
}

window.goToLearning = function(planId) {
  const plan = window.plans.find(p => p.id === planId);
  if (!plan) return;
  
  window.currentPlanId = planId;
  window.currentPlan = plan;
  
  // Update UI
  const learningTitle = document.getElementById('learningTitle');
  const learningSubject = document.getElementById('learningSubject');
  
  if (learningTitle) learningTitle.textContent = plan.title;
  if (learningSubject) learningSubject.textContent = `${plan.subject} • ${plan.folder || 'Allgemein'}`;
  
  // Render learning content
  renderLearningContent();
  
  window.showPage('learning-page');
}

// ======================== Folder Management ========================

window.showFolderManager = function() {
  const modal = document.getElementById('folderModal');
  if (!modal) return;
  
  const folderList = document.getElementById('folderList');
  if (folderList) {
    folderList.innerHTML = window.folders.map(folder => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
        <span>${folder}</span>
        ${folder !== 'Allgemein' ? `
          <button class="btn btn-icon" onclick="window.removeFolder('${folder}')">🗑️</button>
        ` : ''}
      </div>
    `).join('');
  }
  
  modal.classList.add('active');
}

window.closeFolderModal = function() {
  const modal = document.getElementById('folderModal');
  if (modal) modal.classList.remove('active');
}

window.addNewFolder = function() {
  const input = document.getElementById('newFolderName');
  if (!input || !input.value.trim()) {
    window.showNotification('Bitte gib einen Ordnernamen ein', 'error');
    return;
  }
  
  const newFolder = input.value.trim();
  if (window.folders.includes(newFolder)) {
    window.showNotification('Dieser Ordner existiert bereits', 'error');
    return;
  }
  
  window.folders.push(newFolder);
  localStorage.setItem('lernplan_folders', JSON.stringify(window.folders));
  window.setupFolders();
  input.value = '';
  window.showFolderManager();
  window.showNotification('Ordner hinzugefügt', 'success');
}

window.removeFolder = function(folderName) {
  if (folderName === 'Allgemein') return;
  
  if (!confirm(`Möchtest du den Ordner "${folderName}" wirklich löschen? Alle darin enthaltenen Pläne werden in den Ordner "Allgemein" verschoben.`)) return;
  
  // Move all plans from this folder to "Allgemein"
  window.plans.forEach(plan => {
    if (plan.folder === folderName) {
      plan.folder = 'Allgemein';
    }
  });
  
  // Remove folder from list
  window.folders = window.folders.filter(f => f !== folderName);
  localStorage.setItem('lernplan_folders', JSON.stringify(window.folders));
  window.savePlans();
  window.setupFolders();
  window.renderDashboard();
  window.showFolderManager();
  window.showNotification('Ordner gelöscht', 'success');
}

// ======================== Import/Export ========================

window.showImportZone = function() {
  const modal = document.getElementById('importModal');
  if (modal) {
    modal.classList.add('active');
  }
}

window.closeImportModal = function() {
  const modal = document.getElementById('importModal');
  if (modal) modal.classList.remove('active');
}

window.handleFileSelect = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      const importedData = JSON.parse(content);
      
      let importedPlans = [];
      
      if (Array.isArray(importedData)) {
        importedPlans = importedData;
      } else if (importedData.plans && Array.isArray(importedData.plans)) {
        importedPlans = importedData.plans;
      } else if (importedData.title) {
        importedPlans = [importedData];
      } else {
        throw new Error('Ungültiges Dateiformat');
      }
      
      importedPlans.forEach(importedPlan => {
        const newPlan = {
          id: Date.now().toString(),
          title: importedPlan.title || 'Importierter Plan',
          description: importedPlan.description || '',
          subject: importedPlan.subject || '',
          deadline: importedPlan.deadline || new Date().toISOString().split('T')[0],
          folder: importedPlan.folder || 'Allgemein',
          segments: importedPlan.segments || [],
          createdAt: new Date().toISOString()
        };
        
        window.plans.push(newPlan);
      });
      
      window.savePlans();
      window.createBackup();
      window.closeImportModal();
      window.goToDashboard();
      
      window.showNotification(`${importedPlans.length} Lernplan${importedPlans.length > 1 ? 'e' : ''} importiert!`, 'success');
    } catch (error) {
      const importError = document.getElementById('importError');
      if (importError) {
        importError.style.display = 'block';
        importError.textContent = 'Fehler: ' + error.message;
      }
    }
  };
  reader.readAsText(file);
}

window.exportBackup = function() {
  const backupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    plans: window.plans,
    folders: window.folders
  };
  
  const dataStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lernplan_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  window.showNotification('Backup erstellt und heruntergeladen', 'success');
}

// ======================== KI Assistant ========================

window.showKIPrompt = function() {
  window.generateKIPrompt();
  const kiModal = document.getElementById('kiModal');
  if (kiModal) kiModal.classList.add('active');
}

window.closeKIModal = function() {
  const kiModal = document.getElementById('kiModal');
  if (kiModal) kiModal.classList.remove('active');
}

window.copyPrompt = function() {
  const prompt = document.getElementById('kiPrompt');
  if (!prompt) return;
  
  prompt.select();
  document.execCommand('copy');
  
  window.showNotification('Prompt kopiert!', 'success');
}

window.generateKIPrompt = function() {
  const topic = document.getElementById('kiTopic');
  const level = document.getElementById('kiLevel');
  const units = document.getElementById('kiUnits');
  
  if (!topic || !level || !units) return;
  
  const topicValue = topic.value || 'Mathematik - Analytische Geometrie';
  const levelValue = level.value;
  const unitsValue = units.value;
  
  const levelMap = {
    'beginner': 'Anfänger (einfache Konzepte, viel Erklärung)',
    'intermediate': 'Mittelstufe (Standard-Curriculum, ausgeglichene Mischung)',
    'advanced': 'Fortgeschritten (komplexe Themen, anspruchsvolle Aufgaben)'
  };
  
  const prompt = `Erstelle einen detaillierten Lernplan im JSON-Format für: ${topicValue}, Schwierigkeit: ${levelMap[levelValue]}, Einheiten: ${unitsValue}

Struktur und strikte Regeln:

ALLGEMEINE REGELN
- Gib AUSSCHLIESSLICH valides JSON aus (kein Text davor oder danach).
- Verwende doppelte Anführungszeichen.
- Keine Kommentare.
- Keine Duplikate von Plans.
- Jede ID muss eindeutig sein.
- ISO-8601 für Zeitstempel.
- Boolean-Werte nur true / false.
- Felder dürfen nicht weggelassen werden.

ROOT-STRUKTUR
{
  "version": "string",
  "timestamp": "ISO-8601",
  "plans": [ Plan ],
  "folders": [ string ]
}

PLAN
- id: string (timestamp-basiert oder UUID)
- title: string
- description: string
- subject: string
- deadline: YYYY-MM-DD
- folder: string
- segments: [ Segment ]
- createdAt: ISO-8601

SEGMENT
- title: string
- description: string
- color: HEX-Farbcode
- blocks: [ Block ]

BLOCK (Task)
- type: "task"
- title: string
- description: string
- taskType: "theory" | "exercise" | "reflection"
- completed: boolean

BLOCK (Resource)
- type: "resource"
- title: string
- description: string
- url: string
- iframe: string (optional, gültiges HTML-iframe)
- completed: boolean

INHALTLICHE ANFORDERUNGEN
- Erstelle EINEN vollständigen Lernplan.
-Segmente mit aufsteigender Schwierigkeit.
- Mischung aus Theorie-, Übungs- und Reflexionsaufgaben.
- Mindestens ein Resource-Block mit YouTube-Link.
- Fachlich passend zum angegebenen Thema.



AUSGABE:
- Nur das finale JSON.
- Vollständig, korrekt, importierbar.
  `;
  
  const kiPrompt = document.getElementById('kiPrompt');
  if (kiPrompt) kiPrompt.value = prompt;
}

// ======================== Editor Functions ========================

window.renderSegments = function() {
  const container = document.getElementById('segmentsContainer');
  if (!container) return;
  
  if (!window.newSegments || window.newSegments.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📚</div>
        <h3>Noch keine Themengebiete</h3>
        <p>Füge Themengebiete hinzu, um deinen Lernplan zu strukturieren.</p>
        <button class="btn btn-primary mt-4" onclick="window.addSegment()">
          Erstes Themengebiet hinzufügen
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = window.newSegments.map((segment, segmentIndex) => {
    const color = segment.color || getRandomColor();
    return `
      <div class="card mb-4">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
            <h3 style="margin: 0;">${escapeHtml(segment.title)}</h3>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn-icon" onclick="window.editSegment(${segmentIndex})" title="Bearbeiten">✏️</button>
            <button class="btn btn-icon" onclick="window.deleteSegment(${segmentIndex})" title="Löschen">🗑️</button>
          </div>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">${escapeHtml(segment.description)}</p>
        
        <div id="segmentBlocks-${segmentIndex}">
          ${renderSegmentBlocks(segment.blocks || [], segmentIndex)}
        </div>
        
        <button class="btn btn-outline mt-3" onclick="window.addBlock(${segmentIndex})">
          ➕ Block hinzufügen
        </button>
      </div>
    `;
  }).join('');
}

window.renderSegmentBlocks = function(blocks, segmentIndex) {
  if (!blocks || blocks.length === 0) {
    return '<p style="color: var(--text-tertiary); font-style: italic;">Noch keine Blöcke hinzugefügt</p>';
  }
  
return blocks.map(function(block, blockIndex) {
  switch(block.type) {
    case 'video':
      return '<div class="block-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">' +
          '<div>' +
            '<span style="font-weight: 500;">🎥 ' + escapeHtml(block.title) + '</span>' +
            '<p style="color: var(--text-secondary); margin-top: 0.25rem; font-size: 0.875rem;">' + escapeHtml(block.description) + '</p>' +
          '</div>' +
          '<div style="display: flex; gap: 0.5rem;">' +
            '<button class="btn btn-icon" onclick="window.editBlock(' + segmentIndex + ', ' + blockIndex + ')">✏️</button>' +
            '<button class="btn btn-icon" onclick="window.deleteBlock(' + segmentIndex + ', ' + blockIndex + ')">🗑️</button>' +
          '</div>' +
        '</div>' +
        '<div class="video-preview">' +
          '<iframe width="100%" height="200" src="https://www.youtube.com/embed/' + block.videoId + '" frameborder="0" allowfullscreen></iframe>' +
        '</div>' +
      '</div>';
      
    case 'task':
      return '<div class="block-item" style="margin-bottom: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">' +
        '<div style="display: flex; justify-content: space-between; align-items: flex-start;">' +
          '<div>' +
            '<span style="font-weight: 500;">📝 ' + escapeHtml(block.title) + '</span>' +
            '<p style="color: var(--text-secondary); margin-top: 0.25rem; font-size: 0.875rem;">' + escapeHtml(block.description) + '</p>' +
            (block.completed ? '<span style="display: inline-block; padding: 0.25rem 0.5rem; background: var(--secondary-light); color: var(--secondary); border-radius: 4px; font-size: 0.75rem; margin-top: 0.5rem;">Erledigt</span>' : '') +
          '</div>' +
          '<div style="display: flex; gap: 0.5rem;">' +
            '<button class="btn btn-icon" onclick="window.editBlock(' + segmentIndex + ', ' + blockIndex + ')">✏️</button>' +
            '<button class="btn btn-icon" onclick="window.deleteBlock(' + segmentIndex + ', ' + blockIndex + ')">🗑️</button>' +
          '</div>' +
        '</div>' +
      '</div>';
      
    default:
      return '';
  }
}).join('');
}

window.addSegment = function() {
  window.newSegments = window.newSegments || [];
  window.newSegments.push({
    title: 'Neues Themengebiet',
    description: 'Beschreibung hier einfügen',
    color: getRandomColor(),
    blocks: []
  });
  renderSegments();
}

window.editSegment = function(segmentIndex) {
  const segment = window.newSegments[segmentIndex];
  if (!segment) return;
  
  window.currentSegmentId = segmentIndex;
  
  const segmentTitle = document.getElementById('segmentTitle');
  const segmentDescription = document.getElementById('segmentDescription');
  const segmentColor = document.getElementById('segmentColor');
  
  if (segmentTitle) segmentTitle.value = segment.title;
  if (segmentDescription) segmentDescription.value = segment.description;
  if (segmentColor) segmentColor.value = segment.color || getRandomColor();
  
  const modal = document.getElementById('segmentModal');
  if (modal) modal.classList.add('active');
}

window.saveSegment = function() {
  if (window.currentSegmentId === null) return;
  
  const segmentTitle = document.getElementById('segmentTitle');
  const segmentDescription = document.getElementById('segmentDescription');
  const segmentColor = document.getElementById('segmentColor');
  
  if (!segmentTitle || !segmentTitle.value.trim()) {
    window.showNotification('Bitte gib einen Titel ein', 'error');
    return;
  }
  
  window.newSegments[window.currentSegmentId] = {
    ...window.newSegments[window.currentSegmentId],
    title: segmentTitle.value,
    description: segmentDescription.value,
    color: segmentColor.value
  };
  
  window.closeSegmentModal();
  renderSegments();
  window.showNotification('Themengebiet gespeichert', 'success');
}

window.deleteSegment = function(segmentIndex) {
  if (!confirm('Möchtest du dieses Themengebiet wirklich löschen?')) return;
  
  window.newSegments.splice(segmentIndex, 1);
  renderSegments();
  window.showNotification('Themengebiet gelöscht', 'success');
}

window.addBlock = function(segmentIndex) {
  window.editingBlockIndex = null;
  window.currentSegmentId = segmentIndex;
  
  const modal = document.getElementById('blockModal');
  const modalTitle = document.getElementById('blockModalTitle');
  const form = document.getElementById('blockModalForm');
  
  if (modalTitle) modalTitle.textContent = 'Block hinzufügen';
  if (form) {
    form.innerHTML = `
      <div class="form-group">
        <label class="form-label">Typ</label>
        <select id="blockType" class="form-select" onchange="window.changeBlockType()">
          <option value="video">🎥 Video</option>
          <option value="task">📝 Aufgabe</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Titel *</label>
        <input type="text" id="blockTitle" class="form-input" placeholder="Titel eingeben">
      </div>
      <div class="form-group">
        <label class="form-label">Beschreibung</label>
        <textarea id="blockDescription" class="form-textarea" rows="3" placeholder="Beschreibung..."></textarea>
      </div>
      <div id="blockExtraFields"></div>
    `;
  }
  
  window.changeBlockType();
  
  if (modal) modal.classList.add('active');
}

window.changeBlockType = function() {
  const typeSelect = document.getElementById('blockType');
  const extraFields = document.getElementById('blockExtraFields');
  
  if (!typeSelect || !extraFields) return;
  
  const type = typeSelect.value;
  
  if (type === 'video') {
    extraFields.innerHTML = `
      <div class="form-group">
        <label class="form-label">YouTube Video ID *</label>
        <input type="text" id="blockVideoId" class="form-input" placeholder="z.B. dQw4w9WgXcQ">
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-top: 0.25rem;">
          Die ID ist der Teil der YouTube-URL nach "v=". Beispiel: https://www.youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>
        </p>
      </div>
    `;
  } else if (type === 'task') {
    extraFields.innerHTML = `
      <div class="form-group">
        <label class="form-label">Aufgabentyp</label>
        <select id="blockTaskType" class="form-select">
          <option value="exercise">Übung</option>
          <option value="quiz">Quiz</option>
          <option value="project">Projekt</option>
          <option value="exam">Klausurvorbereitung</option>
        </select>
      </div>
      <div class="form-group">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="checkbox" id="blockCompleted">
          <label for="blockCompleted" style="margin: 0;">Aufgabe erledigt</label>
        </div>
      </div>
    `;
  }
}

window.saveBlock = function() {
  if (window.currentSegmentId === null) return;
  
  const type = document.getElementById('blockType').value;
  const title = document.getElementById('blockTitle').value;
  const description = document.getElementById('blockDescription').value;
  
  if (!title.trim()) {
    window.showNotification('Bitte gib einen Titel ein', 'error');
    return;
  }
  
  const newBlock = {
    type: type,
    title: title,
    description: description
  };
  
  if (type === 'video') {
    const videoId = document.getElementById('blockVideoId').value;
    if (!videoId.trim()) {
      window.showNotification('Bitte gib eine YouTube Video ID ein', 'error');
      return;
    }
    newBlock.videoId = videoId;
  } else if (type === 'task') {
    const taskType = document.getElementById('blockTaskType').value;
    const completed = document.getElementById('blockCompleted').checked;
    newBlock.taskType = taskType;
    newBlock.completed = completed;
  }
  
  if (window.editingBlockIndex !== null) {
    // Update existing block
    window.newSegments[window.currentSegmentId].blocks[window.editingBlockIndex] = newBlock;
  } else {
    // Add new block
    window.newSegments[window.currentSegmentId].blocks = window.newSegments[window.currentSegmentId].blocks || [];
    window.newSegments[window.currentSegmentId].blocks.push(newBlock);
  }
  
  window.closeBlockModal();
  renderSegments();
  window.showNotification('Block gespeichert', 'success');
}

window.editBlock = function(segmentIndex, blockIndex) {
  const segment = window.newSegments[segmentIndex];
  if (!segment || !segment.blocks || !segment.blocks[blockIndex]) return;
  
  window.currentSegmentId = segmentIndex;
  window.editingBlockIndex = blockIndex;
  const block = segment.blocks[blockIndex];
  
  const modal = document.getElementById('blockModal');
  const modalTitle = document.getElementById('blockModalTitle');
  const form = document.getElementById('blockModalForm');
  
  if (modalTitle) modalTitle.textContent = 'Block bearbeiten';
  if (form) {
    form.innerHTML = `
      <div class="form-group">
        <label class="form-label">Typ</label>
        <select id="blockType" class="form-select" onchange="window.changeBlockType()">
          <option value="video" ${block.type === 'video' ? 'selected' : ''}>🎥 Video</option>
          <option value="task" ${block.type === 'task' ? 'selected' : ''}>📝 Aufgabe</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Titel *</label>
        <input type="text" id="blockTitle" class="form-input" placeholder="Titel eingeben" value="${escapeHtml(block.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">Beschreibung</label>
        <textarea id="blockDescription" class="form-textarea" rows="3" placeholder="Beschreibung...">${escapeHtml(block.description || '')}</textarea>
      </div>
      <div id="blockExtraFields"></div>
    `;
  }
  
  window.changeBlockType();
  
  // Fill extra fields
  setTimeout(() => {
    if (block.type === 'video') {
      document.getElementById('blockVideoId').value = block.videoId || '';
    } else if (block.type === 'task') {
      if (document.getElementById('blockTaskType')) {
        document.getElementById('blockTaskType').value = block.taskType || 'exercise';
      }
      if (document.getElementById('blockCompleted')) {
        document.getElementById('blockCompleted').checked = block.completed || false;
      }
    }
  }, 10);
  
  if (modal) modal.classList.add('active');
}

window.deleteBlock = function(segmentIndex, blockIndex) {
  if (!confirm('Möchtest du diesen Block wirklich löschen?')) return;
  
  window.newSegments[segmentIndex].blocks.splice(blockIndex, 1);
  renderSegments();
  window.showNotification('Block gelöscht', 'success');
}

window.closeSegmentModal = function() {
  const modal = document.getElementById('segmentModal');
  if (modal) modal.classList.remove('active');
  window.currentSegmentId = null;
}

window.closeBlockModal = function() {
  const modal = document.getElementById('blockModal');
  if (modal) modal.classList.remove('active');
  window.currentSegmentId = null;
  window.editingBlockIndex = null;
}

// ======================== Learning View Functions ========================

window.renderLearningContent = function() {
  if (!window.currentPlan) return;
  
  const container = document.getElementById('learningContent');
  const sidebar = document.getElementById('pathSidebar');
  const progressOverview = document.getElementById('progressOverview');
  
  if (!container) return;
  
  let html = '';
  let sidebarHtml = '<h3 style="margin-bottom: 1rem;">Lernpfad</h3>';
  let totalTasks = 0;
  let completedTasks = 0;
  
  window.currentPlan.segments.forEach((segment, segmentIndex) => {
    const color = segment.color || getRandomColor();
    
    html += `
      <div class="card mb-4">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${color};"></div>
            <h3 style="margin: 0;">${escapeHtml(segment.title)}</h3>
          </div>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${escapeHtml(segment.description)}</p>
        
        <div style="display: flex; flex-direction: column; gap: 1rem;">
    `;
    
    sidebarHtml += `
      <div style="margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></div>
          <strong>${escapeHtml(segment.title)}</strong>
        </div>
        <div style="margin-left: 1.5rem;">
    `;
    
    if (segment.blocks && segment.blocks.length > 0) {
      segment.blocks.forEach((block, blockIndex) => {
        if (block.type === 'task') {
          totalTasks++;
          if (block.completed) completedTasks++;
        }
        
        html += renderLearningBlock(block, segmentIndex, blockIndex);
        
        sidebarHtml += `
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
            <span style="font-size: 0.75rem;">
              ${block.type === 'video' ? '🎥' : block.completed ? '✅' : '📝'}
            </span>
            <span style="font-size: 0.875rem; ${block.completed ? 'text-decoration: line-through; color: var(--text-tertiary);' : ''}">
              ${escapeHtml(block.title)}
            </span>
          </div>
        `;
      });
    } else {
      html += `<p style="color: var(--text-tertiary); font-style: italic;">Noch keine Inhalte</p>`;
    }
    
    html += `</div></div>`;
    sidebarHtml += `</div></div>`;
  });
  
  container.innerHTML = html;
  
  if (sidebar) {
    sidebar.innerHTML = sidebarHtml;
  }
  
  if (progressOverview) {
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    progressOverview.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom: 1rem;">Fortschritt</h3>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: bold; color: var(--primary); margin-bottom: 0.5rem;">${progress}%</div>
          <div class="progress-bar" style="height: 8px; margin-bottom: 1rem;">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <p style="color: var(--text-secondary); font-size: 0.875rem;">
            ${completedTasks} von ${totalTasks} Aufgaben erledigt
          </p>
        </div>
      </div>
    `;
  }
}

window.renderLearningBlock = function(block, segmentIndex, blockIndex) {

  // Universelle Video-ID-Extraktion
  function extractVideoId(input) {
    if (!input) return null;

    try {
      // Falls nur eine ID übergeben wurde
      if (!input.includes("youtube.com") && !input.includes("youtu.be")) {
        return input;
      }

      const url = new URL(input);

      // Normale YouTube-Links: ?v=ID
      const vParam = url.searchParams.get("v");
      if (vParam) return vParam;

      // youtu.be/ID
      if (url.hostname.includes("youtu.be")) {
        return url.pathname.replace("/", "");
      }

      // Shorts: /shorts/ID
      if (url.pathname.includes("/shorts/")) {
        return url.pathname.split("/shorts/")[1];
      }

      // Fallback: letzter Path-Segment
      return url.pathname.split("/").pop();

    } catch (e) {
      // Falls input kein valider URL ist → als ID behandeln
      return input;
    }
  }

  switch(block.type) {

    case 'video':
      const videoId = block.videoId || extractVideoId(block.content);

      return `
        <div class="block-item">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <span style="font-weight: 500;">🎥 ${escapeHtml(block.title)}</span>
              <p style="color: var(--text-secondary); margin-top: 0.25rem; font-size: 0.875rem;">
                ${escapeHtml(block.description || "")}
              </p>
            </div>
            <button class="btn btn-primary" onclick="window.markAsWatched(${segmentIndex}, ${blockIndex})">
              ✅ Gesehen
            </button>
          </div>

          <div class="video-container">


          <label for="videoInput" style="display: block; margin-bottom: 8px; font-weight: bold;">
            <iframe 
              src="https://www.youtube.com/embed/${videoId}" 
              allowfullscreen>
            </iframe>

          </label>

          </div>
        </div>
      `;

    case 'task':
      return `
        <div class="block-item" style="padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span style="font-weight: 500;">📝 ${escapeHtml(block.title)}</span>
                ${block.completed 
                  ? '<span style="display: inline-block; padding: 0.25rem 0.5rem; background: var(--secondary-light); color: var(--secondary); border-radius: 4px; font-size: 0.75rem;">Erledigt</span>' 
                  : ''
                }
              </div>

              <p style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.875rem;">
                ${escapeHtml(block.description || "")}
              </p>

              <div style="display: flex; gap: 0.5rem;">
                ${block.taskType === 'quiz' 
                  ? '<span style="display: inline-block; padding: 0.25rem 0.5rem; background: var(--primary-light); color: var(--primary); border-radius: 4px; font-size: 0.75rem;">Quiz</span>' 
                  : ''
                }
                ${block.taskType === 'exercise' 
                  ? '<span style="display: inline-block; padding: 0.25rem 0.5rem; background: var(--info-light); color: var(--info); border-radius: 4px; font-size: 0.75rem;">Übung</span>' 
                  : ''
                }
              </div>
            </div>

            <div style="margin-left: 1rem;">
              <button 
                class="btn ${block.completed ? 'btn-secondary' : 'btn-primary'}" 
                onclick="window.toggleTaskCompletion(${segmentIndex}, ${blockIndex})">
                ${block.completed ? '❌ Als unerledigt markieren' : '✅ Als erledigt markieren'}
              </button>
            </div>
          </div>
        </div>
      `;

    default:
      return '';
  }
}

window.toggleTaskCompletion = function(segmentIndex, blockIndex) {
  if (!window.currentPlan || !window.currentPlan.segments[segmentIndex]) return;
  
  const block = window.currentPlan.segments[segmentIndex].blocks[blockIndex];
  if (block.type !== 'task') return;
  
  block.completed = !block.completed;
  
  // Update in main plans array
  const planIndex = window.plans.findIndex(p => p.id === window.currentPlanId);
  if (planIndex !== -1) {
    window.plans[planIndex].segments[segmentIndex].blocks[blockIndex].completed = block.completed;
    window.savePlans();
  }
  
  renderLearningContent();
  
  if (block.completed) {
    window.showNotification('Aufgabe als erledigt markiert!', 'success');
    
    // Check if all tasks are completed
    const allSegments = window.currentPlan.segments;
    const allTasks = allSegments.flatMap(segment => 
      segment.blocks ? segment.blocks.filter(b => b.type === 'task') : []
    );
    const allCompleted = allTasks.every(task => task.completed);
    
    if (allCompleted && allTasks.length > 0) {
      setTimeout(() => {
        window.showCompletionModal();
      }, 1000);
    }
  }
}

window.markAsWatched = function(segmentIndex, blockIndex) {
  window.showNotification('Video als gesehen markiert!', 'success');
  
  // Optional: You could add logic to track video watching
  // For now, just show a notification
}

window.showCompletionModal = function() {
  const modal = document.getElementById('completionModal');
  const titleElement = document.getElementById('completedPlanTitle');
  
  if (titleElement && window.currentPlan) {
    titleElement.textContent = window.currentPlan.title;
  }
  
  if (modal) {
    modal.classList.add('active');
  }
  
  // Optional: Add confetti effect
  if (!window.confettiActive) {
    window.confettiActive = true;
    // Simple confetti effect
    setTimeout(() => {
      window.confettiActive = false;
    }, 3000);
  }
}

window.closeCompletionModal = function() {
  const modal = document.getElementById('completionModal');
  if (modal) modal.classList.remove('active');
}

window.savePlan = function() {
  const title = document.getElementById('planTitle').value;
  const description = document.getElementById('planDescription').value;
  const subject = document.getElementById('planSubject').value;
  const deadline = document.getElementById('planDeadline').value;
  const folder = document.getElementById('planFolder').value;
  
  if (!title || !subject || !deadline) {
    window.showNotification('Bitte fülle alle Pflichtfelder aus', 'error');
    return;
  }
  
  const planData = {
    id: window.currentPlanId || Date.now().toString(),
    title: title,
    description: description,
    subject: subject,
    deadline: deadline,
    folder: folder || window.currentFolder,
    segments: window.newSegments || [],
    createdAt: window.currentPlan ? window.currentPlan.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (window.currentPlanId) {
    // Update existing plan
    const index = window.plans.findIndex(p => p.id === window.currentPlanId);
    if (index !== -1) {
      window.plans[index] = planData;
    }
  } else {
    // Add new plan
    window.plans.push(planData);
  }
  
  window.savePlans();
  window.showNotification('Lernplan gespeichert!', 'success');
  window.goToDashboard();
}

// ======================== Basic Functions ========================

window.escapeHtml = function(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

window.getRandomColor = function() {
  const colors = ['#6366f1', '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b'];
  return colors[Math.floor(Math.random() * colors.length)];
}

window.showNotification = function(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div>${window.escapeHtml(message)}</div>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  if (duration > 0) {
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

window.savePlans = function() {
  try {
    localStorage.setItem('lernplans', JSON.stringify(window.plans));
    window.lastSaveTime = new Date();
    window.renderLastSaveTime();
    return true;
  } catch (error) {
    console.error('Speicherfehler:', error);
    window.showNotification('Daten konnten nicht gespeichert werden', 'error');
    return false;
  }
}

window.loadPlans = function() {
  try {
    const data = localStorage.getItem('lernplans');
    if (data) {
      window.plans = JSON.parse(data);
    }
  } catch (error) {
    console.error('Ladefehler:', error);
    window.plans = [];
  }
}

window.renderLastSaveTime = function() {
  const element = document.getElementById('lastSaveTime');
  if (element && window.lastSaveTime) {
    const timeString = window.lastSaveTime.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    element.textContent = `Zuletzt gespeichert: ${timeString}`;
  }
}

window.createBackup = function() {
  try {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      plans: window.plans,
      folders: window.folders
    };
    
    localStorage.setItem('lernplans_backup', JSON.stringify(backupData));
  } catch (error) {
    console.error('Backup-Fehler:', error);
  }
}

window.manualSave = function() {
  window.showNotification('Speichere...', 'info');
  const success = window.savePlans();
  window.createBackup();
  
  if (success) {
    window.showNotification('Erfolgreich gespeichert!', 'success');
  } else {
    window.showNotification('Fehler beim Speichern', 'error');
  }
}

// ======================== Event Handlers ========================

window.onFolderChange = function(folder) {
  window.currentFolder = folder;
  window.renderDashboard();
}

// ======================== Start ========================

document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.init === 'function') {
    window.init();
  }
});