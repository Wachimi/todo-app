// ========================================
// TO-DO APP - APLIKACJA LISTA ZADAŃ
// ========================================

// GLOBALNE ZMIENNE
let tasks = [];
let currentFilter = 'all';
let currentSort = 'date-desc';

// ========================================
// INICJALIZACJA
// ========================================

// Wczytaj zadania przy starcie
document.addEventListener('DOMContentLoaded', function() {
    loadTasksFromStorage();
    initEventListeners();
    console.log('✅ To-Do App załadowana!');
});

// ========================================
// EVENT LISTENERS
// ========================================

function initEventListeners() {
    // Przycisk "Dodaj"
    document.getElementById('addBtn').addEventListener('click', addTask);
    
    // Enter w polu input
    document.getElementById('taskInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    // Przyciski filtrów
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterTasks(this.dataset.filter);
            
            // Zaktualizuj aktywny przycisk
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Przycisk "Usuń ukończone"
    document.getElementById('clearCompleted').addEventListener('click', clearCompleted);

    document.getElementById('sortSelect').addEventListener('change', function() {
        currentSort = this.value;
        renderTasks();
    });
}

// ========================================
// GŁÓWNE FUNKCJE
// ========================================

// Dodawanie zadania
function addTask() {
    const input = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const categorySelect = document.getElementById('categorySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const taskText = input.value.trim();
    
    // Walidacja
    if (taskText === '') {
        alert('Wpisz treść zadania!');
        return;
    }
    
    // Stwórz obiekt zadania
    const task = {
        id: Date.now(),
        text: taskText,
        priority: prioritySelect.value,
        category: categorySelect.value,
        dueDate: dueDateInput.value,
        completed: false,
        createdAt: new Date().toLocaleString('pl-PL')
    };
    
    // Dodaj do tablicy
    tasks.push(task);
    
    // Zapisz i wyświetl
    saveTasksToStorage();
    renderTasks();
    
    // Wyczyść input
    input.value = '';
    prioritySelect.value = 'medium';
    categorySelect.value = 'work';
    dueDateInput.value = '';
    input.focus();
}

// Wyświetlanie zadań
function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    
    // Filtruj zadania
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });
    const sortedTasks = sortTasks(filteredTasks);
    
    // Pusta lista
    if (sortedTasks.length === 0) {
        tasksList.innerHTML = getEmptyState();
        updateCounter();
        return;
    }
    
    // Generuj HTML
    let html = '';
    sortedTasks.forEach(task => {
        html += createTaskHTML(task);
    });
    
    tasksList.innerHTML = html;
    
    // Dodaj event listenery do checkboxów i przycisków
    addTaskEventListeners();
    updateCounter();
}

// Tworzenie HTML pojedynczego zadania
function createTaskHTML(task) {
    const priority = getTaskPriority(task.priority);
    const category = getTaskCategory(task.category);
    const dueDateHTML = getDueDateHTML(task.dueDate, task.completed);
    
    return `
        <div class="task-item priority-${priority} ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''}
            >
            <div class="task-text" title="Kliknij dwa razy, aby edytować">${escapeHTML(task.text)}</div>
            <div class="task-tags">
                <span class="task-category category-badge-${category}">${getCategoryLabel(category)}</span>
                <span class="task-priority priority-badge-${priority}">${getPriorityLabel(priority)}</span>
                ${dueDateHTML}
            </div>
            <button class="edit-details-btn">Edytuj</button>
            <button class="delete-btn">Usuń</button>
        </div>
    `;
}

// Pusty stan
function getEmptyState() {
    const messages = {
        all: 'Dodaj swoje pierwsze zadanie!',
        active: 'Wszystkie zadania ukończone! 🎉',
        completed: 'Brak ukończonych zadań'
    };
    
    return `
        <div class="empty-state">
            <div style="font-size: 64px;">📝</div>
            <h3>Brak zadań</h3>
            <p>${messages[currentFilter]}</p>
        </div>
    `;
}

