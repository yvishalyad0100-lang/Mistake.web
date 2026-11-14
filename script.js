
const subjects = ['Physics', 'Chemistry', 'Maths'];

const blank = () => ({
  tests: [],
  modules: {
    Physics: [],
    Chemistry: [],
    Maths: []
  },
  race: {
    Physics: [],
    Chemistry: [],
    Maths: []
  }
});

let data;

try {
  data = JSON.parse(
    localStorage.getItem('jeeMistakeTracker') || 'null'
  ) || blank();
} catch {
  data = blank();
}

let activeSection = 'tests';
let activeSubject = 'Physics';
let openTest = null;
let openChapter = null;
let openExercise = null;

const moduleExercises = [
  'Exercise 01',
  'Exercise 02',
  'Exercise S',
  'Exercise JEE Mains PYQ',
  'Exercise JEE Advanced PYQ'
];

const $ = id => document.getElementById(id);

function save() {
  localStorage.setItem(
    'jeeMistakeTracker',
    JSON.stringify(data)
  );

  $('saveStatus').textContent = '● Saved locally';
}

function toast(msg) {
  $('toast').textContent = msg;
  $('toast').classList.add('show');

  setTimeout(() => {
    $('toast').classList.remove('show');
  }, 1900);
}

function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// MAIN NAVIGATION

function switchSection(s) {
  activeSection = s;

  document.querySelectorAll('.nav button')
    .forEach(b => {
      b.classList.toggle(
        'active',
        b.dataset.section === s
      );
    });

  document.querySelectorAll('.view')
    .forEach(v => v.classList.add('hidden'));

  $(s + 'View').classList.remove('hidden');

  if (s === 'tests') {
    openTest = null;
    renderTests();
  }

  if (s === 'modules') {
    renderChapterArea('modules');
  }

  if (s === 'race') {
    renderChapterArea('race');
  }
}

document.querySelectorAll('.nav button')
  .forEach(b => {
    b.onclick = () => switchSection(b.dataset.section);
  });

// TEST CREATION

$('createTest').onclick = () => {
  let name = $('testName').value.trim();
  let score = $('testScore').value.trim();

  if (!name) {
    toast('Please enter a test name');
    return;
  }

  let t = {
    id: crypto.randomUUID(),
    name,
    score,
    subjects: {
      Physics: [],
      Chemistry: [],
      Maths: []
    }
  };

  data.tests.unshift(t);

  save();

  $('testName').value = '';
  $('testScore').value = '';

  renderTests();

  openTest = t.id;

  renderTestDetail();

  toast('Test page created');
};

function renderTests() {
  $('testCount').textContent =
    data.tests.length + ' tests';

  let el = $('testList');

  if (!data.tests.length) {
    el.innerHTML = `
      <div class="empty">
        <b>No test records yet</b>
        Create your first test above.
      </div>`;
    return;
  }

  el.innerHTML = data.tests.map(t => `
    <div class="item">
      <div class="item-main">
        <div class="item-title">${esc(t.name)}</div>
        <div class="item-meta">
          Score: ${esc(t.score || 'Not added')}
          · ${subjects.reduce(
            (n, s) => n + (t.subjects[s]?.length || 0), 0
          )} questions saved
        </div>
      </div>

      <div class="item-actions">
        <button class="btn"
          onclick="openTestPage('${t.id}')">
          Open test →
        </button>

        <button class="btn danger"
          onclick="deleteTest('${t.id}')">
          Delete
        </button>
      </div>
    </div>
  `).join('');
}

function openTestPage(id) {
  openTest = id;
  renderTestDetail();
}

function deleteTest(id) {
  if (!confirm('Delete this test and its saved questions?')) {
    return;
  }

  data.tests = data.tests.filter(t => t.id !== id);

  if (openTest === id) {
    openTest = null;
  }

  save();
  renderTests();

  $('testDetail').classList.add('hidden');
}

