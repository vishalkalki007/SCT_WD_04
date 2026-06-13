// Application Initial Memory State Structure
let appState = {
    lists: ["Personal", "Work", "Shopping"],
    currentList: "Personal",
    tasks: [
        { id: "1", list: "Personal", title: "Buy groceries for dinner", dueDate: "2026-06-12T18:00", completed: false },
        { id: "2", list: "Work", title: "Review quarterly project brief", dueDate: "2026-06-10T14:00", completed: true }
    ]
};

// Retrieve data out of Browser LocalStorage on application setup
if (localStorage.getItem('todo_app_state')) {
    appState = JSON.parse(localStorage.getItem('todo_app_state'));
}

// Global DOM hooks
const listCategoriesContainer = document.getElementById('listCategories');
const newListInput = document.getElementById('newListInput');
const addListBtn = document.getElementById('addListBtn');
const currentListName = document.getElementById('currentListName');
const taskCountSummary = document.getElementById('taskCountSummary');
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDueInput = document.getElementById('taskDueInput');
const activeTasksContainer = document.getElementById('activeTasksContainer');
const completedTasksContainer = document.getElementById('completedTasksContainer');

let editingTaskId = null; // Memory latch tracking when updating old records

// Sync application current state snapshot into local storage cache
function saveStateToStorage() {
    localStorage.setItem('todo_app_state', JSON.stringify(appState));
}

/* ==========================================
   UI RENDERING ENGINES
   ========================================== */

function renderSidebarLists() {
    listCategoriesContainer.innerHTML = '';
    appState.lists.forEach(listName => {
        const li = document.createElement('li');
        li.className = `list-item-node ${appState.currentList === listName ? 'active' : ''}`;
        li.textContent = listName;
        
        // Switch between task lists on selection click
        li.addEventListener('click', () => {
            appState.currentList = listName;
            editingTaskId = null; // Reset form edits if switching categories
            taskForm.reset();
            document.getElementById('submitTaskBtn').textContent = "Add Task";
            saveStateToStorage();
            renderSidebarLists();
            renderTasks();
        });
        listCategoriesContainer.appendChild(li);
    });
}

function renderTasks() {
    activeTasksContainer.innerHTML = '';
    completedTasksContainer.innerHTML = '';
    currentListName.textContent = appState.currentList;

    // Filter matching task nodes belonging to current active list channel
    const currentTasks = appState.tasks.filter(t => t.list === appState.currentList);
    let pendingCount = 0;

    currentTasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';

        // Evaluate clock timestamp configuration flags
        let dateMarkup = '';
        if (task.dueDate) {
            const parsedDate = new Date(task.dueDate);
            const isOverdue = parsedDate < new Date() && !task.completed;
            const formattedDate = parsedDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
            dateMarkup = `<span class="task-date ${isOverdue ? 'overdue' : ''}">
                ${isOverdue ? '⚠️ Overdue: ' : '📅 '} ${formattedDate}
            </span>`;
        }

        taskCard.innerHTML = `
            <div class="task-left">
                <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" class="toggle-check">
                <div class="task-details">
                    <span class="task-title">${escapeHTML(task.title)}</span>
                    ${dateMarkup}
                </div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" data-id="${task.id}">Edit</button>
                <button class="delete-btn" data-id="${task.id}">Delete</button>
            </div>
        `;

        // Route node maps into respective display arrays based on completion flag
        if (task.completed) {
            completedTasksContainer.appendChild(taskCard);
        } else {
            pendingCount++;
            activeTasksContainer.appendChild(taskCard);
        }
    });

    taskCountSummary.textContent = `${pendingCount} pending task${pendingCount === 1 ? '' : 's'}`;
    registerCardEvents();
}

/* ==========================================
   EVENT CAPTURES & MUTATION LOGIC
   ========================================== */

// Handle Task Submission (Both Create and Update operations)
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = taskTitleInput.value.trim();
    const dueDate = taskDueInput.value;

    if (!title) return;

    if (editingTaskId) {
        // Mode A: Update existing task parameters
        const index = appState.tasks.findIndex(t => t.id === editingTaskId);
        if (index !== -1) {
            appState.tasks[index].title = title;
            appState.tasks[index].dueDate = dueDate;
        }
        editingTaskId = null;
        document.getElementById('submitTaskBtn').textContent = "Add Task";
    } else {
        // Mode B: Create new array record item instance
        const newTask = {
            id: Date.now().toString(),
            list: appState.currentList,
            title: title,
            dueDate: dueDate,
            completed: false
        };
        appState.tasks.push(newTask);
    }

    taskForm.reset();
    saveStateToStorage();
    renderTasks();
});

// Create new custom sidebar list group categories
addListBtn.addEventListener('click', () => {
    const listTitle = newListInput.value.trim();
    if (!listTitle || appState.lists.includes(listTitle)) return;

    appState.lists.push(listTitle);
    appState.currentList = listTitle; // Automatically set as active list view
    newListInput.value = '';
    
    saveStateToStorage();
    renderSidebarLists();
    renderTasks();
});

// Bind Event Listeners to dynamic elements using selectors
function registerCardEvents() {
    // 1. Completion Toggle Click Actions
    document.querySelectorAll('.toggle-check').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            const task = appState.tasks.find(t => t.id === id);
            if (task) task.completed = e.target.checked;
            saveStateToStorage();
            renderTasks();
        });
    });

    // 2. Delete Button Operations
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            appState.tasks = appState.tasks.filter(t => t.id !== id);
            if (editingTaskId === id) { // Reset fields if deleting an item currently being edited
                editingTaskId = null;
                taskForm.reset();
                document.getElementById('submitTaskBtn').textContent = "Add Task";
            }
            saveStateToStorage();
            renderTasks();
        });
    });

    // 3. Edit Button Handler: Populates form with existing properties
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const task = appState.tasks.find(t => t.id === id);
            if (task) {
                editingTaskId = id;
                taskTitleInput.value = task.title;
                taskDueInput.value = task.dueDate || '';
                document.getElementById('submitTaskBtn').textContent = "Update Task";
                taskTitleInput.focus();
            }
        });
    });
}

// Utility Helper preventing user scripting exploits (XSS protection Injection)
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// Initial application instantiation run sequence flags
renderSidebarLists();
renderTasks();