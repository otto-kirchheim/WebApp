import duration from "dayjs/plugin/duration.js";
import { isHoliday } from "../../class/feiertagets/feiertage";
import type { IDaten, IVorgabenU } from "../../interfaces";
import { DatenSortieren, Storage } from "../../utilities";
import dayjs from "../../utilities/configDayjs";

export default function BereitschaftEingabe(
	bereitschaftsAnfang: dayjs.Dayjs,
	bereitschaftsEnde: dayjs.Dayjs,
	nachtAnfang: dayjs.Dayjs,
	nachtEnde: dayjs.Dayjs,
	nacht: boolean,
	daten: IDaten["BZ"]
): IDaten["BZ"] | false {
	console.groupCollapsed("Vorgaben");
	console.log("nacht: " + nacht);
	console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());
	console.log("Bereitschafts Ende: " + bereitschaftsEnde.toDate());
	console.log("Nacht Anfang: " + nachtAnfang.toDate());
	console.log("Nacht Ende: " + nachtEnde.toDate());
	console.groupEnd();

	let bereitschaftsAnfangNacht;
	let bereitschaftsAnfangMerker;
	let bereitschaftsAnfangA;
	let bereitschaftsEndeMerker;
	let bereitschaftsEndeA;
	let bereitschaftsEndeB;
	let arbeitstagHeute;
	let arbeitstagMorgen;
	let pause;
	let pauseMerker;
	let pauseMerkerTag;
	let pauseMerkerNacht;

	const getTimeForDuration = (value: string) => {
		const time = dayjs(value, "HH:mm");
		return { hours: time.hour(), minutes: time.minute() };
	};

	const // Voreinstellungen Übernehmen
		datenU: IVorgabenU = Storage.get("VorgabenU");

	const // Tagschicht Anfangszeit Mo-Do
		tagAnfangsZeitMoDo = dayjs.duration(getTimeForDuration(datenU.aZ.eT));

	const // Tagschicht Anfangszeit Fr
		tagAnfangsZeitFr = dayjs.duration(getTimeForDuration(datenU.aZ.eTF));

	const // Tagschicht Endezeit Mo-Fr
		tagEndeZeitMoFr = dayjs.duration(getTimeForDuration(datenU.aZ.bT));

	const // Feste Variablen
		ruheZeit = 10;

	const tagPausenVorgabe = 30;
	const nachtPausenVorgabe = 45;
	const bereitschaftsZeitraumWechsel = dayjs.duration({ hours: 8 });

	const arbeitsAnfang = [
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		tagEndeZeitMoFr,
		bereitschaftsZeitraumWechsel,
		bereitschaftsZeitraumWechsel,
		tagEndeZeitMoFr,
	];

	const arbeitsEnde = [
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitMoDo,
		tagAnfangsZeitFr,
		bereitschaftsZeitraumWechsel,
		bereitschaftsZeitraumWechsel,
		tagAnfangsZeitMoDo,
	];

	const pausenTag = [0, tagPausenVorgabe, tagPausenVorgabe, tagPausenVorgabe, tagPausenVorgabe, 0, 0, 0];

	const B2 = (
		bereitschaftsAnfang: dayjs.Dayjs,
		nachtAnfang: dayjs.Dayjs,
		arbeitsAnfang: duration.Duration[],
		arbeitstagHeute: boolean,
		arbeitstagMorgen: boolean,
		nacht: boolean
	): dayjs.Dayjs => {
		console.group("B2");
		let merker: dayjs.Dayjs | undefined;
		const tagBereitschaftsAnfang = bereitschaftsAnfang.day();
		console.log(`Wochentag Bereitschafts Anfang: ${tagBereitschaftsAnfang} --- ${bereitschaftsAnfang.format("dd")}`);
		// neues Ende 2,
		// am nächsten Tag,
		// Begin normale Schicht bzw. neuer Bereitschaftszyklus
		if (!bereitschaftsAnfang.isSame(nachtAnfang, "d")) {
			if (arbeitstagMorgen === true) {
				merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(arbeitsAnfang[tagBereitschaftsAnfang]);
			} else {
				merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(bereitschaftsZeitraumWechsel);
			}

			console.log(`Merker B2.1: ${merker.toDate()}`);
		}
		// Wie oben, aber:
		// 2x Ende am gleichen Tag
		if (bereitschaftsAnfang.isSame(nachtAnfang, "d") || nacht === false) {
			if (arbeitstagHeute === true) {
				merker = bereitschaftsAnfang
					.startOf("d")
					.add(arbeitsAnfang[tagBereitschaftsAnfang === 0 ? 6 : tagBereitschaftsAnfang - 1]);
			} else {
				merker = bereitschaftsAnfang.startOf("d").add(bereitschaftsZeitraumWechsel);
			}

			console.log(`Merker B2.2: ${merker.toDate()}`);
		}
		// Wie oben, aber:
		// wenn merker kleiner/gleich Bereitschafts Anfang -> am nächsten Tag
		if (merker?.isSameOrBefore(bereitschaftsAnfang)) {
			if (arbeitstagMorgen === true) {
				merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(arbeitsAnfang[tagBereitschaftsAnfang]);
			} else {
				merker = bereitschaftsAnfang.add(1, "d").startOf("d").add(bereitschaftsZeitraumWechsel);
			}

			console.log(`Merker B2.3: ${merker.toDate()}`);
		}
		console.groupEnd();
		return merker as dayjs.Dayjs;
	};

	const Arbeitstag = (datum: dayjs.Dayjs, zusatz = 0) => {
		datum = datum.add(zusatz, "d");
		const feiertag = isHoliday(datum.toDate(), "HE");
		return !(feiertag || datum.isoWeekday() > 5);
	};

	// Berechne ob Tag ein Arbeitstag ist
	arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
	console.log(`Arbeitstag Heute: ${arbeitstagHeute} --- ${bereitschaftsAnfang.format("dd")}`);
	arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
	console.log(`Arbeitstag Morgen: ${arbeitstagMorgen} --- ${bereitschaftsAnfang.add(1, "d").format("dd")}`);

	// Sonstige Variablen Vorbereiten
	bereitschaftsEndeMerker = bereitschaftsAnfang.clone();

	const datenVorher = daten.length;

	/// --- Beginn Berechnung --- ///
	while (daten.length < 26 && bereitschaftsAnfang.isBefore(bereitschaftsEnde)) {
		/// #Berechnung Bereitschaftsende# ///
		console.groupCollapsed("Bereitschafts Ende");
		// neues Ende Arbeitszeit
		bereitschaftsEndeA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsAnfang, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

		// neues Ende Bereitschaftszyklus
		bereitschaftsEndeB = bereitschaftsAnfang.add(1, "d").hour(8).minute(0);
		console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);
		console.groupEnd();

		// überprüfe welches Bereitschaftsende Zutrifft
		bereitschaftsEndeMerker = dayjs.min(bereitschaftsEndeA, bereitschaftsEndeB, nachtAnfang, bereitschaftsEnde);
		console.log(`Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`);

		/// #Berechnung Bereitschaftsanfang# ///
		console.groupCollapsed("Bereitschafts Anfang");

		// neuer Bereitschaftsanfang Nacht
		bereitschaftsAnfangNacht = nachtAnfang.add(1, "d").hour(nachtEnde.hour()).minute(nachtEnde.minute());
		console.log(`Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht.toDate()}`);

		// neues Ende 2, Arbeitszeit
		bereitschaftsAnfangA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsEnde, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Anfang A: ${bereitschaftsAnfangA.toDate()}`);
		console.groupEnd();

		bereitschaftsAnfangMerker = bereitschaftsAnfang.isSame(bereitschaftsEndeMerker, "d")
			? dayjs.min(bereitschaftsAnfangNacht, bereitschaftsAnfangA, bereitschaftsEndeB)
			: dayjs.min(dayjs.max(bereitschaftsAnfangA, bereitschaftsEndeB), bereitschaftsAnfangNacht);

		console.log(`Bereitschafts Anfang Merker: ${bereitschaftsAnfangMerker.toDate()}`);

		/// #Berechnung Pause# ///
		console.groupCollapsed("Berechnung Pause");

		// Pause Tagschicht, Falls keine Pause oder nach Nachtschicht, dann ""
		pauseMerker = bereitschaftsAnfang.startOf("d").add(tagAnfangsZeitMoDo);
		if (pause === nachtPausenVorgabe) {
			pause = 0;
		} else {
			pause = bereitschaftsAnfang.isSame(pauseMerker) ? pausenTag[bereitschaftsAnfang.day()] : 0;
		}

		// Pause Nachtschicht, normal und bei Ruhe nach Nacht
		pauseMerkerNacht = bereitschaftsAnfang.hour(nachtEnde.hour()).minute(nachtEnde.minute());
		pauseMerkerTag = pauseMerker.hour(nachtEnde.hour()).add(ruheZeit, "h").minute(nachtEnde.minute());
		if (bereitschaftsAnfang.isSame(pauseMerkerNacht) || bereitschaftsAnfang.isSame(pauseMerkerTag)) {
			pause = nachtPausenVorgabe;
		}
		console.groupEnd();
		console.log(`Pausen Zeit: ${pause}`);

		console.log(
			`Eingabe Tabelle: ${bereitschaftsAnfang.format("L, LT")} --- ${bereitschaftsEndeMerker.format("L, LT")} --- ${pause}`
		);

		/// #Prüfen ob Daten bereits vorhanden# ///
		const newDaten: IDaten["BZ"][0] = {
			beginB: bereitschaftsAnfang.toISOString(),
			endeB: bereitschaftsEndeMerker.toISOString(),
			pauseB: pause,
		};

		if (!daten.some(row => JSON.stringify(row) === JSON.stringify(newDaten))) {
			daten.push(newDaten);
		} else {
			console.log("Bereitschaftszeitraum bereits vorhanden");
		}
		console.group("Übernehme Daten neuer Tag");

		/// #Übernehme Daten für nächsten Tag# ///
		// neuen Bereitschaftsanfang übernehmen
		bereitschaftsAnfang = bereitschaftsAnfangMerker.clone();
		console.log("Bereitschafts Anfang: " + bereitschaftsAnfang.toDate());

		// neuen Nachtschichtanfang setzten, Wenn kleiner als Bereitschaftsanfang
		if (bereitschaftsAnfang.isAfter(nachtAnfang)) {
			nachtAnfang = nachtAnfang.add(1, "d");
		}
		console.log(`Nacht Anfang: ${nachtAnfang.toDate()}`);
		if (nachtAnfang.isAfter(nachtEnde) && !nachtAnfang.isSame(bereitschaftsEnde)) {
			nachtAnfang = bereitschaftsEnde.clone();
			nacht = false;
		}
		console.log(`Nacht: ${nacht}`);

		// Berechne ob Tag ein Arbeitstag ist
		arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
		console.log(`Arbeitstag Heute: ${arbeitstagHeute} --- ${bereitschaftsAnfang.format("dd")}`);
		arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
		console.log(`Arbeitstag Morgen: ${arbeitstagMorgen} --- ${bereitschaftsAnfang.add(1, "d").format("dd")}`);
		console.groupEnd();

		if (!nacht) continue;
		if (!bereitschaftsAnfang.isSame(nachtAnfang, "d")) continue;
		if (bereitschaftsAnfang.isSame(nachtAnfang, "d") && bereitschaftsAnfang.isSame(bereitschaftsAnfangA)) continue;
		/// #Berechnung ob Ruhe nach Nacht am Sonntag & Feiertage# ///
		console.group("Prüfen ob Ruhe nach Nacht:");

		// neues Ende Arbeitszeit
		bereitschaftsEndeA = B2(bereitschaftsAnfang, nachtAnfang, arbeitsAnfang, arbeitstagHeute, arbeitstagMorgen, nacht);
		console.log(`Bereitschafts Ende A: ${bereitschaftsEndeA.toDate()}`);

		// neues Ende Bereitschaftszyklus
		bereitschaftsEndeB = bereitschaftsAnfang.add(1, "d").startOf("d").add(bereitschaftsZeitraumWechsel);
		console.log(`Bereitschafts Ende B: ${bereitschaftsEndeB.toDate()}`);

		// überprüfe welches Bereitschaftsende Zutrifft
		bereitschaftsEndeMerker = dayjs.min(bereitschaftsEndeA, bereitschaftsEndeB, nachtAnfang, bereitschaftsEnde);
		console.log(`Bereitschafts Ende Merker: ${bereitschaftsEndeMerker.toDate()}`);

		// überprüfe ob Ruhe nach Nacht nötig ist
		if (
			bereitschaftsAnfang.isSame(nachtAnfang, "d") &&
			bereitschaftsAnfangNacht.isBefore(nachtAnfang.subtract(10, "h")) &&
			bereitschaftsEndeMerker.isAfter(bereitschaftsAnfangNacht.add(1, "h"))
		) {
			bereitschaftsAnfangNacht = bereitschaftsAnfangNacht.add(ruheZeit, "h");
			console.log(`Bereitschafts Anfang Nacht: ${bereitschaftsAnfangNacht.toDate()}`);
			bereitschaftsAnfang = dayjs.max(dayjs.min(bereitschaftsAnfangA, bereitschaftsEndeB), bereitschaftsAnfangNacht);
			console.log(`Bereitschafts Anfang: ${bereitschaftsAnfang.toDate()}`);
			arbeitstagHeute = Arbeitstag(bereitschaftsAnfang);
			console.log(`Arbeitstag Heute: ${arbeitstagHeute} --- ${bereitschaftsAnfang.format("dd")}`);
			arbeitstagMorgen = Arbeitstag(bereitschaftsAnfang, 1);
			console.log(`Arbeitstag Morgen: ${arbeitstagMorgen} --- ${bereitschaftsAnfang.add(1, "d").format("dd")}`);
		}
		console.groupEnd();
	}
	DatenSortieren(daten, "beginB");

	if (datenVorher == daten.length) {
		console.log("Keine änderung, Bereitschaft bereits vorhanden");
		return false;
	}

	return daten;
}