function renderTestDetail() {
  let t = data.tests.find(x => x.id === openTest);

  if (!t) return;

  let el = $('testDetail');

  el.classList.remove('hidden');

  el.innerHTML = `
    <div class="crumb">
      <button onclick="closeTest()">← All tests</button>
      <span>/</span>
      ${esc(t.name)}
    </div>

    <div class="panel-head">
      <div>
        <h3>${esc(t.name)}</h3>
        <div class="small">
          Score: ${esc(t.score || 'Not added')}
        </div>
      </div>
      <span class="small">TEST NOTEBOOK</span>
    </div>

    <div class="subject-tabs">
      ${subjects.map(s => `
        <button
          class="${s === activeSubject ? 'active' : ''}"
          onclick="setTestSubject('${s}')">
          ${s}
        </button>
      `).join('')}
    </div>

    <div id="testQuestions"></div>
  `;

  renderQuestions('test');
}

function closeTest() {
  openTest = null;
  $('testDetail').classList.add('hidden');
}

function setTestSubject(s) {
  activeSubject = s;
  renderTestDetail();
}

// QUESTION DATA

function currentList(kind) {
  if (kind === 'test') {
    let t = data.tests.find(x => x.id === openTest);
    return t?.subjects[activeSubject] || [];
  }

  let c = data[kind][activeSubject]
    .find(x => x.id === openChapter);

  if (!c) return [];

  if (kind === 'modules') {
    if (!c.exercises) {
      c.exercises = Object.fromEntries(
        moduleExercises.map(n => [n, []])
      );
    }

    return c.exercises[openExercise] || [];
  }

  return c.questions || [];
}

// ADD QUESTION

function addQuestion(kind) {
  let list = currentList(kind);

  let q = {
    id: crypto.randomUUID(),
    image: '',
    concept: '',
    uploadOpen: true
  };

  list.push(q);

  save();
  renderQuestions(kind);

  let drop = document.querySelector(
    `[data-paste="${q.id}"]`
  );

  if (drop) drop.focus();
}

// DISPLAY QUESTIONS

function renderQuestions(kind) {
  let host = $(
    kind === 'test'
      ? 'testQuestions'
      : 'chapterQuestions'
  );

  if (!host) return;

  let qs = currentList(kind);
  let heading = 'Questions';

  if (kind === 'test') {
    let t = data.tests.find(x => x.id === openTest);
    heading = `${t?.name || 'Test'} ${activeSubject}`;
  } else {
    let c = data[kind][activeSubject]
      .find(x => x.id === openChapter);

    heading = c?.name || 'Chapter';
  }

  host.innerHTML = `
    <div class="panel-head">
      <div>
        <h3>${esc(heading)}</h3>
        <div class="small">
          ${qs.length} mistakes saved
        </div>
      </div>

      <button class="btn primary compact"
        onclick="addQuestion('${kind}')">
        ＋ Add Question
      </button>
    </div>

    ${
      qs.length
      ? qs.map((q, i) => `
        <article class="question">

          <div class="qhead">
            <div class="qtitle">
              Question ${i + 1}
            </div>

            <button class="btn danger compact"
              onclick="removeQuestion('${kind}','${q.id}')">
              Remove
            </button>
          </div>

          ${
            q.image
            ? `<img class="qimage"
                src="${q.image}"
                alt="Question ${i + 1} screenshot">`
            : ''
          }

          ${
            !q.image && q.uploadOpen
            ? `
              <div class="drop"
                tabindex="0"
                data-paste="${q.id}">

                <strong>Paste your question image here</strong>

                <br>

                <span class="small">
                  Click here, then press Ctrl + V
                </span>

                <div class="upload-hint">
                  Or choose an image file
                </div>

                <div style="margin-top:10px">
                  <input type="file"
                    accept="image/*"
                    onchange="fileQuestion(
                      '${kind}',
                      '${q.id}',
                      this.files[0]
                    )">
                </div>
              </div>
            `
            : ''
          }

          <button class="concept-toggle"
            onclick="toggleConcept('${q.id}')">
            ＋ Concept / Formula
          </button>

          <div class="concept" id="concept-${q.id}">
            <textarea
              placeholder="Write the concept, formula, or why you made this mistake..."
              oninput="updateConcept(
                '${kind}',
                '${q.id}',
                this.value
              )">${esc(q.concept || '')}</textarea>
          </div>

        </article>
      `).join('')
      : `
        <div class="empty">
          <b>No mistakes added yet</b>
          Click Add Question to create a question entry.
        </div>
      `
    }
  `;

  host.querySelectorAll('[data-paste]')
    .forEach(box => {
      box.addEventListener('click', () => box.focus());

      box.addEventListener('paste', e => {
        pasteImage(e, kind, box.dataset.paste);
      });
    });
}

