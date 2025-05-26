<script lang="ts">
  import { onMount } from "svelte";
  let note = "";
  let noteData = null;
  let isAnalyzing = false;

  async function analyze() {
    isAnalyzing = true;
    noteData = null;
    try {
      const res = await fetch("/api/analyze-voicenote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: note, user_id: "demo_user" })
      });
      noteData = await res.json();
    } catch (e) {
      noteData = { error: e.message };
    } finally {
      isAnalyzing = false;
    }
  }
</script>

<div class="container mx-auto max-w-2xl p-8">
  <h1 class="text-2xl font-bold mb-4 gradient">Half-Done Projects</h1>
  <div class="mb-6">
    <label class="block font-semibold mb-2">Paste or record your project note:</label>
    <textarea class="w-full p-3 rounded bg-gray-800 text-white mb-2" bind:value={note} rows="6"
      placeholder="Describe your project, e.g. 'I need to build a site... due next week. I want to focus on ... Tasks: ... Remind me ...'"></textarea>
    <button class="px-4 py-2 rounded bg-purple-600 font-bold text-white hover:bg-purple-800 transition disabled:opacity-60"
      on:click={analyze} disabled={isAnalyzing || !note.trim()}>
      {isAnalyzing ? '🤖 Analyzing...' : '✨ Analyze Note'}
    </button>
  </div>

  {#if noteData}
    <pre class="bg-gray-900 p-4 rounded mt-4 overflow-x-auto text-green-200">{JSON.stringify(noteData, null, 2)}</pre>
  {/if}
</div>

<style>
.gradient {
  background: linear-gradient(90deg, #60a5fa, #a855f7 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
body {
  background: linear-gradient(135deg, #1e293b 0%, #7c3aed 60%, #1e293b 100%);
}
</style>