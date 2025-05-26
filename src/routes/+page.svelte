<script>
  import { onMount } from "svelte";
  let tab = 'create';
  let isRecording = false;
  let transcript = '';
  let isAnalyzing = false;

  // In-memory data
  let projects = [];
  let selected = null;
  let editing = null;

  // Add Project/Tasks
  function addProject(analysis) {
    const now = Date.now();
    const p = {
      id: `proj_${now}`,
      name: analysis.project_name,
      due_date: analysis.due_date,
      goal: analysis.goal,
      needs_reminder: 1,
      reminder_frequency: analysis.reminder_frequency,
      tone: analysis.tone,
      suggestion: analysis.suggestion,
      tasks: analysis.tasks.map((desc, i) => ({
        id: `task_${now}_${i}`,
        description: desc,
        status: 'pending'
      }))
    };
    projects = [...projects, p];
    selected = p;
  }
  // Analyze mock (replace with API call to your backend for prod)
  async function analyzeNote() {
    if (!transcript.trim()) return;
    isAnalyzing = true;
    await new Promise((r) => setTimeout(r, 900));
    addProject(mockAnalyzeVoiceNote(transcript));
    transcript = '';
    tab = 'manage';
    isAnalyzing = false;
  }
  // Task helper
  function toggleTask(pid, tid) {
    projects = projects.map(p =>
      p.id === pid
        ? { ...p, tasks: p.tasks.map(t => t.id === tid ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t) }
        : p
    );
    selected = projects.find(p => p.id === pid);
  }
  function deleteProject(pid) {
    projects = projects.filter(p => p.id !== pid);
    selected = null;
  }
  function beginEdit(p) {
    editing = { ...p };
  }
  function saveEdit() {
    projects = projects.map(p => p.id === editing.id ? editing : p);
    selected = editing;
    editing = null;
  }
  // ------ Mock AI Analysis logic (same as earlier, but local JS for demo) -----
  function mockAnalyzeVoiceNote(text) {
    return {
      project_name: text.match(/project .*? (\w+ .+?)(?:\.|$)/i)?.[1] || text.slice(0,20) || 'Untitled',
      due_date: (() => {
        if (/next week/i.test(text)) {
          let d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().split('T')[0];
        }
        else if (/tomorrow/i.test(text)) {
          let d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0];
        }
        return (new Date(Date.now()+7*864e5)).toISOString().split('T')[0];
      })(),
      goal: text.match(/goal is (.+?)(\.|$)/i)?.[1] || "Complete the project successfully",
      tasks: (
        text.match(/need to (.+?)(\.|$)/i)?.[1]
          ?.split(",") || ["Plan project structure", "Start implementation", "Review and test", "Finalize project"]
      ).map(t=>t.trim()).filter(Boolean).slice(0,5),
      reminder_frequency: /daily/i.test(text) ? "daily" : "weekly",
      tone: /gentle|nice/i.test(text) ? "gentle" : /funny|humor/i.test(text) ? "humorous" : "encouraging",
      suggestion: "Break down large tasks into smaller, manageable steps"
    };
  }
</script>

<div class="header">
  <div class="container">
    <div class="header-content">
      <h1 class="logo">Half-Done Projects</h1>
      <div class="user-info">👋 Demo User</div>
    </div>
    <nav class="nav-tabs">
      <button class:active={tab === 'create'} class="nav-tab" on:click={() => {tab = 'create'; selected = null;editing=null;}}>Create Project</button>
      <button class:active={tab === 'manage'} class="nav-tab" on:click={() => {tab = 'manage';}}>Manage Projects</button>
    </nav>
  </div>
</div>