// IMAGE PASTE AND UPLOAD

function getQuestion(kind, id) {
  return currentList(kind).find(q => q.id === id);
}

function pasteImage(e, kind, id) {
  let items = [...(e.clipboardData?.items || [])];

  let item = items.find(x =>
    x.type.startsWith('image/')
  );

  if (!item) {
    toast('Clipboard does not contain an image');
    return;
  }

  let f = item.getAsFile();

  readImage(f, kind, id);
}

function readImage(file, kind, id) {
  if (!file || !file.type.startsWith('image/')) {
    toast('Please choose an image');
    return;
  }

  let r = new FileReader();

  r.onload = () => {
    let q = getQuestion(kind, id);

    if (q) {
      q.image = r.result;
      q.uploadOpen = false;

      save();
      renderQuestions(kind);

      toast('Question image added');
    }
  };

  r.readAsDataURL(file);
}

function fileQuestion(kind, id, file) {
  readImage(file, kind, id);
}

function removeQuestion(kind, id) {
  let list = currentList(kind);

  let i = list.findIndex(q => q.id === id);

  if (i >= 0) {
    list.splice(i, 1);
    save();
    renderQuestions(kind);
  }
}

// CONCEPT

function toggleConcept(id) {
  $('concept-' + id)?.classList.toggle('open');
}

function updateConcept(kind, id, value) {
  let q = getQuestion(kind, id);

  if (q) {
    q.concept = value;
    save();
  }
}

// MODULE AND RACE SUBJECTS

function renderChapterArea(kind) {
  let tabs = $(
    kind === 'modules'
      ? 'moduleTabs'
      : 'raceTabs'
  );

  tabs.innerHTML = subjects.map(s => `
    <button
      class="${s === activeSubject ? 'active' : ''}"
      onclick="setSubject('${kind}','${s}')">
      ${s}
    </button>
  `).join('');

  renderChapters(kind);
}

function setSubject(kind, s) {
  activeSubject = s;
  openChapter = null;
  openExercise = null;

  renderChapterArea(kind);
}

// CHAPTER AND EXERCISES