// Event listenery dla zadań (checkbox i usuń)
function addTaskEventListeners() {
    // Checkboxy
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const taskId = parseInt(this.closest('.task-item').dataset.id);
            toggleTask(taskId);
        });
    });

    const taskTexts = document.querySelectorAll('.task-text');
    taskTexts.forEach(text => {
        text.addEventListener('dblclick', function() {
            const taskId = parseInt(this.closest('.task-item').dataset.id);
            startEditingTask(taskId);
        });
    });

    const editDetailsButtons = document.querySelectorAll('.edit-details-btn');
    editDetailsButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const taskId = parseInt(this.closest('.task-item').dataset.id);
            startEditingTaskDetails(taskId);
        });
    });
    
    // Przyciski usuwania
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const taskId = parseInt(this.closest('.task-item').dataset.id);
            deleteTask(taskId);
        });
    });
}

// Edycja zadania
function startEditingTask(id) {
    const task = tasks.find(t => t.id === id);
    const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
    
    if (!task || !taskItem || taskItem.classList.contains('editing')) {
        return;
    }
    
    const taskText = taskItem.querySelector('.task-text');
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'task-edit-input';
    editInput.value = task.text;
    editInput.maxLength = 100;
    
    taskItem.classList.add('editing');
    taskText.replaceWith(editInput);
    editInput.focus();
    editInput.select();
    
    let isFinished = false;
    
    function finishEditing(shouldSave) {
        if (isFinished) return;
        isFinished = true;
        
        if (shouldSave) {
            saveEditedTask(id, editInput.value);
        } else {
            renderTasks();
        }
    }
    
    editInput.addEventListener('blur', function() {
        finishEditing(true);
    });
    
    editInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            finishEditing(true);
        }
        
        if (e.key === 'Escape') {
            finishEditing(false);
        }
    });
}

function saveEditedTask(id, newText) {
    const task = tasks.find(t => t.id === id);
    const trimmedText = newText.trim();
    
    if (!task) return;
    
    if (trimmedText !== '') {
        task.text = trimmedText;
        saveTasksToStorage();
    }
    
    renderTasks();
}

function startEditingTaskDetails(id) {
    const task = tasks.find(t => t.id === id);
    const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
    
    if (!task || !taskItem || taskItem.classList.contains('editing-details')) {
        return;
    }
    
    const priority = getTaskPriority(task.priority);
    const category = getTaskCategory(task.category);
    const taskTags = taskItem.querySelector('.task-tags');
    const editButton = taskItem.querySelector('.edit-details-btn');
    const editForm = document.createElement('div');
    
    editForm.className = 'task-details-edit';
    editForm.innerHTML = `
        <select class="edit-priority-select" aria-label="Zmien priorytet">
            <option value="low" ${priority === 'low' ? 'selected' : ''}>Niski</option>
            <option value="medium" ${priority === 'medium' ? 'selected' : ''}>Średni</option>
            <option value="high" ${priority === 'high' ? 'selected' : ''}>Wysoki</option>
        </select>
        <select class="edit-category-select" aria-label="Zmien kategorie">
            <option value="work" ${category === 'work' ? 'selected' : ''}>Praca</option>
            <option value="home" ${category === 'home' ? 'selected' : ''}>Dom</option>
            <option value="shopping" ${category === 'shopping' ? 'selected' : ''}>Zakupy</option>
        </select>
        <input class="edit-due-date-input" type="date" aria-label="Zmien termin wykonania" value="${getTaskDueDate(task.dueDate)}">
        <button class="save-details-btn" type="button">Zapisz</button>
        <button class="cancel-details-btn" type="button">Anuluj</button>
    `;
    
    taskItem.classList.add('editing-details');
    editButton.disabled = true;
    taskTags.replaceWith(editForm);
    
    const prioritySelect = editForm.querySelector('.edit-priority-select');
    const categorySelect = editForm.querySelector('.edit-category-select');
    const dueDateInput = editForm.querySelector('.edit-due-date-input');
    const saveButton = editForm.querySelector('.save-details-btn');
    const cancelButton = editForm.querySelector('.cancel-details-btn');
    
    prioritySelect.focus();
    
    saveButton.addEventListener('click', function() {
        saveTaskDetails(id, prioritySelect.value, categorySelect.value, dueDateInput.value);
    });
    
    cancelButton.addEventListener('click', function() {
        renderTasks();
    });
    
    editForm.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            renderTasks();
        }
    });
}