<main class="main-content">
  <div class="container">

    {#if tab === 'create'}
      <div class="create-section">
        <h2 class="create-title">Tell me about your project</h2>
        <p class="create-subtitle">Record a voice note or type your project details</p>
      </div>
      <div class="card">
        <div class="voice-section">
          <div style="text-align:center; margin-bottom:24px;">
            <button class="record-button" disabled>🎙️</button>
            <div style="font-size:14px;opacity:0.7;">Voice input coming soon</div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Or type your project note:</label>
          <textarea class="form-textarea" bind:value={transcript}
            placeholder="I need to build a website for my photo business by next Friday. The goal is to ..."></textarea>
        </div>
        <div style="text-align:center;">
          <button class="btn btn-primary" on:click={analyzeNote}
            disabled={isAnalyzing || !transcript.trim()}>{isAnalyzing ? '🤖 Analyzing...' : '✨ Create Project'}</button>
        </div>
        {#if transcript}
          <div style="margin-top:24px; padding:16px; background:rgba(255,255,255,0.05); border-radius:8px;">
            <h3 style="margin-bottom:8px; font-size:16px; font-weight:600;">📝 Your Note:</h3>
            <p style="color:rgba(255,255,255,0.8); font-style:italic;">"{transcript}"</p>
          </div>
        {/if}
      </div>
    {/if}

    {#if tab === 'manage'}
      {#if !projects.length}
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h2 class="empty-title">No projects yet</h2>
          <p class="empty-text">Create your first project using voice input</p>
          <button class="btn btn-primary" on:click={()=>tab='create'}>Create Project</button>
        </div>
      {:else}
        <div class="projects-grid">
          <div class="projects-list">
            <h3 style="font-size:18px; font-weight:600; margin-bottom:16px;">Your Projects</h3>
            {#each projects as p}
              <div class="project-item" class:selected={selected?.id === p.id}
                   on:click={()=>{selected=p; editing=null;}}>
                <div class="project-name">{p.name}</div>
                <div class="project-meta">📅 {new Date(p.due_date).toLocaleDateString()}<br>
                  🔔 {p.reminder_frequency.charAt(0).toUpperCase() + p.reminder_frequency.slice(1)} reminders
                </div>
              </div>
            {/each}
          </div>
          <div class="project-details">
          {#if selected}
            {#if editing}
              <form on:submit|preventDefault={saveEdit}>
                <h3 style="font-size:20px;font-weight:600; margin-bottom:16px;">Edit Project</h3>
                <div class="form-group">
                  <label class="form-label">Project Name</label>
                  <input class="form-input" bind:value={editing.name}>
                </div>
                <div class="form-group">
                  <label class="form-label">Goal</label>
                  <input class="form-input" bind:value={editing.goal}>
                </div>
                <div class="form-group">
                  <label class="form-label">Due Date</label>
                  <input class="form-input" type="date" bind:value={editing.due_date}>
                </div>
                <div class="form-group">
                  <label class="form-label">Reminder Frequency</label>
                  <select class="form-input" bind:value={editing.reminder_frequency}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Tone</label>
                  <select class="form-input" bind:value={editing.tone}>
                    <option value="encouraging">Encouraging</option>
                    <option value="gentle">Gentle</option>
                    <option value="humorous">Humorous</option>
                  </select>
                </div>
                <div style="display:flex;gap:12px;">
                  <button class="btn btn-primary" type="submit">💾 Save</button>
                  <button class="btn" type="button" style="background:#374151; color:white;" on:click={()=>editing=null}>Cancel</button>
                </div>
              </form>
            {:else}
              <div class="project-header">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                  <h2 class="project-title">{selected.name}</h2>
                  <div style="display:flex; gap:8px;">
                    <button class="btn btn-primary" on:click={()=>beginEdit(selected)}>⚙️ Settings</button>
                    <button class="btn" style="background: #dc2626; color: white;" on:click={() => deleteProject(selected.id)}>🗑️ Delete</button>
                  </div>
                </div>
                <div class="project-info">
                  <div class="info-item">
                    <div class="info-label">Goal</div>
                    <div class="info-value">{selected.goal}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Due Date</div>
                    <div class="info-value">{new Date(selected.due_date).toLocaleDateString()}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Reminders</div>
                    <div class="info-value">{selected.reminder_frequency.charAt(0).toUpperCase()+selected.reminder_frequency.slice(1)}</div>
                  </div>
                  <div class="info-item">
                    <div class="info-label">Tone</div>
                    <div class="info-value">{selected.tone}</div>
                  </div>
                </div>
              </div>
              <div class="progress-section">
                <div class="progress-header">
                  <span>Progress</span>
                  <span>{selected.tasks.filter(t=>t.status==='completed').length}/{selected.tasks.length} tasks completed</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: {selected.tasks.length?100*selected.tasks.filter(t=>t.status==='completed').length/selected.tasks.length:0}%;"></div>
                </div>
              </div>
              <div class="tasks-section">
                <h4 style="font-weight:600; margin-bottom:12px;">Tasks</h4>
                {#each selected.tasks as t}
                  <div class="task-item">
                    <div class="task-checkbox" class:completed={t.status==='completed'}
                         on:click={()=>toggleTask(selected.id,t.id)}>
                      {t.status==='completed' ? '✔️' : ''}
                    </div>
                    <div class="task-text" class:completed={t.status==='completed'}>{t.description}</div>
                  </div>
                  {/each}
                <div class="settings-panel">
                  <div class="settings-title">💡 Suggestion</div>
                  <div style="color:rgba(99,102,241,1); font-weight:500;">{selected.suggestion}</div>
                </div>
              </div>
            {/if}
          {:else}
            <div class="empty-state">
              <div class="empty-icon">👈</div>
              <h3 class="empty-title">Select a project</h3>
              <p class="empty-text">Choose a project from the list to view details and manage settings</p>
            </div>
          {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</main>

<style>
  /* Paste your CSS here. For brevity, this is omitted but your HTML version is fully reusable! */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
  body { font-family: Inter,sans-serif; }
  .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
  /* ...rest of your CSS... */
</style>