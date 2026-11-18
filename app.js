/* Croxtons Menu Quiz — vanilla JS, no storage. */
(function () {
  "use strict";

  var QUIZ_LEN = 15;
  var PASS_MARK = 12;
  var RESULTS_ENDPOINT = "https://docs.google.com/forms/d/e/1FAIpQLScE0-X3keDST6MxyQ1Hmfv1VssaoWlj_64Vx2j-WIlPy5_zkg/formResponse";
  var FORM_FIELDS = {
    submittedAt: "entry.808055777",
    staffName: "entry.1402678951",
    score: "entry.967675639",
    total: "entry.1670993805",
    percentage: "entry.382727236",
    passMark: "entry.1389539061",
    passed: "entry.467748054",
    attemptId: "entry.594628041",
    questionIds: "entry.875384694",
    questions: "entry.1097999506",
    selectedAnswers: "entry.410448547",
    correctAnswers: "entry.1738318072"
  };

  var screens = {
    intro: document.getElementById("screen-intro"),
    quiz: document.getElementById("screen-quiz"),
    results: document.getElementById("screen-results")
  };

  var els = {
    startForm: document.getElementById("start-form"),
    staffName: document.getElementById("staff-name"),
    nameError: document.getElementById("name-error"),
    btnStart: document.getElementById("btn-start"),
    btnNext: document.getElementById("btn-next"),
    btnRetry: document.getElementById("btn-retry"),
    btnReview: document.getElementById("btn-toggle-review"),
    stepLabel: document.getElementById("step-label"),
    scorePill: document.getElementById("score-pill"),
    progressFill: document.getElementById("progress-fill"),
    qtext: document.getElementById("qtext"),
    options: document.getElementById("options"),
    scoreNum: document.getElementById("score-num"),
    scorePct: document.getElementById("score-pct"),
    resultMsg: document.getElementById("result-msg"),
    resultEyebrow: document.getElementById("result-eyebrow"),
    review: document.getElementById("review"),
    submitStatus: document.getElementById("submit-status")
  };

  // State
  var state = null;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("hidden", k !== name);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  function buildAttempt() {
    var pool = shuffle(QUESTIONS).slice(0, QUIZ_LEN);
    var items = pool.map(function (q) {
      // Take first 3 distractors max → 4 options total
      var opts = q.opts.slice(0, 3);
      var all = shuffle(opts.concat([q.a]));
      return {
        id: q.id,
        q: q.q,
        correct: q.a,
        options: all,
        chosen: null
      };
    });
    return {
      items: items,
      i: 0,
      score: 0,
      staffName: "",
      attemptId: makeAttemptId()
    };
  }

  function makeAttemptId() {
    return "crox-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function renderQuestion() {
    var item = state.items[state.i];
    els.qtext.textContent = item.q;
    els.stepLabel.textContent = "Question " + (state.i + 1) + " of " + QUIZ_LEN;
    els.scorePill.textContent = state.score + " correct";
    els.progressFill.style.width = ((state.i) / QUIZ_LEN * 100) + "%";

    els.options.innerHTML = "";
    var letters = ["A", "B", "C", "D"];
    item.options.forEach(function (opt, idx) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", item.chosen === opt ? "true" : "false");
      btn.setAttribute("data-testid", "button-option-" + idx);
      if (item.chosen === opt) btn.classList.add("selected");
      btn.innerHTML =
        '<span class="marker">' + letters[idx] + '</span>' +
        '<span class="label"></span>';
      btn.querySelector(".label").textContent = opt;
      btn.addEventListener("click", function () { onSelect(opt); });
      li.appendChild(btn);
      els.options.appendChild(li);
    });

    els.btnNext.disabled = item.chosen == null;
    els.btnNext.textContent = (state.i === QUIZ_LEN - 1) ? "Finish" : "Next";
  }

  function onSelect(opt) {
    var item = state.items[state.i];
    item.chosen = opt;
    // Re-render selection state
    var btns = els.options.querySelectorAll(".option");
    btns.forEach(function (btn) {
      var label = btn.querySelector(".label").textContent;
      var isSel = label === opt;
      btn.classList.toggle("selected", isSel);
      btn.setAttribute("aria-checked", isSel ? "true" : "false");
    });
    els.btnNext.disabled = false;
  }

  function onNext() {
    var item = state.items[state.i];
    if (item.chosen == null) return;
    if (item.chosen === item.correct) state.score++;
    if (state.i < QUIZ_LEN - 1) {
      state.i++;
      renderQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    var pct = Math.round((state.score / QUIZ_LEN) * 100);
    els.scoreNum.textContent = state.score;
    els.scorePct.textContent = pct + "%";

    var eyebrow, msg;
    if (state.score === 15) {
      eyebrow = "Top of the section";
      msg = "Perfect score. You know this menu cold — get on the floor.";
    } else if (state.score >= 13) {
      eyebrow = "Strong";
      msg = "Confident menu knowledge. A quick refresh on the misses and you’re ready.";
    } else if (state.score >= 12) {
      eyebrow = "Pass";
      msg = "Solid pass. Skim the review below for the ones you missed.";
    } else if (state.score >= 9) {
      eyebrow = "Almost there";
      msg = "Close to passing. Read through the review and try another set.";
    } else if (state.score >= 6) {
      eyebrow = "Needs another look";
      msg = "Take 10 minutes with the menu, then re-run the quiz before service.";
    } else {
      eyebrow = "Back to the menu";
      msg = "Have another read of the menu sheets, then come back. Don’t guess on the floor.";
    }
    els.resultEyebrow.textContent = eyebrow;
    els.resultMsg.textContent = msg;

    renderReview();
    els.review.classList.add("hidden");
    els.btnReview.textContent = "Review answers";
    show("results");
    submitResults(pct);
  }

  function buildResultPayload(pct) {
    var questions = [];
    var questionIds = [];
    var selected = [];
    var correct = [];

    state.items.forEach(function (item) {
      questionIds.push(item.id || "");
      questions.push(item.q);
      selected.push(item.chosen || "");
      correct.push(item.correct);
    });

    return {
      submittedAt: new Date().toISOString(),
      staffName: state.staffName,
      score: state.score,
      total: QUIZ_LEN,
      percentage: pct,
      passMark: PASS_MARK,
      passed: state.score >= PASS_MARK ? "Yes" : "No",
      attemptId: state.attemptId,
      questionIds: questionIds.join(" | "),
      questions: questions.join(" | "),
      selectedAnswers: selected.join(" | "),
      correctAnswers: correct.join(" | ")
    };
  }

  function submitResults(pct) {
    if (!RESULTS_ENDPOINT) {
      els.submitStatus.textContent = "Result not sent yet — tracking is not connected.";
      els.submitStatus.className = "submit-status warning";
      return;
    }

    els.submitStatus.textContent = "Sending result...";
    els.submitStatus.className = "submit-status";
    var payload = buildResultPayload(pct);
    var body = new URLSearchParams();

    Object.keys(FORM_FIELDS).forEach(function (key) {
      body.append(FORM_FIELDS[key], String(payload[key] == null ? "" : payload[key]));
    });

    fetch(RESULTS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: body
    }).then(function () {
      els.submitStatus.textContent = "Result sent for " + state.staffName + ".";
      els.submitStatus.className = "submit-status success";
    }).catch(function () {
      els.submitStatus.textContent = "Could not send result. Please tell a manager before closing this page.";
      els.submitStatus.className = "submit-status error";
    });
  }

  function renderReview() {
    els.review.innerHTML = "";
    state.items.forEach(function (item, idx) {
      var li = document.createElement("li");
      var correct = item.chosen === item.correct;
      li.className = "review-item" + (correct ? "" : " wrong");

      var q = document.createElement("div");
      q.className = "review-q";
      q.textContent = (idx + 1) + ". " + item.q;
      li.appendChild(q);

      if (correct) {
        var row = document.createElement("div");
        row.className = "review-row correct";
        row.innerHTML = '<span>Correct:</span> <strong></strong>';
        row.querySelector("strong").textContent = item.correct;
        li.appendChild(row);
      } else {
        if (item.chosen != null) {
          var your = document.createElement("div");
          your.className = "review-row your-wrong";
          your.innerHTML = '<span>You:</span> <strong></strong>';
          your.querySelector("strong").textContent = item.chosen;
          li.appendChild(your);
        }
        var ans = document.createElement("div");
        ans.className = "review-row correct";
        ans.innerHTML = '<span>Answer:</span> <strong></strong>';
        ans.querySelector("strong").textContent = item.correct;
        li.appendChild(ans);
      }
      els.review.appendChild(li);
    });
  }

  function startNew() {
    state = buildAttempt();
    var name = (els.staffName.value || "").trim().replace(/\s+/g, " ");
    state.staffName = name;
    renderQuestion();
    show("quiz");
  }

  // Wiring
  els.startForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var name = (els.staffName.value || "").trim();
    if (!name) {
      els.nameError.textContent = "Please type your name before starting.";
      els.staffName.focus();
      return;
    }
    els.nameError.textContent = "";
    startNew();
  });
  els.btnRetry.addEventListener("click", startNew);
  els.btnNext.addEventListener("click", onNext);
  els.btnReview.addEventListener("click", function () {
    var hidden = els.review.classList.toggle("hidden");
    els.btnReview.textContent = hidden ? "Review answers" : "Hide review";
    if (!hidden) {
      els.review.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
})();
