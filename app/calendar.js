/*
  Zedlab Blender Course: the date calculator.

  Lesson dates are never typed in. They are worked out from the learner's plan:
    - the start date,
    - the lesson days of the week (they can change from a chosen date onwards),
    - the days off (a date, or the same day every year),
    - the days marked "Can't today".
  Lesson N falls on the Nth day, from the start date, that is a lesson day,
  not a day off and not marked "Can't today". Nothing is ever squeezed or skipped.

  Dates are plain calendar days written "YYYY-MM-DD", in the device's own calendar.
  All counting is done on those plain days, so a time zone can never shift a lesson.
*/
(function (root) {
  "use strict";

  var DAY_MS = 86400000;
  var LONGEST_SEARCH_DAYS = 3653; /* ten years: stops a plan with no lesson days from searching for ever */
  var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
    "September", "October", "November", "December"];
  var MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- Plain calendar days ---------- */

  function pad(n, width) { var s = String(n); while (s.length < width) s = "0" + s; return s; }

  function makeKey(year, month, day) { return pad(year, 4) + "-" + pad(month, 2) + "-" + pad(day, 2); }

  function isKey(key) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
    if (!m) return false;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  }

  function toMs(key) {
    if (!isKey(key)) throw new Error("Not a calendar day: " + key);
    var p = key.split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2]);
  }

  function fromMs(ms) {
    var d = new Date(ms);
    return makeKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  function addDays(key, n) { return fromMs(toMs(key) + n * DAY_MS); }
  function weekday(key) { return new Date(toMs(key)).getUTCDay(); }
  function daysBetween(a, b) { return Math.round((toMs(b) - toMs(a)) / DAY_MS); }
  function parts(key) { var p = key.split("-"); return { year: +p[0], month: +p[1], day: +p[2] }; }

  /* Today's date on this device, in its own time zone. */
  function todayKey(date) {
    var d = date || new Date();
    return makeKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }

  /* "Thursday 5 November 2026" */
  function formatLong(key) {
    var p = parts(key);
    return WEEKDAYS[weekday(key)] + " " + p.day + " " + MONTHS[p.month - 1] + " " + p.year;
  }
  /* "Thursday 5 November" */
  function formatNoYear(key) {
    var p = parts(key);
    return WEEKDAYS[weekday(key)] + " " + p.day + " " + MONTHS[p.month - 1];
  }
  /* "Thu 5 Nov" */
  function formatShort(key) {
    var p = parts(key);
    return WEEKDAYS_SHORT[weekday(key)] + " " + p.day + " " + MONTHS_SHORT[p.month - 1];
  }
  /* "Monday, Wednesday and Friday" */
  function formatDays(days) {
    var names = sortDays(days).map(function (d) { return WEEKDAYS[d]; });
    if (names.length <= 1) return names.join("");
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }
  /* Monday first, Sunday last, as a week reads. */
  function sortDays(days) {
    return days.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); });
  }

  /* ---------- The learner's plan ---------- */

  function copy(x) { return JSON.parse(JSON.stringify(x)); }

  /*
    A plan looks like this:
    {
      startDate: "2026-11-02",
      lessonCount: 29,
      lessonDayPlan: [ { from: "2026-11-02", days: [1, 2, 3, 4, 5] } ],   0 = Sunday ... 6 = Saturday
      daysOff: [ { month: 12, day: 9, name: "Independence Day" },   the same day every year
                 { date: "2026-11-20", name: "" } ],               one date
      missed: [ "2026-11-03" ],                                    days marked "Can't today"
      changes: [ ... ]                                             the changes log
    }
  */
  function newPlan(options) {
    var o = options || {};
    var start = o.startDate;
    return {
      startDate: start,
      lessonCount: o.lessonCount || 29,
      lessonDayPlan: [{ from: start, days: sortDays(o.lessonDays || [1, 2, 3, 4, 5]) }],
      daysOff: copy(o.daysOff || []),
      missed: [],
      changes: []
    };
  }

  function lessonDaysOn(plan, key) {
    var periods = plan.lessonDayPlan || [];
    var active = periods[0];
    for (var i = 0; i < periods.length; i++) if (periods[i].from <= key) active = periods[i];
    return active ? active.days : [];
  }

  function isLessonWeekday(plan, key) { return lessonDaysOn(plan, key).indexOf(weekday(key)) >= 0; }

  function dayOffOn(plan, key) {
    var p = parts(key), list = plan.daysOff || [];
    for (var i = 0; i < list.length; i++) {
      var d = list[i];
      if (d.date ? d.date === key : (d.month === p.month && d.day === p.day)) return d;
    }
    return null;
  }

  function isMissed(plan, key) { return (plan.missed || []).indexOf(key) >= 0; }

  /* ---------- The schedule ---------- */

  function schedule(plan) {
    var count = plan.lessonCount || 29, lessons = [], key = plan.startDate;
    if (!isKey(key)) return { lessons: [], finishDate: null, problem: "There is no start date yet." };
    for (var i = 0; lessons.length < count && i < LONGEST_SEARCH_DAYS; i++, key = addDays(key, 1)) {
      if (isLessonWeekday(plan, key) && !dayOffOn(plan, key) && !isMissed(plan, key)) {
        lessons.push({ number: lessons.length + 1, date: key });
      }
    }
    if (lessons.length < count) {
      return { lessons: lessons, finishDate: null, problem: "There are no lesson days to put the lessons on. Choose at least one lesson day." };
    }
    return { lessons: lessons, finishDate: lessons[count - 1].date, problem: null };
  }

  function dateOf(sched, number) {
    var l = sched.lessons[number - 1];
    return l ? l.date : null;
  }

  function lessonOn(sched, key) {
    for (var i = 0; i < sched.lessons.length; i++) if (sched.lessons[i].date === key) return sched.lessons[i].number;
    return null;
  }

  /* Everything the calendar screen needs to know about one day. */
  function dayInfo(plan, sched, key) {
    var off = dayOffOn(plan, key);
    return {
      date: key,
      lesson: lessonOn(sched, key),
      isLessonWeekday: isLessonWeekday(plan, key),
      dayOff: off ? (off.name || "Day off") : null,
      missed: isMissed(plan, key),
      beforeStart: key < plan.startDate,
      afterFinish: sched.finishDate ? key > sched.finishDate : false
    };
  }

  /* The first lesson on or after a day: the lesson to show on Today. */
  function nextLessonFrom(sched, key) {
    for (var i = 0; i < sched.lessons.length; i++) if (sched.lessons[i].date >= key) return sched.lessons[i];
    return null;
  }

  /* ---------- Weeks follow the lessons ---------- */

  function weekOf(number, weeks) {
    for (var i = 0; i < (weeks || []).length; i++) {
      var w = weeks[i];
      if (number >= w.firstLesson && number <= w.lastLesson) return { week: w.week, day: number - w.firstLesson + 1 };
    }
    return null;
  }

  function lessonLabel(number, weeks) {
    var w = weekOf(number, weeks);
    return w ? "Week " + w.week + ", day " + w.day : "Lesson " + number;
  }

  /* ---------- Changes, each with a dated line for the changes log ---------- */

  function finishPart(before, after) {
    if (before === after) return "The finish date stays " + formatLong(after) + ".";
    return "Finish date: " + formatLong(before) + " becomes " + formatLong(after) + ".";
  }

  function firstMoved(beforeSched, afterSched) {
    for (var i = 0; i < beforeSched.lessons.length; i++) {
      var a = beforeSched.lessons[i], b = afterSched.lessons[i];
      if (!b || a.date !== b.date) return { number: a.number, from: a.date, to: b ? b.date : null };
    }
    return null;
  }

  function record(plan, change) {
    plan.changes = (plan.changes || []).concat([change]);
    return change;
  }

  /* "Can't today": that day is missed, and every later lesson moves one lesson day. */
  function markMissed(planIn, dayKey, todayKeyValue, weeks) {
    var plan = copy(planIn), before = schedule(plan), lesson = lessonOn(before, dayKey);
    if (!lesson || isMissed(plan, dayKey)) return { plan: planIn, change: null };
    plan.missed = (plan.missed || []).concat([dayKey]).sort();
    var after = schedule(plan), to = dateOf(after, lesson), label = lessonLabel(lesson, weeks);
    var change = record(plan, {
      on: todayKeyValue, kind: "missed", day: dayKey, lesson: lesson, from: dayKey, to: to,
      finishBefore: before.finishDate, finishAfter: after.finishDate,
      text: formatLong(todayKeyValue) + ": " + (dayKey === todayKeyValue ? "" : formatNoYear(dayKey) + " ") + "marked “Can't today”. " + label +
        " moves from " + formatNoYear(dayKey) + " to " + formatNoYear(to) +
        ". Every later lesson moves one lesson day. Nothing is squeezed. " + finishPart(before.finishDate, after.finishDate),
      kindMessage: "No problem. " + label + " is now on " + formatNoYear(to) +
        ", and everything after it moves along. Your course now finishes on " + formatLong(after.finishDate) + "."
    });
    return { plan: plan, change: change };
  }

  /*
    A lesson whose day has passed without "I did it" or "Can't today".
    Every lesson day from that lesson's date up to yesterday counts as missed,
    so the lesson lands on the next lesson day from today. Nothing is squeezed.
  */
  function catchUp(planIn, lessonNumber, todayKeyValue, weeks) {
    var plan = copy(planIn), before = schedule(plan), from = dateOf(before, lessonNumber);
    if (!from || from >= todayKeyValue) return { plan: planIn, change: null };
    plan.missed = (plan.missed || []).slice();
    for (var d = from; d < todayKeyValue; d = addDays(d, 1)) {
      if (lessonOn(before, d) && plan.missed.indexOf(d) < 0) plan.missed.push(d);
    }
    plan.missed.sort();
    var after = schedule(plan), to = dateOf(after, lessonNumber), label = lessonLabel(lessonNumber, weeks);
    var change = record(plan, {
      on: todayKeyValue, kind: "catch up", day: from, lesson: lessonNumber, from: from, to: to,
      finishBefore: before.finishDate, finishAfter: after.finishDate,
      text: formatLong(todayKeyValue) + ": " + label + " was not ticked on " + formatNoYear(from) + ", so it moves to " +
        formatNoYear(to) + ". Every later lesson moves along. Nothing is squeezed. " + finishPart(before.finishDate, after.finishDate),
      kindMessage: "No problem. " + label + " is now " + (to === todayKeyValue ? "today" : "on " + formatNoYear(to)) +
        ", and everything after it moves along. Your course now finishes on " + formatLong(after.finishDate) + "."
    });
    return { plan: plan, change: change };
  }

  /* A new day off. Lessons on or after it move along; earlier lessons keep their dates. */
  function addDayOff(planIn, dayOff, todayKeyValue, weeks) {
    var plan = copy(planIn), before = schedule(plan);
    plan.daysOff = (plan.daysOff || []).concat([copy(dayOff)]);
    var after = schedule(plan), moved = firstMoved(before, after);
    var what = dayOff.date ? formatLong(dayOff.date) : dayOff.day + " " + MONTHS[dayOff.month - 1] + ", every year";
    var change = record(plan, {
      on: todayKeyValue, kind: "day off", day: dayOff.date || null,
      lesson: moved ? moved.number : null, from: moved ? moved.from : null, to: moved ? moved.to : null,
      finishBefore: before.finishDate, finishAfter: after.finishDate,
      text: formatLong(todayKeyValue) + ": day off added, " + what + (dayOff.name ? " (" + dayOff.name + ")" : "") + ". " +
        (moved ? lessonLabel(moved.number, weeks) + " moves from " + formatNoYear(moved.from) + " to " + formatNoYear(moved.to) +
          ". Every later lesson moves along. Nothing is squeezed. " : "No lesson moves. ") +
        finishPart(before.finishDate, after.finishDate)
    });
    return { plan: plan, change: change };
  }

  /* A day off taken away again. Lessons on or after it can move earlier; earlier lessons keep their dates. */
  function removeDayOff(planIn, index, todayKeyValue, weeks) {
    const plan = copy(planIn), before = schedule(plan), d = (plan.daysOff || [])[index];
    if (!d) return { plan: planIn, change: null };
    plan.daysOff.splice(index, 1);
    const after = schedule(plan), moved = firstMoved(before, after);
    const what = d.date ? formatLong(d.date) : d.day + " " + MONTHS[d.month - 1] + ", every year";
    const change = record(plan, {
      on: todayKeyValue, kind: "day off removed", day: d.date || null,
      lesson: moved ? moved.number : null, from: moved ? moved.from : null, to: moved ? moved.to : null,
      finishBefore: before.finishDate, finishAfter: after.finishDate,
      text: formatLong(todayKeyValue) + ": day off removed, " + what + (d.name ? " (" + d.name + ")" : "") + ". " +
        (moved ? lessonLabel(moved.number, weeks) + " moves from " + formatNoYear(moved.from) + " to " + formatNoYear(moved.to) +
          ". Every later lesson moves along. Nothing is skipped. " : "No lesson moves. ") +
        finishPart(before.finishDate, after.finishDate)
    });
    return { plan: plan, change: change };
  }

  /* A new start date, before the course has really begun. The lesson days stay the same. */
  function setStartDate(planIn, newStart, todayKeyValue, weeks) {
    if (!isKey(newStart) || newStart === planIn.startDate) return { plan: planIn, change: null };
    const plan = copy(planIn), before = schedule(plan);
    const periods = plan.lessonDayPlan || [];
    const days = periods.length ? periods[periods.length - 1].days : [1, 2, 3, 4, 5];
    plan.startDate = newStart;
    plan.lessonDayPlan = [{ from: newStart, days: sortDays(days) }];
    plan.missed = (plan.missed || []).filter((k) => k >= newStart);
    const after = schedule(plan);
    const change = record(plan, {
      on: todayKeyValue, kind: "start date", day: newStart, lesson: 1,
      from: before.lessons.length ? before.lessons[0].date : null, to: after.lessons.length ? after.lessons[0].date : null,
      finishBefore: before.finishDate, finishAfter: after.finishDate,
      text: formatLong(todayKeyValue) + ": start date changed to " + formatLong(newStart) + ". " +
        (after.lessons.length ? lessonLabel(1, weeks) + " is now on " + formatNoYear(after.lessons[0].date) + ". " : "") +
        (after.finishDate ? finishPart(before.finishDate, after.finishDate) : after.problem)
    });
    return { plan: plan, change: change };
  }

  /* New lesson days from a chosen date onwards. Lessons before that date keep their dates. */
  function setLessonDays(planIn, days, fromKey, todayKeyValue, weeks) {
    var plan = copy(planIn), before = schedule(plan), from = fromKey < plan.startDate ? plan.startDate : fromKey;
    plan.lessonDayPlan = (plan.lessonDayPlan || []).filter(function (p) { return p.from < from; })
      .concat([{ from: from, days: sortDays(days) }]);
    var after = schedule(plan), moved = firstMoved(before, after);
    var change = record(plan, {
      on: todayKeyValue, kind: "lesson days", day: from, days: sortDays(days),
      lesson: moved ? moved.number : null, from: moved ? moved.from : null, to: moved ? moved.to : null,
      finishBefore: before.finishDate, finishAfter: after.finishDate,
      text: formatLong(todayKeyValue) + ": from " + formatLong(from) + ", " +
        (days.length ? "lessons are on " + formatDays(days) + ". " : "no lesson days are chosen. ") +
        "Lessons before that keep their dates. " +
        (!after.finishDate ? after.problem :
          (moved ? lessonLabel(moved.number, weeks) + " moves from " + formatNoYear(moved.from) + " to " + formatNoYear(moved.to) + ". " : "No lesson moves. ") +
          finishPart(before.finishDate, after.finishDate))
    });
    return { plan: plan, change: change };
  }

  var api = {
    WEEKDAYS: WEEKDAYS, MONTHS: MONTHS,
    isKey: isKey, makeKey: makeKey, addDays: addDays, weekday: weekday, daysBetween: daysBetween, todayKey: todayKey,
    formatLong: formatLong, formatNoYear: formatNoYear, formatShort: formatShort, formatDays: formatDays,
    newPlan: newPlan, schedule: schedule, dateOf: dateOf, lessonOn: lessonOn, dayInfo: dayInfo, nextLessonFrom: nextLessonFrom,
    isLessonWeekday: isLessonWeekday, dayOffOn: dayOffOn, isMissed: isMissed, lessonDaysOn: lessonDaysOn,
    weekOf: weekOf, lessonLabel: lessonLabel,
    markMissed: markMissed, catchUp: catchUp, addDayOff: addDayOff, removeDayOff: removeDayOff, setStartDate: setStartDate, setLessonDays: setLessonDays
  };

  root.CourseCalendar = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : this);
