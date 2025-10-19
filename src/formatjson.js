import { eachDayOfInterval, format, isWithinInterval } from "date-fns";
import jsonexport from "jsonexport/dist";

const jsonToCSV = (json) =>
  new Promise((resolve, reject) => {
    jsonexport(json, function (err, csv) {
      if (err) return reject(err);

      resolve(csv);
    });
  });

export const formatFloJson = (data) => {
  const cycles = data.operationalData.cycles;
  const moodEvents = data.operationalData.point_events_manual_v2.filter(
    (event) => event.category === "Mood"
  );

  // sort in descending order, to ensure the intervals logic works
  cycles.sort((a, b) => {
    const aD = new Date(a.period_start_date);
    const bD = new Date(b.period_start_date);

    return bD.getTime() - aD.getTime();
  });

  const endDate = new Date(cycles[0].period_end_date);
  const startDate = new Date(cycles[cycles.length - 1].period_start_date);
  const interval = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });
  const parsedData = interval.map((date) => {
    const isInInterval = cycles.find(({ period_start_date, period_end_date }) =>
      isWithinInterval(date, {
        start: new Date(period_start_date),
        end: new Date(period_end_date),
      })
    );

    const moodEvent = moodEvents.find(
      (event) => new Date(event.date).toDateString() === date.toDateString()
    );

    const symptomEvents = data.operationalData.point_events_manual_v2.filter(
      (event) =>
        event.category === "Symptom" &&
        new Date(event.date).toDateString() === date.toDateString()
    );

    const symptomFields =
      symptomEvents.length > 0
        ? {
            "pain.other": symptomEvents.some(
              (event) => !(event.subcategory in symptomMapping)
            )
              ? "true"
              : undefined,
            "pain.note": symptomEvents
              .filter((event) => !(event.subcategory in symptomMapping))
              .map((event) => event.subcategory)
              .join(", "),
            ...Object.fromEntries(
              symptomEvents
                .filter((event) => event.subcategory in symptomMapping)
                .map((event) => [symptomMapping[event.subcategory], "true"])
            ),
          }
        : {};

    const sexEvent = data.operationalData.point_events_manual_v2.find(
      (event) =>
        event.category === "Sex" &&
        new Date(event.date).toDateString() === date.toDateString()
    );

    const sexFields = sexEvent
      ? sexEvent.subcategory in sexMapping
        ? sexMapping[sexEvent.subcategory]
        : {}
      : {};

    const moodFields = moodEvent
      ? moodEvent.subcategory in moodMapping
        ? { [moodMapping[moodEvent.subcategory]]: "true" }
        : {
            "mood.other": "true",
            "mood.note": moodEvent.subcategory,
          }
      : {};

    return {
      date: format(new Date(date), "yyyy-MM-dd"),
      ...initialExtraFields,
      "bleeding.value": isInInterval ? "2" : "",
      "bleeding.exclude": isInInterval ? "FALSE" : "",
      ...extraFields,
      ...sexFields,
      ...symptomFields,
      ...moodFields,
    };
  });

  return jsonToCSV(parsedData);
};

const initialExtraFields = {
  "temperature.value": "",
  "temperature.exclude": "",
  "temperature.time": "",
  "temperature.note": "",
};
const extraFields = {
  "mucus.feeling": "",
  "mucus.texture": "",
  "mucus.value": "",
  "mucus.exclude": "",
  "cervix.opening": "",
  "cervix.firmness": "",
  "cervix.position": "",
  "cervix.exclude": "",
  "note.value": "",
  "desire.value": "",
  "sex.solo": "",
  "sex.partner": "",
  "sex.condom": "",
  "sex.pill": "",
  "sex.iud": "",
  "sex.patch": "",
  "sex.ring": "",
  "sex.implant": "",
  "sex.diaphragm": "",
  "sex.none": "",
  "sex.other": "",
  "sex.note": "",
  "pain.cramps": "",
  "pain.ovulationPain": "",
  "pain.headache": "",
  "pain.backache": "",
  "pain.nausea": "",
  "pain.tenderBreasts": "",
  "pain.migraine": "",
  "pain.other": "",
  "pain.note": "",
  "mood.happy": "",
  "mood.sad": "",
  "mood.stressed": "",
  "mood.balanced": "",
  "mood.fine": "",
  "mood.anxious": "",
  "mood.energetic": "",
  "mood.fatigue": "",
  "mood.angry": "",
  "mood.other": "",
  "mood.note": "",
};

const sexMapping = {
  Protected: { "sex.partner": "true", "sex.condom": "true" },
  Masturbation: { "sex.solo": "true"},
  "High Sex Drive": { "desire.value": "2" },
};

const symptomMapping = {
  Cramps: "pain.cramps",
  OvulationPain: "pain.ovulationPain",
  Headache: "pain.headache",
  Backache: "pain.backache",
  Nausea: "pain.nausea",
  TenderBreasts: "pain.tenderBreasts",
  Migraine: "pain.migraine",
};

const moodMapping = {
  Happy: "mood.happy",
  Neutral: "mood.fine",
  Sad: "mood.sad",
  Stressed: "mood.stressed",
  Balanced: "mood.balanced",
  Anxious: "mood.anxious",
  Energetic: "mood.energetic",
  Fatigue: "mood.fatigue",
  Angry: "mood.angry",
};