function saveTaskDetails(id, priority, category, dueDate) {
    const task = tasks.find(t => t.id === id);
    
    if (!task) return;
    
    task.priority = getTaskPriority(priority);
    task.category = getTaskCategory(category);
    task.dueDate = getTaskDueDate(dueDate);
    
    saveTasksToStorage();
    renderTasks();
}

// Przełączanie statusu zadania
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasksToStorage();
        renderTasks();
    }
}

// Usuwanie zadania
function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasksToStorage();
    renderTasks();
}

// Filtrowanie zadań
function filterTasks(filter) {
    currentFilter = filter;
    renderTasks();
}

function sortTasks(tasksToSort) {
    const sortedTasks = [...tasksToSort];
    
    if (currentSort === 'alpha-asc') {
        return sortedTasks.sort((a, b) => {
            return a.text.localeCompare(b.text, 'pl-PL', { sensitivity: 'base' });
        });
    }
    
    return sortedTasks.sort((a, b) => b.id - a.id);
}

// Usuwanie ukończonych zadań
function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;
    
    if (completedCount === 0) {
        alert('Brak ukończonych zadań do usunięcia');
        return;
    }
    
    if (confirm(`Czy na pewno usunąć ${completedCount} ukończonych zadań?`)) {
        tasks = tasks.filter(t => !t.completed);
        saveTasksToStorage();
        renderTasks();
    }
}

// Aktualizacja licznika
function updateCounter() {
    const activeCount = tasks.filter(t => !t.completed).length;
    document.getElementById('taskCount').textContent = activeCount;
}

// ========================================
// LOCAL STORAGE
// ========================================

function saveTasksToStorage() {
    localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

function loadTasksFromStorage() {
    const savedTasks = localStorage.getItem('todoTasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks).map(task => ({
            ...task,
            priority: getTaskPriority(task.priority),
            category: getTaskCategory(task.category),
            dueDate: getTaskDueDate(task.dueDate)
        }));
        renderTasks();
    }
}

function getTaskPriority(priority) {
    const allowedPriorities = ['low', 'medium', 'high'];
    
    if (allowedPriorities.includes(priority)) {
        return priority;
    }
    
    return 'medium';
}

function getPriorityLabel(priority) {
    const labels = {
        low: 'Niski',
        medium: 'Średni',
        high: 'Wysoki'
    };
    
    return labels[getTaskPriority(priority)];
}

function getTaskCategory(category) {
    const allowedCategories = ['work', 'home', 'shopping'];
    
    if (allowedCategories.includes(category)) {
        return category;
    }
    
    return 'work';
}

function getCategoryLabel(category) {
    const labels = {
        work: 'Praca',
        home: 'Dom',
        shopping: 'Zakupy'
    };
    
    return labels[getTaskCategory(category)];
}

function getTaskDueDate(dueDate) {
    if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        return dueDate;
    }
    
    return '';
}

function getDueDateHTML(dueDate, isCompleted) {
    const validDueDate = getTaskDueDate(dueDate);
    
    if (!validDueDate) {
        return '';
    }
    
    const status = getDueDateStatus(validDueDate, isCompleted);
    
    return `<span class="task-due-date due-date-${status}">${formatDueDate(validDueDate)}</span>`;
}

function getDueDateStatus(dueDate, isCompleted) {
    if (isCompleted) {
        return 'done';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadline = new Date(`${dueDate}T00:00:00`);
    
    if (deadline < today) {
        return 'overdue';
    }
    
    if (deadline.getTime() === today.getTime()) {
        return 'today';
    }
    
    return 'upcoming';
}

function formatDueDate(dueDate) {
    return new Date(`${dueDate}T00:00:00`).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHTML(text) {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
