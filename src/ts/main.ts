import { pwaInfo } from "virtual:pwa-info";
import { registerSW } from "virtual:pwa-register";

import { Logout } from "./Einstellungen/utils";
import { createSnackBar } from "./class/CustomSnackbar";
import { Storage, initializeColorModeToggler, setOffline, storageAvailable } from "./utilities";

const intervalMS = 60 * 60 * 1000;

const updateSW = registerSW({
	onNeedRefresh() {
		const benutzer = Storage.get<string>("Benutzer", { check: true, default: "" });
		createSnackBar({
			message: `Hallo ${benutzer},<br/>die App hat ein Update erhalten.<br/>Bitte Lade die Seite neu um die<br/>neusten Funktionen zu erhalten.`,
			dismissible: false,
			timeout: false,
			fixed: true,
			actions: [
				{
					text: "Neu Laden",
					function: () => {
						updateSW(true);
						Logout();
					},
					dismiss: true,
				},
				{ text: "Abbrechen", dismiss: true, class: ["text-primary"] },
			],
		});
	},
	onOfflineReady() {
		createSnackBar({
			message: `Du bist Offline,<br/>möchtest du Offline weiterarbeiten?.`,
			dismissible: false,
			timeout: false,
			fixed: true,
			actions: [
				{
					text: "Ja",
					function: () => {
						updateSW(true);
						setOffline();
					},
				},
				{ text: "Nein", dismiss: true, class: ["text-primary"] },
			],
		});
	},
	onRegisteredSW(swUrl, r) {
		r &&
			setInterval(async () => {
				if (!(!r.installing && navigator)) return;

				if ("connection" in navigator && !navigator.onLine) return;

				const resp = await fetch(swUrl, {
					cache: "no-store",
					headers: {
						cache: "no-store",
						"cache-control": "no-cache",
					},
				});

				if (resp?.status === 200) await r.update();
			}, intervalMS);
	},
});
console.log(pwaInfo);

import Collapse from "bootstrap/js/dist/collapse";
import Dropdown from "bootstrap/js/dist/dropdown";
import Offcanvas from "bootstrap/js/dist/offcanvas";
import Popover from "bootstrap/js/dist/popover";
import Tab from "bootstrap/js/dist/tab";

console.log("Version:", import.meta.env.APP_VERSION);

window.addEventListener("load", () => {
	if (Storage.size() > 3) {
		const currentVersion: string = import.meta.env.APP_VERSION;
		const clientVersion: string = Storage.get("Version", { check: true, default: "0.0.0" });
		if (compareMajorMinor(clientVersion, currentVersion) < 0) {
			(async () => {
				return await updateSW(true);
			})();
			const benutzer = Storage.get<string>("Benutzer", { check: true, default: "" });
			Logout();
			createSnackBar({
				message: `Hallo ${benutzer},<br/>die App hat ein Update erhalten.<br/>Bitte melde dich neu an, um<br/>die neuen Funktionen zu nutzen.`,
				timeout: 10000,
				fixed: true,
			});
		} else if (clientVersion !== currentVersion) Storage.set("Version", currentVersion);
	}
	if (!storageAvailable("localStorage")) {
		createSnackBar({
			message: "Bitte Cookies zulassen!",
			dismissible: true,
			status: "error",
			timeout: false,
			position: "tc",
			fixed: false,
		});
	}
	initializeColorModeToggler();

	if (!navigator.onLine) setOffline();
	else window.addEventListener("offline", setOffline);

	if (Storage.check("accessToken")) {
		const hash: string = document.location.hash;

		if (hash.length === 0) return;
		const selector: string = `${hash.toLowerCase()}-tab`;
		const tabElement = document.querySelector<HTMLButtonElement>(selector);

		if (!(tabElement instanceof HTMLButtonElement)) return;
		Tab.getOrCreateInstance(tabElement).show();
		window.scrollTo(0, 1);
	}

	Array.from(document.querySelectorAll(".dropdown-toggle")).forEach(dropdownToggleEl => new Dropdown(dropdownToggleEl));
	Array.from(document.querySelectorAll(".offcanvas")).forEach(offcanvasEl => new Offcanvas(offcanvasEl));
	Array.from(document.querySelectorAll(".collapse")).forEach(collapseEl => new Collapse(collapseEl, { toggle: false }));
	Array.from(document.querySelectorAll('[data-bs-toggle="popover"]')).forEach(
		popoverTriggerEl => new Popover(popoverTriggerEl),
	);
});

import "./Berechnung";
import "./Bereitschaft";
import "./EWT";
import "./Einstellungen";
import "./Login";
import "./Neben";

import "../scss/styles.scss";

function compareMajorMinor(version1: string, version2: string): number {
	const [major1, minor1] = version1.split(".").map(Number);
	const [major2, minor2] = version2.split(".").map(Number);

	return major1 - major2 || minor1 - minor2;
}
