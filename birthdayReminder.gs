function getEveryCalendars() {
  CalendarApp.getAllCalendars().forEach((value, idx) => Logger.log("%s: %s", idx, value.getName()));
}

function createBDReminderCalendar(bdCalendarName) {
  let bdCalendar;
  if (CalendarApp.getCalendarsByName(bdCalendarName).length == 0) {
    Logger.log("Adding new calendar %s", bdCalendarName);
    CalendarApp.createCalendar(bdCalendarName);
    bdCalendar = CalendarApp.getCalendarsByName(bdCalendarName)[0];
  } else {
    Logger.log("%s calendar is found", bdCalendarName);
    bdCalendar = CalendarApp.getCalendarsByName(bdCalendarName)[0];
  }
  return bdCalendar;
}

function getBirthdayEvent(start, end) {
  let calendar = CalendarApp.getCalendarsByName('Birthdays')[0];
  let events = calendar.getEvents(start, end);
  return events;
}

function removeDuplicateEventSeries(foundReminders) {
  Logger.log("Removing series");
  foundReminders.forEach(x => {
    if (x.isRecurringEvent()) {
      Logger.log("Removing series: %s", x.getEventSeries().getTitle());
      x.getEventSeries().deleteEventSeries();
    }
  });
}

function checkBDSeries(bdCalendar, eventSeries) {
  var eventId = eventSeries.getId();
  var calId = bdCalendar.getId();
  Logger.log('event title = ' + eventSeries.getTitle());
  var AdvanncedId = eventId.substring(0, eventId.indexOf('@'));
  var testEvent = Calendar.Events.get(calId, AdvanncedId);
  Logger.log('testEvent %s recurrence = %s', (testEvent.recurrence == null) ? "does not have" : "has", testEvent.recurrence);
}

function createBDEventSeries(bdCalendar, reminderName, eventDate, isCreateNew, givenEventSeries) {
  Logger.log("Creating event series: %s", reminderName);
  let recurrence = CalendarApp.newRecurrence().addYearlyRule()
    .addYearlyRule();
  let eventSeries;
  if (isCreateNew) {
    eventSeries = bdCalendar.createAllDayEventSeries(reminderName,
      new Date(eventDate),
      recurrence
    );
  } else if (!isCreateNew && givenEventSeries !== null) {
    Logger.log("Creating Recurring series for: %s", reminderName);
    eventSeries = givenEventSeries.setRecurrence(recurrence, new Date(eventDate));
  } else {
    Logger.log("Not creating any series");
    Logger.log("givenEventseries: %s, Please give the Event series", givenEventSeries);
    return null;
  }
  checkBDSeries(bdCalendar, eventSeries);
  return eventSeries;
}

function setPopupReminder(eventSeries, minsBefore) {
  Logger.log("Setting popup reminder");
  Logger.log("get reminder: %s", eventSeries.getPopupReminders());
  eventSeries.addPopupReminder(minsBefore);
  Logger.log("get reminder: %s", eventSeries.getPopupReminders());
}


function setBirthdayReminder() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 30);
  Logger.log("start time: %s, end time: %s", start, end);

  const POPUPMINSBEFORE = 10;
  const BDCALENDARNAME = 'BirthdayReminder';

  // get all Calendars
  // getEveryCalendars();

  // Create Calendar if not exist
  let bdCalendar = createBDReminderCalendar(BDCALENDARNAME);

  // set yearly reminder
  let events = getBirthdayEvent(start, end);
  let allBDEvents = bdCalendar.getEvents(start, end);

  for(let i = 0; i < events.length; i++){
    Logger.log('The %s event: %s on %s', (i + 1).toFixed(0), events[i].getTitle(), events[i].getAllDayStartDate());
    const reminderName = events[i].getTitle() + ' Reminder';
    let foundReminders = allBDEvents.filter(x => {
      // make regex for brackets
      let regex = x.getTitle().replace(/\(/g,'\\(').replace(/\)/g, '\\)');
      let matched = reminderName.match(regex);
      // Logger.log("Regex: %s", regex);
      // Logger.log("Matched? %s", matched);
      return reminderName.match(regex);
    });

    if (foundReminders.length == 1 && foundReminders[0].getAllDayStartDate().getTime() == events[i].getAllDayStartDate().getTime()) {
      let reminder = foundReminders[0];
      // Logger.log("is this found one recurring? %s", reminder.isRecurringEvent());
      let eventSeries = reminder.getEventSeries();

      if (!reminder.isRecurringEvent()) {
        // set recurring event
        Logger.log("Setting Recurring event");
        eventSeries = createBDEventSeries(bdCalendar, reminderName, events[i].getAllDayStartDate(), false, eventSeries);
      }
      if (eventSeries == null) {
        throw Error("eventSeries is not added");
      }
      if (eventSeries.getPopupReminders() == null || (eventSeries.getPopupReminders() !== null && eventSeries.getPopupReminders().length == 0)) {
        setPopupReminder(eventSeries, POPUPMINSBEFORE);
      }
    } else {
      Logger.log("Remove and create new birthday reminder");
      // if found more than 1, remove them
      if (foundReminders.length > 1 || foundReminders.length > 0 && foundReminders[0].getAllDayStartDate().getTime() != events[i].getAllDayStartDate().getTime()) {
        removeDuplicateEventSeries(foundReminders);
      }
      let eventSeries = createBDEventSeries(bdCalendar, reminderName, events[i].getAllDayStartDate(), true);

      setPopupReminder(eventSeries, POPUPMINSBEFORE);
    }
    Logger.log("---- Done ---- %s: %s ----", (i + 1).toFixed(0), reminderName);
  }
}

function createCalendarOnEventUpdatedTrigger() {
  let userId = Session.getActiveUser().getEmail();
  Logger.log("UserID: %s", userId);
  let trigger = ScriptApp.newTrigger('setBirthdayReminder')
    .forUserCalendar(userId)
    .onEventUpdated()
    .create();
  Logger.log("The trigger created: %s", trigger.getUniqueId());
}

function deleteTrigger(triggerId) {
  // Loop over all triggers.
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    // If the current trigger is the correct one, delete it.
    if (allTriggers[i].getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(allTriggers[i]);
      break;
    }
  }
}

// function main() {
//   let userId = Session.getActiveUser().getEmail();
//   Logger.log("UserID: %s", userId);
//   let trigger = ScriptApp.newTrigger('setBirthdayReminder')
//     .forUserCalendar(userId)
//     .onEventUpdated()
//     .create();
//   Logger.log("The trigger created: %s", trigger.getUniqueId());
//   // let calendar = CalendarApp.getCalendarsByName('Birthdays')[0];
//   // let eventlist = Calendar.Events.list(calendar.getId());
//   // // getNextSyncToken()
//   // let nextSyncToken = eventlist.nextSyncToken;
//   // Logger.log("the event list: %s", JSON.stringify(eventlist, null, 2));
// }