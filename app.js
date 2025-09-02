(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MAX_TASKS = 10;
  let tasks = load();
  let filter = "all";
  let searchQuery = "";
  let taskToDelete = null;
  let clearCompletedPending = false; // Flag para limpar concluídas

  const form = $("#new-task-form");
  const input = $("#new-task-input");
  const list = $("#task-list");
  const counter = $("#counter");
  const clearBtn = $("#clear-completed");
  const search = $("#search");
  const filterBtns = $$(".filter");

  const modal = document.getElementById("confirm-modal");
  const btnYes = document.getElementById("confirm-yes");
  const btnNo = document.getElementById("confirm-no");

  render();

  // Adicionar nova tarefa
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (tasks.length >= MAX_TASKS) {
      alert("Limite de 10 tarefas atingido. Remova ou conclua alguma para adicionar outra.");
      return;
    }
    const text = normalizeTaskText(input.value);
    if (!text) return;
    addTask(text);
    input.value = "";
  });

  // Ações na lista
  list.addEventListener("click", e => {
    const li = e.target.closest(".item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.matches(".toggle")) {
      toggleTask(id, e.target.checked);
    } else if (e.target.matches(".delete")) {
      taskToDelete = id;
      showConfirmModal();
    } else if (e.target.matches(".edit")) {
      startInlineEdit(li);
    }
  });

  list.addEventListener("dblclick", e => {
    const span = e.target.closest(".text");
    if (!span) return;
    const li = span.closest(".item");
    startInlineEdit(li);
  });

  list.addEventListener("keydown", e => {
    if (e.target.matches(".text") && (e.key === "Enter")) {
      e.preventDefault();
      const li = e.target.closest(".item");
      startInlineEdit(li);
    }
  });

  // Pesquisa
  search.addEventListener("input", e => {
    searchQuery = e.target.value.toLowerCase();
    render();
  });

  // Filtros
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => { b.classList.remove("is-active"); b.setAttribute("aria-pressed","false"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed","true");
      filter = btn.dataset.filter;
      render();
    });
  });

  // Limpar tarefas concluídas com confirmação
  clearBtn.addEventListener("click", () => {
    if (tasks.some(t => t.completed)) {
      clearCompletedPending = true;
      showConfirmModal();
    }
  });

  // Modal functions
  function showConfirmModal() {
    modal.classList.remove("hidden");
  }
  function hideConfirmModal() {
    modal.classList.add("hidden");
    taskToDelete = null;
    clearCompletedPending = false;
  }

  btnYes.addEventListener("click", () => {
    if (clearCompletedPending) {
      tasks = tasks.filter(t => !t.completed);
      save();
      render();
      clearCompletedPending = false;
    } else if (taskToDelete) {
      removeTask(taskToDelete);
    }
    hideConfirmModal();
  });
  btnNo.addEventListener("click", hideConfirmModal);

  // Funções de tarefas
  function addTask(text) {
    const task = {
      id: cryptoRandomId(),
      text,
      completed: false,
      createdAt: Date.now()
    };
    tasks.unshift(task);
    save();
    render();
  }

  function toggleTask(id, value) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.completed = value;
    save();
    render();
  }

  function removeTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    save();
    render();
  }

  function startInlineEdit(li) {
    const span = $(".text", li);
    const old = span.textContent;
    if (li.querySelector("input.editing")) return;

    const input = document.createElement("input");
    input.type = "text";
    input.value = old;
    input.className = "input editing";
    input.setAttribute("aria-label", "Editar tarefa");
    span.replaceWith(input);
    input.focus();
    input.select();

    const stop = (commit) => {
      const value = normalizeTaskText(input.value);
      const newSpan = document.createElement("span");
      newSpan.className = "text";
      newSpan.tabIndex = 0;

      if (commit && value) {
        const t = tasks.find(t => t.id === li.dataset.id);
        if (t) t.text = value;
        newSpan.textContent = value;
        save();
      } else {
        newSpan.textContent = old;
      }
      input.replaceWith(newSpan);
      updateCounter();
    };

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") stop(true);
      if (e.key === "Escape") stop(false);
    });
    input.addEventListener("blur", () => stop(true));
  }

  // Renderizar lista
  function render() {
    list.innerHTML = "";

    const filtered = tasks
      .filter(t => {
        if (filter === "active") return !t.completed;
        if (filter === "completed") return t.completed;
        return true;
      })
      .filter(t => t.text.toLowerCase().includes(searchQuery));

    for (const t of filtered) {
      const node = renderItem(t);
      list.appendChild(node);
    }
    updateCounter();
  }

  function renderItem(t) {
    const tpl = $("#task-item-template");
    const li = tpl.content.firstElementChild.cloneNode(true);
    li.dataset.id = t.id;
    if (t.completed) li.classList.add("completed");
    $(".toggle", li).checked = t.completed;
    $(".text", li).textContent = t.text;

    $(".toggle", li).addEventListener("change", e => {
      li.classList.toggle("completed", e.target.checked);
    });

    return li;
  }

  function updateCounter() {
    const remaining = tasks.filter(t => !t.completed).length;
    counter.textContent = `${remaining} pendente${remaining === 1 ? "" : "s"} (máx. ${MAX_TASKS})`;
  }

  function normalizeTaskText(text) {
    const s = String(text || "").trim();
    if (!s) return "";
    return s[0].toUpperCase() + s.slice(1);
  }

  function save() {
    localStorage.setItem("todo.tasks", JSON.stringify(tasks));
  }
  function load() {
    try {
      const raw = localStorage.getItem("todo.tasks");
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) return [];
      return arr.map(t => ({
        id: String(t.id || cryptoRandomId()),
        text: normalizeTaskText(String(t.text || "")),
        completed: Boolean(t.completed),
        createdAt: Number(t.createdAt || Date.now())
      }));
    } catch {
      return [];
    }
  }

  function cryptoRandomId(){
    if (window.crypto?.randomUUID) return crypto.randomUUID();
    return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
})();
