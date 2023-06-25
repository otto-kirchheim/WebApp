import { Modal } from "bootstrap";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyCheckbox,
	createModalBodyInputElement,
	createModalBodySelectElement,
} from "../../components";
import type { CustomHTMLTableElement, IVorgabenU } from "../../interfaces";
import { Storage, saveTableData } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { addEWTtag, naechsterTag } from "../utils";

export default function createAddModalEWT(): void {
	const { modal, form } = createModal(
		"Neue Anwesenheit eingeben",
		true,
		"sm",
		createBodyElement,
		createEditorModalFooter(),
		SubmitEventListener
	);
	naechsterTag("");
	new Modal(modal).show();

	function createBodyElement(): HTMLDivElement {
		const vorgabenU: IVorgabenU = Storage.get("VorgabenU");

		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row g-2";

		const Jahr = Storage.get<number>("Jahr");
		const Monat = Storage.get<number>("Monat") - 1;
		const datum = dayjs([Jahr, Monat, 1]);
		const maxDate = datum.endOf("month").format("YYYY-MM-DD");

		const naechsterTagWrapper = document.createElement("div");
		const btnNaechsterTag = document.createElement("button");
		btnNaechsterTag.className = "btn btn-secondary btn-lg text-start col-12";
		btnNaechsterTag.type = "button";
		btnNaechsterTag.id = "btnNaechsterTag";
		btnNaechsterTag.textContent = "+1 Tag";
		btnNaechsterTag.addEventListener("click", (e: MouseEvent) => {
			e.preventDefault();
			naechsterTag();
		});

		naechsterTagWrapper.appendChild(btnNaechsterTag);
		modalBody.appendChild(naechsterTagWrapper);

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Tag",
				name: "tagE",
				value: "",
				type: "date",
				required: true,
				min: datum.format("YYYY-MM-DD"),
				max: maxDate,
			})
		);

		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating",
				title: "Einsatzort",
				name: "EOrt",
				value: null,
				required: false,
				options: [
					{ value: "", text: "", selected: true },
					...vorgabenU.fZ.map(ort => {
						return {
							value: ort.key,
							text: ort.key,
						};
					}),
				],
			})
		);
		modalBody.appendChild(
			createModalBodySelectElement({
				divClass: "form-floating",
				title: "Schicht",
				name: "Schicht",
				value: "",
				options: [
					{ value: "T", text: "Tag", selected: true },
					{ value: "N", text: "Nacht" },
					{ value: "BN", text: "Nacht/Bereitschaft" },
					{ value: "S", text: "Sonder" },
				],
				required: true,
			})
		);

		modalBody.appendChild(
			createModalBodyCheckbox({
				checkClass: "form-check form-switch mt-3",
				id: "berechnen1",
				text: "Berechnen",
				status: true,
			})
		);

		return modalBody;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();

			addEWTtag();

			const table = document.querySelector<CustomHTMLTableElement>("#tableE");
			if (table) {
				saveTableData(table.instance);
			}
		};
	}
}