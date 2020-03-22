import i18n from "./i18n/index.js";


export default async function register(app) {
    await app.registerPlugin({
        label: "Accelerated Text Import",
        name: "acc-text-import",
        version: "1.0.2",
        i18n
    });
}
