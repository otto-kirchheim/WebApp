/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_APP_TITLE: string;
	readonly PROD: boolean;
	// more env variables...
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
