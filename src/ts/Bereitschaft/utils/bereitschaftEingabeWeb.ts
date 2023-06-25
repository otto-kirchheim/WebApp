import { createSnackBar } from "../../class/CustomSnackbar";
import type { CustomHTMLDivElement, CustomHTMLTableElement, IDaten } from "../../interfaces";
import { Storage, clearLoading, setLoading, tableToArray } from "../../utilities";
import { FetchRetry } from "../../utilities/FetchRetry";
import dayjs from "../../utilities/configDayjs";
import BereitschaftEingabe from "./BereitschaftEingabe";
import { DataBZ } from "./convertDaten";

export default async function bereitschaftEingabeWeb($modal: CustomHTMLDivElement, accessToken: string): Promise<void> {
	setLoading("btnESZ");

	const bAInput = $modal.querySelector<HTMLInputElement>("#bA");
	const bATInput = $modal.querySelector<HTMLInputElement>("#bAT");
	const bEInput = $modal.querySelector<HTMLInputElement>("#bE");
	const bETInput = $modal.querySelector<HTMLInputElement>("#bET");
	const nachtInput = $modal.querySelector<HTMLInputElement>("#nacht");
	const nAInput = $modal.querySelector<HTMLInputElement>("#nA");
	const nATInput = $modal.querySelector<HTMLInputElement>("#nAT");
	const nEInput = $modal.querySelector<HTMLInputElement>("#nE");
	const nETInput = $modal.querySelector<HTMLInputElement>("#nET");
	const MonatInput = document.querySelector<HTMLInputElement>("#Monat");
	const JahrInput = document.querySelector<HTMLInputElement>("#Jahr");
	const tableBZ = document.querySelector<CustomHTMLTableElement>("#tableBZ");

	if (
		!bAInput ||
		!bATInput ||
		!bEInput ||
		!bETInput ||
		!nachtInput ||
		!nAInput ||
		!nATInput ||
		!nEInput ||
		!nETInput ||
		!MonatInput ||
		!JahrInput ||
		!tableBZ
	)
		throw new Error("Input Element nicht gefunden");

	const bereitschaftsAnfang = dayjs(`${bAInput.value}T${bATInput.value}`);
	const bereitschaftsEnde = dayjs(`${bEInput.value}T${bETInput.value}`);
	const nacht = nachtInput.checked;
	let nachtAnfang: dayjs.Dayjs;
	let nachtEnde: dayjs.Dayjs;
	if (nacht === true) {
		nachtAnfang = dayjs(`${nAInput.value}T${nATInput.value}`);
		nachtEnde = dayjs(`${nEInput.value}T${nETInput.value}`);
	} else {
		nachtAnfang = bereitschaftsEnde;
		nachtEnde = bereitschaftsEnde;
	}

	const monat = +MonatInput.value;
	const jahr = +JahrInput.value;

	let data: IDaten["BZ"] | false = [];
	let data1: IDaten["BZ"] | false = tableToArray("tableBZ");
	let data2: IDaten["BZ"] | false = [];
	if (!data1) throw new Error("Fehler bei Datenermittlung");
	console.log({ bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, monat, jahr, accessToken });
	if (
		bereitschaftsAnfang.isSame(bereitschaftsEnde, "M") ||
		(!bereitschaftsAnfang.isSame(bereitschaftsEnde, "M") &&
			bereitschaftsEnde.isSameOrBefore(dayjs([jahr, bereitschaftsEnde.month(), 1, 0, 0])))
	) {
		data = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEnde, nachtAnfang, nachtEnde, nacht, data1);
	} else if (!navigator.onLine) {
		createSnackBar({
			message: "Bereitschaft<br/>Du bist Offline: <br/>Kein Monatswechsel möglich!",
			icon: "question",
			status: "error",
			dismissible: false,
			timeout: false,
			position: "br",
			actions: [
				{
					text: "ohne wechsel fortsetzten?",
					function: () => {
						if (!data1) throw new Error("Fehler bei Datenermittlung");
						data = BereitschaftEingabe(
							bereitschaftsAnfang,
							dayjs([bereitschaftsEnde.year(), bereitschaftsEnde.month()]),
							nachtAnfang,
							nachtEnde,
							nacht,
							data1
						);
						if (!data) {
							clearLoading("btnESZ");
							createSnackBar({
								message: "Bereitschaft<br/>Bereitschaftszeitraum Bereits vorhanden!",
								icon: "!",
								status: "warning",
								timeout: 3000,
								position: "br",
								fixed: true,
							});
							return;
						}

						Storage.set("dataBZ", data);
						tableBZ.instance.rows.load(DataBZ(data));

						clearLoading("btnESZ");
						createSnackBar({
							message:
								"Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert.",
							status: "success",
							timeout: 3000,
							position: "br",
							fixed: true,
						});
					},
					dismiss: true,
					class: ["text-primary"],
				},
				{
					text: "Abbrechen",
					function: () => {
						clearLoading("btnESZ");
					},
					dismiss: true,
				},
			],
			fixed: true,
		});
		return;
	} else {
		const monat2 = bereitschaftsEnde.month();
		const jahr2 = bereitschaftsEnde.year();

		const bereitschaftsEndeWechsel = dayjs([jahr2, monat2]);
		let nachtEnde1;
		let nachtAnfang2;
		let bereitschaftsEndeWechsel2;
		if (bereitschaftsEndeWechsel.isBefore(nachtAnfang)) {
			nachtEnde1 = nachtEnde.clone();
			nachtAnfang2 = nachtAnfang.clone();
			bereitschaftsEndeWechsel2 = bereitschaftsEndeWechsel.clone();
		} else if (bereitschaftsEndeWechsel.isAfter(nachtEnde)) {
			nachtEnde1 = nachtEnde.clone();
			bereitschaftsEndeWechsel2 = bereitschaftsEndeWechsel.clone();
			nachtAnfang2 = bereitschaftsEnde.clone();
			nachtEnde = bereitschaftsEnde.clone();
		} else if (bereitschaftsEndeWechsel.isAfter(nachtAnfang) && bereitschaftsEndeWechsel.isBefore(nachtEnde)) {
			nachtEnde1 = dayjs([jahr2, monat2, 1, nachtEnde.hour(), nachtEnde.minute()]);
			nachtAnfang2 = dayjs([jahr2, monat2, 1, nachtAnfang.hour(), nachtAnfang.minute()]);
			bereitschaftsEndeWechsel2 = nachtEnde1.clone();
		} else {
			throw new Error("Fehler bei Nacht und Bereitschaft");
		}

		data1 = BereitschaftEingabe(bereitschaftsAnfang, bereitschaftsEndeWechsel, nachtAnfang, nachtEnde1, nacht, data1);

		try {
			const fetched2 = await FetchRetry<null, { datenB: { datenBZ: IDaten["BZ"] } }>(`${monat2 + 1}&${jahr2}`);
			if (fetched2 instanceof Error) throw fetched2;
			if (fetched2.statusCode != 200) {
				console.log("Fehler");
				return;
			}
			const dataResponded2 = fetched2.data.datenB.datenBZ;
			console.log(dataResponded2);

			data2 = BereitschaftEingabe(
				bereitschaftsEndeWechsel2,
				bereitschaftsEnde,
				nachtAnfang2,
				nachtEnde,
				nacht,
				dataResponded2
			);

			const dataSave = {
				BZ: data2,
				Monat: monat2 + 1,
				Jahr: jahr2,
			};

			const fetchedSave = await FetchRetry("saveData", dataSave, "POST");
			if (fetchedSave instanceof Error) throw fetchedSave;
			if (fetchedSave.statusCode != 200) {
				console.log("Fehler:", fetchedSave.message);
				createSnackBar({
					message: "Bereitschaft<br/>Es ist ein Fehler beim Monatswechsel aufgetreten",
					status: "error",
					timeout: 3000,
					position: "br",
					fixed: true,
				});
				return;
			}
			console.log(fetchedSave.data);
			createSnackBar({
				message: `Bereitschaft<br/>Daten für Monat ${monat2 + 1} gespeichert`,
				status: "success",
				timeout: 3000,
				position: "br",
				fixed: true,
			});
		} catch (err) {
			console.log(err);
			return;
		}

		console.log("Daten Monat 1", data1);
		console.log("Daten Monat 2", data2);

		data = data1;
	}
	if (!data) {
		clearLoading("btnESZ");
		createSnackBar({
			message: "Bereitschaft<br/>Bereitschaftszeitraum Bereits vorhanden!",
			status: "warning",
			timeout: 3000,
			position: "br",
			fixed: true,
		});
		return;
	}

	Storage.set("dataBZ", data);
	tableBZ.instance.rows.load(DataBZ(data));

	clearLoading("btnESZ");
	createSnackBar({
		message:
			"Bereitschaft<br/>Neuer Zeitraum hinzugefügt</br>Speichern nicht vergessen!</br></br>Berechnung wird erst nach Speichern aktualisiert.",
		status: "success",
		timeout: 3000,
		position: "br",
		fixed: true,
	});
}