function renderChapters(kind) {
  let host = $(
    kind === 'modules'
      ? 'moduleContent'
      : 'raceContent'
  );

  let chapters = data[kind][activeSubject];

  if (openChapter) {
    let c = chapters.find(x => x.id === openChapter);

    if (!c) {
      openChapter = null;
      openExercise = null;
    } else {

      // MODULE EXERCISES

      if (kind === 'modules' && !openExercise) {

        if (!c.exercises) {
          c.exercises = Object.fromEntries(
            moduleExercises.map(n => [n, []])
          );

          if (Array.isArray(c.questions) && c.questions.length) {
            c.exercises['Exercise 01'] = c.questions;
          }

          delete c.questions;
          save();
        }

        host.innerHTML = `
          <div class="crumb">
            <button onclick="backChapters('${kind}')">
              ← ${activeSubject} chapters
            </button>
            <span>/</span>
            ${esc(c.name)}
          </div>

          <div class="panel-head">
            <div>
              <h3>${esc(c.name)}</h3>
              <div class="small">
                ${activeSubject} · Module exercises
              </div>
            </div>

            <button class="btn ghost compact"
              onclick="renameChapter('${kind}','${c.id}')">
              Rename
            </button>
          </div>

          <div class="chapter-grid">
            ${moduleExercises.map(ex => `
              <button class="chapter"
                onclick="openExercisePage('${ex}')">

                <strong>${esc(ex)}</strong>

                <small>
                  ${(c.exercises[ex] || []).length}
                  mistakes saved · Open exercise →
                </small>

              </button>
            `).join('')}
          </div>
        `;

        return;
      }

      let label = kind === 'modules'
        ? openExercise
        : c.name;

      host.innerHTML = `
        <div class="crumb">
          <button onclick="${
            kind === 'modules'
              ? 'backExercises()'
              : `backChapters('${kind}')`
          }">
            ← ${kind === 'modules' ? 'Exercises' : activeSubject + ' chapters'}
          </button>

          <span>/</span>
          ${esc(c.name)}

          ${
            kind === 'modules'
            ? `<span>/</span>${esc(openExercise)}`
            : ''
          }
        </div>

        <div class="panel-head">
          <div>
            <h3>${esc(label)}</h3>
            <div class="small">
              ${activeSubject} · ${kind === 'modules'
                ? 'Module mistakes'
                : 'Race mistakes'}
            </div>
          </div>

          <button class="btn ghost compact"
            onclick="renameChapter('${kind}','${c.id}')">
            Rename chapter
          </button>
        </div>

        <div id="chapterQuestions"></div>
      `;

      renderQuestions(kind);
      return;
    }
  }

  // CHAPTER LIST

  host.innerHTML = `
    <div class="panel-head">
      <div>
        <h3>${activeSubject} chapters</h3>
        <div class="small">
          ${chapters.length} chapters added
        </div>
      </div>
    </div>

    <div class="chapter-add">
      <input id="newChapterName"
        placeholder="Enter chapter name">

      <button class="btn primary"
        onclick="newChapter('${kind}')">
        ＋ Add Chapter
      </button>
    </div>

    ${
      chapters.length
      ? `
        <div class="chapter-grid">
          ${chapters.map(c => `
            <button class="chapter"
              onclick="openChapterPage('${kind}','${c.id}')">

              <strong>${esc(c.name)}</strong>

              <small>
                ${
                  kind === 'modules'
                  ? Object.values(c.exercises || {})
                      .reduce((n, a) => n + (a?.length || 0), 0)
                    + (c.questions?.length || 0)
                  : (c.questions || []).length
                }
                mistakes saved · Open chapter →
              </small>

            </button>
          `).join('')}
        </div>
      `
      : `
        <div class="empty">
          <b>No chapters added yet</b>
          Enter a chapter name above to create your first chapter.
        </div>
      `
    }
  `;
}

// ADD CHAPTER

function newChapter(kind) {
  let input = $('newChapterName');
  let name = input?.value.trim();

  if (!name) {
    toast('Please enter a chapter name');
    input?.focus();
    return;
  }

  let c = kind === 'modules'
    ? {
        id: crypto.randomUUID(),
        name,
        exercises: Object.fromEntries(
          moduleExercises.map(n => [n, []])
        )
      }
    : {
        id: crypto.randomUUID(),
        name,
        questions: []
      };

  data[kind][activeSubject].push(c);

  openChapter = c.id;
  openExercise = null;

  save();
  renderChapters(kind);

  toast('Chapter added — choose an exercise');
}

function openChapterPage(kind, id) {
  openChapter = id;
  openExercise = null;
  renderChapters(kind);
}

function openExercisePage(name) {
  openExercise = name;
  renderChapters('modules');
}

function backExercises() {
  openExercise = null;
  renderChapters('modules');
}

function backChapters(kind) {
  openChapter = null;
  openExercise = null;
  renderChapters(kind);
}

// RENAME CHAPTER

function renameChapter(kind, id) {
  let c = data[kind][activeSubject]
    .find(x => x.id === id);

  if (!c) return;

  let n = prompt('New chapter name:', c.name);

  if (n && n.trim()) {
    c.name = n.trim();
    save();
    renderChapters(kind);
  }
}

// INITIALIZE

renderTests();
renderChapterArea('modules');
renderChapterArea('race');
